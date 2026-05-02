import { type NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSession, handleRawAuthError } from "@/lib/auth-utils";
import {
	hashContent,
	upsertDocument,
	replaceChunks,
	logUpload,
} from "@/lib/kb/store";
import { chunkMarkdown } from "@/lib/kb/chunk";
import { embedBatch } from "@/lib/kb/embed";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { kbUploadLog, organizations } from "@/db/schema";
import { and, eq, gt, count } from "drizzle-orm";
import { generateText } from "ai";
import { getActiveModel, getOpenRouterModel } from "@/lib/ai/model-utils";

export const maxDuration = 60; // 1 min for single doc ingestion

export async function POST(req: NextRequest) {
	try {
		const session = await getAuthenticatedSession({
			requiredRole: ["LEGAL", "ADMIN"],
		});
		const userId = session.user.id;
		const orgId =
			(session.session as { activeOrganizationId?: string })
				.activeOrganizationId ||
			(session.user as { activeOrganizationId?: string }).activeOrganizationId;

		if (!orgId) {
			return NextResponse.json(
				{ error: "Organization required" },
				{ status: 403 },
			);
		}

		const {
			title,
			content,
			jurisdiction,
			categoryId,
			docType = "private_memo",
		} = await req.json();

		if (!title || !content || !jurisdiction) {
			return NextResponse.json(
				{ error: "Title, content and jurisdiction are required" },
				{ status: 400 },
			);
		}

		// 1. Rate Limiting Check (10 docs / 24h)
		const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
		const recentUploads = await db
			.select({ count: count() })
			.from(kbUploadLog)
			.where(
				and(
					eq(kbUploadLog.uploadedBy, userId),
					gt(kbUploadLog.createdAt, twentyFourHoursAgo),
				),
			);

		if (recentUploads[0].count >= 10) {
			return NextResponse.json(
				{
					error:
						"تجاوزت الحد المسموح به للمستندات اليومية (10 مستندات فقط كل 24 ساعة).",
				},
				{ status: 429 },
			);
		}

		// 2. Jurisdiction Integrity
		const orgData = await db
			.select({ defaultJurisdiction: organizations.defaultJurisdiction })
			.from(organizations)
			.where(eq(organizations.id, orgId))
			.limit(1);

		const enforcedJurisdiction =
			orgData[0]?.defaultJurisdiction || jurisdiction;

		// 3. Legal Content Guardrail (LLM Classification)
		const activeModelId = await getActiveModel();
		const { text: classification } = await generateText({
			model: getOpenRouterModel(activeModelId),
			prompt: `Analyze the following legal document snippet and determine if it belongs in a PROFESSIONAL LEGAL KNOWLEDGE BASE.
      
      Content: "${title}\n\n${content.slice(0, 1000)}"
      
      Instructions:
      - If the document is a law, regulation, legal memo, contract, or legal research: Respond exactly "LEGAL".
      - If the document is personal, unrelated, or spam: Respond exactly "IRRELEVANT".
      - Response must be ONE WORD ONLY.`,
		});

		if (classification.trim().toUpperCase() !== "LEGAL") {
			return NextResponse.json(
				{
					error:
						"هذا المستند غير مرتبط بالمجال القانوني. يرجى رفع مستندات قانونية فقط.",
				},
				{ status: 400 },
			);
		}

		const startTime = Date.now();
		const fileHash = hashContent(content);
		const filename = `${nanoid(8)}.md`;

		// Process document
		const parsed = {
			frontmatter: {
				title,
				doc_type: docType,
				jurisdiction,
				category_id: categoryId,
				language: "ar",
				industry: "LEGAL",
			},
			content: content,
			rawMarkdown: content,
		};

		// 1. Chunking
		const chunks = chunkMarkdown(content, title, {
			minTokens: 50,
			maxTokens: 800,
			splitDepth: 2,
		});

		if (chunks.length === 0) {
			return NextResponse.json(
				{ error: "Failed to produce document chunks" },
				{ status: 400 },
			);
		}

		// 2. Embedding
		const texts = chunks.map((c) => c.contentText);
		const embeddings = await embedBatch(texts);

		// 3. Store with organizationId and metadata
		const documentId = await upsertDocument(
			{
				...parsed,
				jurisdiction: enforcedJurisdiction,
				categoryId,
				docType,
			} as Parameters<typeof upsertDocument>[0],
			filename,
			fileHash,
			orgId,
			userId,
		);
		const chunksStored = await replaceChunks(documentId, chunks, embeddings);

		const duration = Date.now() - startTime;
		await logUpload(
			documentId,
			"create",
			"success",
			chunksStored,
			duration,
			userId,
		);

		return NextResponse.json({
			success: true,
			documentId,
			chunks: chunksStored,
			message: "تمت إضافة المستند بنجاح إلى المكتبة الخاصة بك.",
		});
	} catch (error) {
		console.error("Ingestion error:", error);
		return handleRawAuthError(error);
	}
}
