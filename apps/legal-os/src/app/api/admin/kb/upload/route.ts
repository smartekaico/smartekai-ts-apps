import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { auth } from "@/lib/auth";
import { chunkMarkdown } from "@/lib/kb/chunk";
import { embedBatch } from "@/lib/kb/embed";
import { extractTextFromFile } from "@/lib/kb/extract-text";
import { parseMarkdownFile, type ParsedDocument } from "@/lib/kb/parse";
import {
	checkDuplicate,
	hashContent,
	logUpload,
	replaceChunks,
	upsertDocument,
} from "@/lib/kb/store";
import { nanoid } from "nanoid";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session || session.user.industryRole !== "ADMIN") {
		return new NextResponse("Unauthorized", { status: 401 });
	}

	try {
		const formData = await req.formData();
		const file = formData.get("file") as File | null;
		const jurisdiction = (formData.get("jurisdiction") as string) || "kuwait";
		const categoryId = (formData.get("categoryId") as string) || null;
		const docType = (formData.get("docType") as string) || "law";
		const industry = (formData.get("industry") as string) || "LEGAL";
		const titleForm = formData.get("title") as string | null;
		const contentForm = formData.get("content") as string | null;

		let rawContent = "";
		let filename = "";
		let isMarkdown = false;

		if (file) {
			filename = file.name;
			const isPdf = filename.toLowerCase().endsWith(".pdf");
			const isDocx = filename.toLowerCase().endsWith(".docx");
			isMarkdown = filename.toLowerCase().endsWith(".md");

			if (isMarkdown) {
				rawContent = await file.text();
			} else if (isPdf || isDocx) {
				const buffer = Buffer.from(await file.arrayBuffer());
				rawContent = await extractTextFromFile(buffer, filename);
			} else {
				// Fallback for other text files
				rawContent = await file.text();
			}
		} else if (titleForm && contentForm) {
			// Manual Entry
			rawContent = contentForm;
			filename = `${titleForm.trim().replace(/\s+/g, "_")}.md`;
			isMarkdown = false; // We treat manual entry as raw text that we'll wrap
		} else {
			return NextResponse.json(
				{ error: "No file or manual content provided" },
				{ status: 400 },
			);
		}

		const startTime = Date.now();
		const fileHash = hashContent(rawContent);

		// Check for duplicate
		const duplicate = await checkDuplicate(fileHash);
		if (duplicate.isDuplicate) {
			return NextResponse.json({
				status: "duplicate",
				message: "Document with same content already exists",
				existingId: duplicate.existingId,
			});
		}

		let parsed: ParsedDocument;
		if (isMarkdown && rawContent.includes("---")) {
			// It's a markdown file with potential frontmatter
			parsed = parseMarkdownFile(rawContent, filename, docType);
		} else {
			// Non-markdown or manual entry: Build ParsedDocument manually
			parsed = {
				frontmatter: {
					title:
						titleForm ||
						filename.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "),
					doc_type: docType,
					jurisdiction: jurisdiction,
					category: categoryId || undefined,
					industry: industry,
				},
				content: rawContent,
				rawMarkdown: rawContent,
			};
		}

		// Final Overrides from Form
		if (jurisdiction) parsed.frontmatter.jurisdiction = jurisdiction;
		if (categoryId) parsed.frontmatter.category = categoryId;
		if (docType) parsed.frontmatter.doc_type = docType;
		if (industry) {
			parsed.frontmatter.industry = industry;
		}
		if (titleForm) parsed.frontmatter.title = titleForm;
		parsed.frontmatter.language = "ar";
		if (formData.get("tags")) {
			parsed.frontmatter.tags = JSON.parse(
				formData.get("tags") as string,
			) as string[];
		}

		// 2. Chunk
		const chunks = chunkMarkdown(parsed.content, parsed.frontmatter.title, {
			minTokens: 50,
			maxTokens: 800,
			splitDepth: 2,
		});

		if (chunks.length === 0) {
			return NextResponse.json(
				{ error: "No content found after parsing" },
				{ status: 400 },
			);
		}

		// 3. Embed
		const texts = chunks.map((c) => c.contentText);
		const embeddings = await embedBatch(texts);

		// 4. Store (System-wide, organizationId=null)
		const docId = await upsertDocument(
			parsed,
			filename,
			fileHash,
			null,
			session.user.name,
		);
		const chunksStored = await replaceChunks(
			docId,
			chunks,
			embeddings,
			industry,
		);

		// 5. Audit Log (Central Platform Audit)
		await db.insert(auditLogs).values({
			id: nanoid(),
			userId: session.user.id,
			organizationId: session.session.activeOrganizationId,
			action: "ADMIN_KB",
			details: `${parsed.frontmatter.title} (${parsed.frontmatter.jurisdiction})`,
			createdAt: new Date(),
		});

		// 6. Log (Detailed KB Upload Log)
		const duration = Date.now() - startTime;
		await logUpload(
			docId,
			"create",
			"success",
			chunksStored,
			duration,
			session.user.name,
		);

		return NextResponse.json({
			status: "success",
			documentId: docId,
			chunksCreated: chunksStored,
			durationMs: duration,
		});
	} catch (error: unknown) {
		console.error("Upload error:", error);
		const message = error instanceof Error ? error.message : "Upload failed";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
