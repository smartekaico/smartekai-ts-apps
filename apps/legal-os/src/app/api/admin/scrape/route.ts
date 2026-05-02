export const dynamic = "force-dynamic";
import { type NextRequest, NextResponse } from "next/server";
import { CheerioCrawler, RequestQueue } from "@crawlee/cheerio";
import TurndownService from "turndown";
import { embedBatch } from "@/lib/kb/embed";
import { db } from "@/db";
import { knowledgeBase as kbDocuments, kbChunks } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { nanoid } from "nanoid";

// Turndown service to convert messy HTML to clean Markdown
const turndownService = new TurndownService();

export async function POST(req: NextRequest) {
	try {
		// 1. Auth check
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		if (!session || session.user.industryRole !== "ADMIN") {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const {
			url,
			categoryId,
			jurisdiction,
			title,
			titleEn,
			industry = "LEGAL",
			docType = "law",
		} = await req.json();

		if (!url || !title || !jurisdiction) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 },
			);
		}

		let scrapedHtml = "";

		// 2. Scrape the Website using Crawlee with an isolated temporary queue
		// This prevents "maxRequestsPerCrawl limit" errors and cached queue states
		const queueId = `scrape-${nanoid()}`;
		const requestQueue = await RequestQueue.open(queueId);

		const crawler = new CheerioCrawler({
			requestQueue,
			async requestHandler({ $ }) {
				// Extract the main content (we target body or a common main container)
				// Clean up unwanted elements before getting HTML
				$("script, style, nav, footer, iframe, noscript").remove();
				scrapedHtml = $("body").html() || "";
			},
		});

		await crawler.run([url]);

		// Drop the temporary queue to prevent disk bloat
		await requestQueue.drop();

		if (!scrapedHtml) {
			return NextResponse.json(
				{ error: "Could not extract content from URL" },
				{ status: 400 },
			);
		}

		// 3. Convert HTML to Clean Markdown
		const markdownText = turndownService.turndown(scrapedHtml);

		// 4. "Legal Chunking" Strategy (from SOP)
		// Split the text every time there is a new Article (مادة or المادة)
		const rawChunks = markdownText.split(/(?=مادة|المادة)/g);

		const validChunks = rawChunks
			.map((chunk) => chunk.trim())
			.filter((chunk) => chunk.length > 30); // Remove empty or tiny chunks

		if (validChunks.length === 0) {
			return NextResponse.json(
				{ error: "لم يتم العثور على نصوص قانونية مقسمة في هذا الرابط." },
				{ status: 400 },
			);
		}

		// 5. Generate Vector Embeddings using the centralized batch processor
		// Uses GEMINI_API_KEY and automatically truncates output to 768 dimensions
		const embeddings = await embedBatch(validChunks);

		// 6. Save to Neon Database
		// Create the parent document
		const slug = `${jurisdiction}-${nanoid(10)}`; // Simplified slug
		const [doc] = await db
			.insert(kbDocuments)
			.values({
				title,
				titleEn,
				slug,
				jurisdiction,
				categoryId,
				docType,
				rawMarkdown: markdownText,
				fileHash: nanoid(32), // Random hash for now
				sourceUrl: url,
				industry,
				status: "active",
				uploadedBy: "admin-scraper",
			})
			.returning({ id: kbDocuments.id });

		// Insert the chunks
		const chunksToInsert = validChunks.map((chunkText, index) => ({
			documentId: doc.id,
			chunkIndex: index,
			chunkId: nanoid(),
			contentMd: chunkText,
			contentText: chunkText, // Simplified for now
			tokensEst: Math.ceil(chunkText.length / 4),
			embedding: embeddings[index], // Pre-truncated by embedBatch
			industry,
		}));

		await db.insert(kbChunks).values(chunksToInsert);

		return NextResponse.json({
			success: true,
			message: `تم سحب ${validChunks.length} مادة قانونية وحفظها في قاعدة المعرفة بنجاح.`,
			documentId: doc.id,
		});
	} catch (error) {
		console.error("Scraping Error:", error);
		return NextResponse.json(
			{ error: `فشل سحب البيانات: ${error instanceof Error ? error.message : "Unknown error"}` },
			{ status: 500 },
		);
	}
}
