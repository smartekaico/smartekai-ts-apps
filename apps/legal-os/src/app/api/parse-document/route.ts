import { NextResponse } from "next/server";
import pdf from "pdf-parse-fork";
import mammoth from "mammoth";
import { getAuthenticatedSession, handleRawAuthError } from "@/lib/auth-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
	try {
		await getAuthenticatedSession({ requiredRole: ["LEGAL", "ADMIN"] });

		const formData = await req.formData();
		const file = formData.get("file") as File | null;

		if (!file) {
			return NextResponse.json({ error: "لم يتم رفع أي ملف" }, { status: 400 });
		}

		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Use unified extraction utility (handles PDF, DOCX, DOC, MD, TXT + OCR)
		const { extractTextFromFile } = await import("@/lib/kb/extract-text");
		const extractedText = await extractTextFromFile(buffer, file.name);

		if (!extractedText || !extractedText.trim()) {
			return NextResponse.json(
				{
					error:
						"فشل استخراج النص من الملف. قد يكون المستند تالفاً أو غير مدعوم.",
				},
				{ status: 422 },
			);
		}

		return NextResponse.json({
			text: extractedText.trim(),
			fileName: file.name,
		});
	} catch (error) {
		console.error("Parse Error:", error);
		return handleRawAuthError(error);
	}
}
