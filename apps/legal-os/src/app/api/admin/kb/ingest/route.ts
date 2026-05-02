import { type NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { type ParsedDocument, parseMarkdownFile } from "@/lib/kb/parse";
import { chunkMarkdown } from "@/lib/kb/chunk";
import { embedBatch } from "@/lib/kb/embed";
import { extractTextFromFile } from "@/lib/kb/extract-text";
import {
	hashContent,
	upsertDocument,
	replaceChunks,
	logUpload,
} from "@/lib/kb/store";
import { getAuthenticatedSession, handleRawAuthError } from "@/lib/auth-utils";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min for batch ingestion

// Map folder names to doc_type values
const FOLDER_DOC_TYPE_MAP: Record<string, string> = {
	"01_Laws": "law",
	"02_Case_Precedents": "precedent",
	"03_Legal_Principles": "principle",
	"04_Memo_Templates": "template",
	"05_Legal_Terminology": "dictionary",
	"06_System_Prompts": "system_prompt",
	"07_RAG": "rag_config",
	"08_Schemas": "schema",
	"09_Evals": "eval",
	"09_Procedures": "procedure",
};

// Only ingest these folders (actual legal content)
const INGEST_FOLDERS = [
	"01_Laws",
	"02_Case_Precedents",
	"03_Legal_Principles",
	"04_Memo_Templates",
	"05_Legal_Terminology",
	"09_Procedures",
];

export async function POST(req: NextRequest) {
	try {
		await getAuthenticatedSession({ requiredRole: "ADMIN" });

		const startTime = Date.now();
		const results: Array<{
			file: string;
			status: string;
			chunks?: number;
			error?: string;
		}> = [];

		// KB root is in .agent/docs/Kuwait_Legal_KB relative to project root
		const projectRoot = process.cwd();
		const kbRoot = path.join(projectRoot, ".agent", "docs", "Kuwait_Legal_KB");

		if (!fs.existsSync(kbRoot)) {
			return NextResponse.json(
				{ error: `KB directory not found: ${kbRoot}` },
				{ status: 404 },
			);
		}

		for (const folder of INGEST_FOLDERS) {
			const folderPath = path.join(kbRoot, folder);
			if (!fs.existsSync(folderPath)) {
				results.push({
					file: folder,
					status: "skipped",
					error: "Folder not found",
				});
				continue;
			}

			const docType = FOLDER_DOC_TYPE_MAP[folder] || "unknown";
			const files = fs
				.readdirSync(folderPath)
				.filter(
					(f) => f.endsWith(".md") || f.endsWith(".pdf") || f.endsWith(".docx"),
				);

			for (const filename of files) {
				const fileStart = Date.now();
				const filePath = path.join(folderPath, filename);

				try {
					let rawContent = "";
					const isMarkdown = filename.toLowerCase().endsWith(".md");
					const isPdf = filename.toLowerCase().endsWith(".pdf");
					const isDocx = filename.toLowerCase().endsWith(".docx");

					if (isMarkdown) {
						rawContent = fs.readFileSync(filePath, "utf8");
					} else if (isPdf || isDocx) {
						const buffer = fs.readFileSync(filePath);
						rawContent = await extractTextFromFile(buffer, filename);
					}

					if (!rawContent.trim()) {
						results.push({
							file: `${folder}/${filename}`,
							status: "skipped",
							error: "Empty content",
						});
						continue;
					}

					const fileHash = hashContent(rawContent);

					let parsed: ParsedDocument;
					if (isMarkdown && rawContent.includes("---")) {
						parsed = parseMarkdownFile(rawContent, filename, docType);
					} else {
						parsed = {
							frontmatter: {
								title: filename.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "),
								doc_type: docType,
								jurisdiction: "kuwait",
							},
							content: rawContent,
							rawMarkdown: rawContent,
						};
					}

					const chunks = chunkMarkdown(
						parsed.content,
						parsed.frontmatter.title,
						{
							minTokens: parsed.frontmatter.chunk_min_tokens || 50,
							maxTokens: parsed.frontmatter.chunk_max_tokens || 800,
							splitDepth: parsed.frontmatter.heading_depth_for_split || 2,
						},
					);

					if (chunks.length === 0) {
						results.push({
							file: `${folder}/${filename}`,
							status: "skipped",
							error: "No chunks produced",
						});
						continue;
					}

					const texts = chunks.map((c) => c.contentText);
					const embeddings = await embedBatch(texts);

					const documentId = await upsertDocument(
						parsed,
						filename,
						fileHash,
						"admin_sync",
					);
					const chunksStored = await replaceChunks(
						documentId,
						chunks,
						embeddings,
					);

					const duration = Date.now() - fileStart;
					await logUpload(
						documentId,
						"create",
						"success",
						chunksStored,
						duration,
						"admin_sync",
					);

					results.push({
						file: `${folder}/${filename}`,
						status: "success",
						chunks: chunksStored,
					});
				} catch (fileError: unknown) {
					const duration = Date.now() - fileStart;
					const errorMessage = fileError instanceof Error ? fileError.message : "Unknown error";
					results.push({
						file: `${folder}/${filename}`,
						status: "error",
						error: errorMessage,
					});
					try {
						await logUpload(
							0,
							"create",
							"error",
							0,
							duration,
							"admin_sync",
							errorMessage,
						);
					} catch (_) {}
				}
			}
		}

		const totalDuration = Date.now() - startTime;
		const successCount = results.filter((r) => r.status === "success").length;
		const totalChunks = results.reduce((sum, r) => sum + (r.chunks || 0), 0);

		return NextResponse.json({
			message: `Ingestion complete: ${successCount}/${results.length} files, ${totalChunks} total chunks in ${totalDuration}ms`,
			results,
			summary: {
				total: results.length,
				success: successCount,
				errors: results.filter((r) => r.status === "error").length,
				skipped: results.filter((r) => r.status === "skipped").length,
				totalChunks,
				durationMs: totalDuration,
			},
		});
	} catch (error) {
		return handleRawAuthError(error);
	}
}
