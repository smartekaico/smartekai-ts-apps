import HTMLtoDOCX from "html-to-docx";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
	try {
		const { html } = await req.json();

		// Ensure we have a valid HTML document structure for html-to-docx
		const fullHtml = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8">
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;

		// Convert HTML to docx format
		const fileBuffer = await HTMLtoDOCX(fullHtml, null, {
			table: { row: { cantSplit: true } },
			footer: true,
			pageNumber: true,
		});

		return new NextResponse(fileBuffer, {
			status: 200,
			headers: {
				"Content-Type":
					"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				"Content-Disposition": 'attachment; filename="Legal_Memo.docx"',
			},
		});
	} catch (error) {
		console.error("DOCX Export Error:", error);
		return NextResponse.json(
			{ error: "Failed to generate word document" },
			{ status: 500 },
		);
	}
}
