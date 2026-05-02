import mammoth from "mammoth";
import pdfParse from "pdf-parse-fork";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { LiteParse } from "@llamaindex/liteparse";
// @ts-ignore
import WordExtractor from "word-extractor";

/**
 * Cleans and normalizes extracted text to save tokens and improve AI comprehension.
 */
export function cleanExtractedText(text: string): string {
	if (!text) return "";

	return text
		// biome-ignore lint/suspicious/noControlCharactersInRegex: intentional cleanup
		.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "") // Remove non-printable control characters
		.replace(/[ـ]/g, "") // Remove Arabic kashida/tatweel (non-semantic elongation)
		.replace(/_{3,}/g, " ") // Remove long underscore lines (OCR artifacts)
		.replace(/\.{4,}/g, "...") // Reduce long ellipsis
		.replace(/[ \t]+/g, " ") // Collapse multiple spaces/tabs
		.replace(/\n{3,}/g, "\n\n") // Collapse excessive newlines (max 2)
		.trim();
}

/**
 * Extracts raw text from a PDF or DOCX file buffer.
 */
export async function extractTextFromFile(
	buffer: Buffer,
	fileName: string,
): Promise<string> {
	const ext = fileName.toLowerCase().split(".").pop();

	try {
		if (ext === "pdf") {
			// 1. Try standard text-layer extraction first (FAST)
			const pdfData = await pdfParse(buffer);
			const extractedText = pdfData.text || "";

			// 2. Heuristic: Check for poor text layer (e.g., scanned PDF or corrupted Arabic layer)
			// If characters per page is low (< 300 per page), trigger OCR for better quality
			const charPerPageLimit = 300;
			const charPerPage =
				pdfData.numpages > 0
					? extractedText.trim().length / pdfData.numpages
					: 0;
			const isPoorQuality =
				charPerPage < charPerPageLimit && pdfData.numpages > 0;

			if (!isPoorQuality) {
				console.log(
					`[Extraction] Classic parse successful for ${fileName} (${Math.round(charPerPage)} chars/page)`,
				);
				return cleanExtractedText(extractedText);
			}

			console.log(
				`[Extraction] Poor quality text detected (~${Math.round(charPerPage)} chars/page) for ${fileName}. Starting High-DPI OCR...`,
			);

			// 3. OCR Extraction (LiteParse) - Render at 300 DPI for Arabic accuracy
			const tempId = Math.random().toString(36).substring(7);
			const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
			const tempPath = path.join(
				os.tmpdir(),
				`kb-ocr-${tempId}-${safeFileName}`,
			);
			fs.writeFileSync(tempPath, buffer);

			try {
				const parser = new LiteParse({
					ocrEnabled: true,
					ocrLanguage: ["ara", "eng"],
					dpi: 300, // Boost from default 150 for Arabic precision
				});
				const result = await parser.parse(tempPath);
				return cleanExtractedText(result.text || "");
			} finally {
				if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
			}
		}

		if (ext === "docx") {
			const result = await mammoth.extractRawText({ buffer });
			return cleanExtractedText(result.value || "");
		}

		if (ext === "doc") {
			console.log(
				`[Extraction] Processing legacy .doc for ${fileName} via word-extractor...`,
			);
			// Use word-extractor for legacy .doc instead of LiteParse to avoid LibreOffice dependency
			const extractor = new WordExtractor();
			try {
				const extracted = await extractor.extract(buffer);
				return cleanExtractedText(extracted.getBody() || "");
			} catch (err) {
				console.warn(
					`[Extraction Warning] word-extractor failed for ${fileName}, falling back...`,
					err,
				);
				throw err;
			}
		}

		if (ext === "md" || ext === "txt") {
			return cleanExtractedText(buffer.toString("utf-8"));
		}

		// Unified LiteParse Processing for Presentations, Spreadsheets, and Images
		if (
			["pptx", "ppt", "xlsx", "xls", "png", "jpg", "jpeg"].includes(ext || "")
		) {
			console.log(
				`[Extraction] Processing ${ext} using LiteParse OCR for ${fileName}...`,
			);
			const tempId = Math.random().toString(36).substring(7);
			const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
			const tempPath = path.join(
				os.tmpdir(),
				`kb-liteparse-${tempId}-${safeFileName}`,
			);
			fs.writeFileSync(tempPath, buffer);

			try {
				const parser = new LiteParse({
					ocrEnabled: true,
					ocrLanguage: ["ara", "eng"],
					dpi: 300,
				});
				const result = await parser.parse(tempPath);
				return cleanExtractedText(result.text || "");
			} finally {
				if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
			}
		}

		throw new Error(`Unsupported file type: .${ext}`);
	} catch (error: unknown) {
		console.error(`[Extraction Error] Failed to parse ${fileName}:`, error);
		throw new Error(
			`تحذير: فشل استخراج النص من الملف (${fileName}). تأكد من جودة الملف أو أن الملف غير محمي بكلمة سر.`,
		);
	}
}
