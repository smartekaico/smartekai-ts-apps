import { db } from "@/db";
import { auditLogs, knowledgeBase } from "@/db/schema";
import { auth } from "@/lib/auth";
import { consumeCredits } from "@/lib/credits/credit-manager";
import { type Chunk, chunkMarkdown } from "@/lib/kb/chunk";
import { embedBatch, embedMultimodal } from "@/lib/kb/embed";
import { extractTextFromFile } from "@/lib/kb/extract-text";
import type { ParsedDocument } from "@/lib/kb/parse";
import {
	checkDuplicate,
	hashContent,
	logUpload,
	replaceChunks,
	upsertDocument,
} from "@/lib/kb/store";
import { and, count, eq, gte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOTAL_DOC_LIMIT = 100;
const DAILY_UPLOAD_LIMIT = 10;
const FREE_DOC_LIMIT = 5;
const CREDIT_COST_PER_DOC = 5;

export async function POST(req: Request) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	const activeOrgId =
		session?.session?.activeOrganizationId ||
		session?.user?.activeOrganizationId;

	if (!session || !activeOrgId) {
		return new NextResponse("Unauthorized", { status: 401 });
	}

	try {
		const formData = await req.formData();
		const file = formData.get("file") as File | null;
		const jurisdiction = (formData.get("jurisdiction") as string) || "kuwait";
		const docType = (formData.get("docType") as string) || "internal_precedent";
		const customDocType = formData.get("customDocType") as string | null;
		const categoryId = formData.get("categoryId") as string | null;
		const customCategory = formData.get("customCategory") as string | null;
		const titleForm = formData.get("title") as string | null;

		if (!file && !titleForm) {
			return NextResponse.json({ error: "No file provided" }, { status: 400 });
		}

		// --- 1. BACKEND LIMIT ENFORCEMENT ---

		// A. Check Total Storage Limit (100 docs)
		const [totalCountResult] = await db
			.select({ value: count() })
			.from(knowledgeBase)
			.where(eq(knowledgeBase.organizationId, activeOrgId));

		if (totalCountResult.value >= TOTAL_DOC_LIMIT) {
			return NextResponse.json(
				{
					error: `لقد وصلت إلى الحد الأقصى للتخزين (${TOTAL_DOC_LIMIT} مستندات). يرجى حذف بعض الملفات القديمة.`,
				},
				{ status: 403 },
			);
		}

		// B. Check Daily Limit (10 docs / 24h)
		const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
		const [dailyCountResult] = await db
			.select({ value: count() })
			.from(knowledgeBase)
			.where(
				and(
					eq(knowledgeBase.organizationId, activeOrgId),
					gte(knowledgeBase.createdAt, twentyFourHoursAgo),
				),
			);

		if (dailyCountResult.value >= DAILY_UPLOAD_LIMIT) {
			return NextResponse.json(
				{
					error: `لقد وصلت إلى حد الرفع اليومي (${DAILY_UPLOAD_LIMIT} مستندات). يرجى المحاولة غداً.`,
				},
				{ status: 403 },
			);
		}

		// --- 2. CREDIT LOGIC ---
		let creditCost = 0;
		if (totalCountResult.value >= FREE_DOC_LIMIT) {
			creditCost = CREDIT_COST_PER_DOC;
			// Deduct credits before processing to be safe
			const deduction = await consumeCredits(activeOrgId, creditCost);
			if (!deduction.success) {
				return NextResponse.json({ error: deduction.error }, { status: 402 });
			}
		}

		// --- 3. FILE PROCESSING ---
		let rawContent = "";
		const filename = file ? file.name : "manual_entry.md";

		if (file) {
			const ext = filename.toLowerCase().split(".").pop();
			const isPdf = ext === "pdf";
			const isDocx = ext === "docx" || ext === "doc";
			const isMarkdown = ext === "md" || ext === "txt";
			const isImage = ["png", "jpg", "jpeg", "webp"].includes(ext || "");

			if (isMarkdown) {
				rawContent = await file.text();
			} else if (isPdf || isDocx || isImage) {
				const buffer = Buffer.from(await file.arrayBuffer());
				rawContent = await extractTextFromFile(buffer, filename);
			} else {
				// Fallback for presentations, spreadsheets, or images (LiteParse handled in extractor)
				const buffer = Buffer.from(await file.arrayBuffer());
				rawContent = await extractTextFromFile(buffer, filename);
			}
		}

		if (!rawContent.trim()) {
			return NextResponse.json(
				{ error: "File content is empty" },
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
				message: "هذا المستند موجود بالفعل في مكتبتكم.",
				existingId: duplicate.existingId,
			});
		}

		const parsed = {
			frontmatter: {
				title:
					titleForm || filename.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "),
				doc_type: customDocType || docType,
				category: customCategory || categoryId,
				jurisdiction: jurisdiction,
				industry: "LEGAL",
				language: "ar",
				tags: formData.get("tags")
					? JSON.parse(formData.get("tags") as string)
					: [],
			},
			content: rawContent,
			rawMarkdown: rawContent,
		};

		// 4. Chunk or Handle Image
		const ext = filename.toLowerCase().split(".").pop();
		const isImage = ["png", "jpg", "jpeg", "webp"].includes(ext || "");
		let embeddings: number[][] = [];
		let chunks: Chunk[] = [];

		if (isImage && file) {
			// Handle as a single multimodal chunk
			const buffer = Buffer.from(await file.arrayBuffer());
			const mimeType = file.type || `image/${ext === "jpg" ? "jpeg" : ext}`;
			
			// We embed the image + the OCR'd text (rawContent) for maximum semantic context
			const embedding = await embedMultimodal(rawContent, buffer, mimeType);
			embeddings = [embedding];
			chunks = [{
				chunkIndex: 0,
				chunkId: nanoid(),
				headingPath: parsed.frontmatter.title,
				headingLevel: 0,
				contentMd: rawContent,
				contentText: rawContent, // Store the OCR text for keyword search
				tokensEst: 0, // Not calculated for images
				citationLabel: null,
				metadata: {},
			}];
		} else {
			// Handle as standard text document
			chunks = chunkMarkdown(parsed.content, parsed.frontmatter.title, {
				minTokens: 50,
				maxTokens: 800,
				splitDepth: 2,
			});

			if (chunks.length === 0) {
				return NextResponse.json(
					{ error: "Could not parse document structure" },
					{ status: 400 },
				);
			}

			// 5. Embed Batch
			const texts = chunks.map((c) => c.contentText);
			embeddings = await embedBatch(texts);
		}

		// 6. Store with organizationId
		const docId = await upsertDocument(
			parsed as ParsedDocument,
			filename,
			fileHash,
			activeOrgId,
			session.user.name,
		);
		const chunksStored = await replaceChunks(
			docId,
			chunks,
			embeddings,
			"LEGAL",
		);

		// 7. Success Logging
		const duration = Date.now() - startTime;
		await logUpload(
			docId,
			"create",
			"success",
			chunksStored,
			duration,
			session.user.name,
		);

		await db.insert(auditLogs).values({
			id: nanoid(),
			userId: session.user.id,
			organizationId: activeOrgId,
			action: "ORG_KB_UPLOAD",
			details: `Uploaded firm document: ${parsed.frontmatter.title} (${creditCost} credits used)`,
		});

		return NextResponse.json({
			status: "success",
			documentId: docId,
			cost: creditCost,
			message:
				creditCost > 0
					? `تم رفع المستند بنجاح (خصم ${creditCost} رصيد)`
					: "تم الرفع بنجاح (مستند مجاني)",
		});
	} catch (error: unknown) {
		console.error("Org KB Upload error:", error);
		const message = error instanceof Error ? error.message : "Upload failed";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
