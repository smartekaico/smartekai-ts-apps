import { type NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import pdfParse from "pdf-parse-fork";
import { getAuthenticatedSession, handleRawAuthError } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
	try {
		await getAuthenticatedSession({ requiredRole: ["LEGAL", "ADMIN"] });

		const formData = await req.formData();
		const file = formData.get("file") as File | null;

		if (!file) {
			return NextResponse.json(
				{ error: "لم يتم رفع أي ملف (No file uploaded)" },
				{ status: 400 },
			);
		}

		// Convert the uploaded file to a Node.js Buffer
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		let extractedText = "";

		const fileName = file.name.toLowerCase();

		// Check file type and extract text
		if (fileName.endsWith(".pdf")) {
			const pdfData = await pdfParse(buffer);
			extractedText = pdfData.text;
		} else if (fileName.endsWith(".docx")) {
			const result = await mammoth.extractRawText({ buffer });
			extractedText = result.value;
		} else {
			return NextResponse.json(
				{ error: "صيغة الملف غير مدعومة. يرجى رفع PDF أو DOCX" },
				{ status: 400 },
			);
		}

		if (!extractedText.trim()) {
			return NextResponse.json(
				{
					error:
						"لم نتمكن من استخراج أي نص من الملف. قد يكون الملف فارغاً أو عبارة عن صورة (Scanned PDF).",
				},
				{ status: 422 },
			);
		}

		// Return the text to the frontend
		return NextResponse.json({ text: extractedText });
	} catch (error) {
		return handleRawAuthError(error);
	}
}
