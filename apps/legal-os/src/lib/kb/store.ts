// lib/kb/store.ts
// Database operations for documents and chunks

import { db } from "@/lib/db";
import { createHash } from "node:crypto";
import type { ParsedDocument } from "./parse";
import { generateSlug } from "./parse";
import { nanoid } from "nanoid";
import type { Chunk } from "./chunk";
import { createAuditLog } from "../audit";

// ── Category Utils ──────────────────────────────────────────

export async function findOrCreateCategory(
	name: string | null,
	jurisdictionId: string,
	legalDomain = "General",
	industry = "LEGAL",
): Promise<string> {
	const categoryName = name?.trim() || "General";

	// 1. Try to find by ID if it's already an existing ID
	const idRes = await db.query("SELECT id FROM kb_categories WHERE id = $1", [
		categoryName,
	]);
	if (idRes.rows.length > 0) return idRes.rows[0].id;

	// 2. Try to find by name (Ar or En) within the jurisdiction
	const findRes = await db.query(
		`SELECT id FROM kb_categories 
     WHERE jurisdiction_id = $1 
     AND industry = $4
     AND (LOWER(name_ar) = LOWER($2) OR LOWER(name_en) = LOWER($2) OR LOWER(slug) = LOWER($3))`,
		[jurisdictionId, categoryName, categoryName.replace(/\s+/g, "-"), industry],
	);

	if (findRes.rows.length > 0) {
		return findRes.rows[0].id;
	}

	// 3. Create on the fly
	const id = nanoid();
	// Create a more robust slug to avoid collisions
	const baseSlug = categoryName
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9-]/g, "");
	const slug = `${jurisdictionId}-${baseSlug}`.slice(0, 100);

	try {
		const insertRes = await db.query(
			`INSERT INTO kb_categories (
        id, slug, name_ar, name_en, description_ar, 
        jurisdiction_id, workspace_slug, legal_domain, industry, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (slug) DO NOTHING
      RETURNING id`,
			[
				id,
				slug,
				categoryName,
				categoryName,
				`تصنيف تم إنشاؤه آلياً: ${categoryName}`,
				jurisdictionId,
				"legal",
				legalDomain,
				industry,
				true,
			],
		);

		if (insertRes.rows.length > 0) {
			// Log the automated creation
			await createAuditLog({
				userId: "system-kb-sync",
				action: "ADMIN_CATEGORY_CREATE",
				details: {
					categoryId: id,
					categoryName,
					jurisdictionId,
					trigger: "kb_upload",
				},
			});
			return insertRes.rows[0].id;
		}

		// If conflict occurred, find the one that exists
		const conflictRes = await db.query(
			"SELECT id FROM kb_categories WHERE slug = $1",
			[slug],
		);
		return conflictRes.rows[0].id;
	} catch (error) {
		console.error("[CATEGORY_SYNC_ERROR]", error);
		// Fallback to searching again just in case
		const fallbackRes = await db.query(
			"SELECT id FROM kb_categories WHERE jurisdiction_id = $1 AND (LOWER(name_ar) = LOWER($2) OR slug = $3)",
			[jurisdictionId, categoryName, slug],
		);
		if (fallbackRes.rows.length > 0) return fallbackRes.rows[0].id;
		throw error;
	}
}

// ── Hashing ─────────────────────────────────────────────────

export function hashContent(content: string): string {
	return createHash("sha256").update(content).digest("hex");
}

// ── Deduplication ───────────────────────────────────────────

export async function checkDuplicate(hash: string): Promise<{
	isDuplicate: boolean;
	existingId?: number;
}> {
	const result = await db.query(
		`SELECT id FROM kb_documents WHERE file_hash = $1 AND status = 'active'`,
		[hash],
	);
	if (result.rows.length > 0) {
		return { isDuplicate: true, existingId: result.rows[0].id };
	}
	return { isDuplicate: false };
}

// ── Store Document ──────────────────────────────────────────

export async function upsertDocument(
	parsed: ParsedDocument,
	filename: string,
	fileHash: string,
	organizationId: string | null = null,
	uploadedBy = "system",
): Promise<number> {
	const fm = parsed.frontmatter;
	const slug = organizationId
		? `${organizationId}-${generateSlug(filename)}`
		: generateSlug(filename);

	// Find or Create Category
	const categoryId = await findOrCreateCategory(
		(fm.category as string) || (fm.subcategory as string) || null,
		(fm.jurisdiction as string) || "kuwait",
		(fm.legal_domain as string) || "General",
		(fm.industry as string) || "LEGAL",
	);

	const result = await db.query(
		`INSERT INTO kb_documents (
      jurisdiction, category_id, doc_type, title, title_en,
      slug, source_ref, source_url, language, version,
      raw_markdown, frontmatter, file_hash, status,
      uploaded_by, industry, tags, organization_id
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12::jsonb, $13, 'active',
      $14, $15, $16::jsonb, $17
    )
    ON CONFLICT (slug) DO UPDATE SET
      jurisdiction = EXCLUDED.jurisdiction,
      category_id  = EXCLUDED.category_id,
      doc_type     = EXCLUDED.doc_type,
      title        = EXCLUDED.title,
      title_en     = EXCLUDED.title_en,
      source_ref   = EXCLUDED.source_ref,
      source_url   = EXCLUDED.source_url,
      raw_markdown = EXCLUDED.raw_markdown,
      frontmatter  = EXCLUDED.frontmatter,
      file_hash    = EXCLUDED.file_hash,
      version      = EXCLUDED.version,
      industry     = EXCLUDED.industry,
      tags         = EXCLUDED.tags,
      updated_at   = now()
    RETURNING id`,
		[
			fm.jurisdiction,
			categoryId,
			fm.doc_type,
			fm.title,
			fm.title_en || null,
			slug,
			fm.source_ref || null,
			fm.source_url || fm.official_source || null,
			fm.language || "ar",
			fm.version || "1.0",
			parsed.rawMarkdown,
			JSON.stringify(fm),
			fileHash,
			uploadedBy,
			fm.industry || "LEGAL",
			JSON.stringify(fm.tags || []),
			organizationId,
		],
	);

	return result.rows[0].id;
}

// ── Store Chunks ────────────────────────────────────────────

export async function replaceChunks(
	documentId: number,
	chunks: Chunk[],
	embeddings: number[][],
	industry = "LEGAL",
): Promise<number> {
	// Delete old chunks
	await db.query("DELETE FROM kb_chunks WHERE document_id = $1", [documentId]);

	// Insert new
	for (let i = 0; i < chunks.length; i++) {
		const c = chunks[i];
		const emb = embeddings[i];

		await db.query(
			`INSERT INTO kb_chunks (
        document_id, chunk_index, chunk_id, heading_path,
        heading_level, content_md, content_text, tokens_est,
        embedding, industry, citation_label, metadata
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9::vector, $10, $11, $12::jsonb
      )`,
			[
				documentId,
				c.chunkIndex,
				c.chunkId,
				c.headingPath,
				c.headingLevel,
				c.contentMd,
				c.contentText,
				c.tokensEst,
				JSON.stringify(emb),
				industry,
				c.citationLabel,
				JSON.stringify(c.metadata),
			],
		);
	}

	return chunks.length;
}

// ── Log Upload ──────────────────────────────────────────────

export async function logUpload(
	documentId: number,
	action: "create" | "update" | "reindex" | "delete",
	status: "success" | "error",
	chunksCount: number,
	durationMs: number,
	uploadedBy: string,
	errorMessage?: string,
): Promise<void> {
	await db.query(
		`INSERT INTO kb_upload_log
      (document_id, action, status, chunks_count, duration_ms, uploaded_by, error_message)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		[
			documentId,
			action,
			status,
			chunksCount,
			durationMs,
			uploadedBy,
			errorMessage || null,
		],
	);
}
