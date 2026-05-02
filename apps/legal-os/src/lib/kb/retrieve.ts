// lib/kb/retrieve.ts
// Retrieval: query → embed → search pgvector → build context

import { db } from "@/lib/db";
import { embedSingle } from "./embed";

export interface RetrievedChunk {
	chunkId: number;
	documentId: number;
	docTitle: string;
	docType: string;
	jurisdiction: string;
	categoryId: string;
	headingPath: string;
	contentMd: string;
	contentText: string;
	citationLabel: string | null;
	similarity: number;
}

export interface RetrievalOptions {
	jurisdiction?: string;
	docType?: string;
	category?: string;
	industry?: string;
	organizationId?: string;
	topK?: number;
	similarityThreshold?: number;
	useHybrid?: boolean;
}

const DEFAULT_OPTIONS: RetrievalOptions = {
	jurisdiction: "global",
	industry: "LEGAL",
	topK: 10,
	similarityThreshold: 0.5,
	useHybrid: true,
};

// ── Main Retrieval Function ─────────────────────────────────

export async function retrieveChunks(
	query: string,
	options?: RetrievalOptions,
): Promise<RetrievedChunk[]> {
	const opts = { ...DEFAULT_OPTIONS, ...options };

	// 1) Embed the query
	const queryEmbedding = await embedSingle(query);

	// 2) Search
	let chunks: RetrievedChunk[];

	if (opts.useHybrid) {
		chunks = await hybridSearch(queryEmbedding, query, opts);
	} else {
		chunks = await vectorSearch(queryEmbedding, opts);
	}

	// 3) Deduplicate (same document, nearby headings)
	chunks = deduplicateChunks(chunks);

	return chunks;
}

// ── Vector-only Search ──────────────────────────────────────

export async function vectorSearch(
	embedding: number[],
	opts: RetrievalOptions,
): Promise<RetrievedChunk[]> {
	const result = await db.query(
		"SELECT * FROM search_chunks($1, $2, $3, $4, $5, $6, $7)",
		[
			JSON.stringify(embedding),
			opts.topK,
			opts.jurisdiction || null,
			opts.docType || null,
			opts.category || null,
			opts.organizationId || null,
			opts.similarityThreshold || 0.4,
		],
	);

	return result.rows.map(mapRow);
}

// ── Hybrid Search (vector + full-text) ──────────────────────

export async function hybridSearch(
	embedding: number[],
	queryText: string,
	opts: RetrievalOptions,
): Promise<RetrievedChunk[]> {
	const result = await db.query(
		"SELECT * FROM hybrid_search($1, $2, $3, $4, $5, $6, $7, $8, $9)",
		[
			JSON.stringify(embedding),
			queryText,
			opts.topK,
			opts.jurisdiction || null,
			opts.docType || null,
			opts.category || null,
			opts.organizationId || null,
			0.7, // vector_weight
			0.3, // text_weight
		],
	);

	return result.rows.map(
		(row: {
			chunk_id: number;
			document_id: number;
			doc_title: string;
			doc_type: string;
			jurisdiction: string;
			category_id: string;
			heading_path: string;
			content_md: string;
			citation_label: string | null;
			combined_score: number;
		}) => ({
			chunkId: row.chunk_id,
			documentId: row.document_id,
			docTitle: row.doc_title,
			docType: row.doc_type || "قانون",
			jurisdiction: row.jurisdiction || "global",
			categoryId: row.category_id || "",
			headingPath: row.heading_path,
			contentMd: row.content_md,
			contentText: "",
			citationLabel: row.citation_label,
			similarity: row.combined_score,
		}),
	);
}

// ── Context Builder ─────────────────────────────────────────

export function buildContextBlock(chunks: RetrievedChunk[]): string {
	if (chunks.length === 0)
		return "[CONTEXT_START]\nلا توجد نتائج مناسبة.\n[CONTEXT_END]";

	const sources = chunks.map((c, i) => {
		return [
			`Source ${i + 1}`,
			`title: ${c.docTitle}`,
			`doc_type: ${c.docType}`,
			`heading_path: ${c.headingPath}`,
			c.citationLabel ? `citation_label: ${c.citationLabel}` : null,
			`relevance_score: ${c.similarity.toFixed(3)}`,
			"content:",
			c.contentMd,
		]
			.filter(Boolean)
			.join("\n");
	});

	return `[CONTEXT_START]\n\n${sources.join("\n\n---\n\n")}\n\n[CONTEXT_END]`;
}

// ── Helpers ─────────────────────────────────────────────────

function mapRow(row: Record<string, unknown>): RetrievedChunk {
	return {
		chunkId: row.chunk_id as number,
		documentId: row.document_id as number,
		docTitle: (row.doc_title as string) ?? "",
		docType: (row.doc_type as string) ?? "قانون",
		jurisdiction: (row.jurisdiction as string) ?? "global",
		categoryId: (row.category_id as string) ?? "",
		headingPath: (row.heading_path as string) ?? "",
		contentMd: (row.content_md as string) ?? "",
		contentText: (row.content_text as string) ?? "",
		citationLabel: (row.citation_label as string | null) ?? null,
		similarity: row.similarity as number,
	};
}

function deduplicateChunks(chunks: RetrievedChunk[]): RetrievedChunk[] {
	const seen = new Set<string>();
	return chunks.filter((c) => {
		const key = `${c.documentId}-${c.headingPath}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}
