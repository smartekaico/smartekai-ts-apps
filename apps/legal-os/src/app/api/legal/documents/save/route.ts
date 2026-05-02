import { NextResponse } from "next/server";
import { db } from "@/db";
import { sessionDocs } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(req: Request) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const { caseProjectId, title, content } = await req.json();

		if (!content || !title) {
			return NextResponse.json(
				{ error: "Title and Content are required" },
				{ status: 400 },
			);
		}

		const sid =
			typeof caseProjectId === "string"
				? Number.parseInt(caseProjectId, 10)
				: caseProjectId;
		
		if (Number.isNaN(sid)) {
			return NextResponse.json({ error: "Invalid Session ID" }, { status: 400 });
		}

		// Insert the TipTap HTML content into the database linked to the project
		const newDoc = await db
			.insert(sessionDocs)
			.values({
				sessionId: sid,
				title: title,
				content: content,
			})
			.returning();

		return NextResponse.json({
			success: true,
			message: "تم حفظ المستند في ملف القضية",
			document: newDoc[0],
		});
	} catch (error) {
		console.error("Save Document Error:", error);
		return NextResponse.json(
			{ error: `فشل الحفظ: ${error instanceof Error ? error.message : "Unknown error"}` },
			{ status: 500 },
		);
	}
}
