import { crwSearch } from "@smartekai/crw";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
	try {
		const { query, limit, lang, sources } = await req.json();

		if (!query || typeof query !== "string") {
			return NextResponse.json(
				{ error: "A string query is required" },
				{ status: 400 },
			);
		}

		const results = await crwSearch(query, { limit, lang, sources });

		return NextResponse.json({ success: true, results });
	} catch (error) {
		console.error("CRW search error:", error);
		return NextResponse.json(
			{ error: "Failed to run CRW search" },
			{ status: 500 },
		);
	}
}
