import { NextRequest, NextResponse } from "next/server";
import { generateSoapNote } from "@smartekai/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { transcription } = await request.json();

    if (!transcription) {
      return NextResponse.json(
        { error: "No transcription provided" },
        { status: 400 }
      );
    }

    const soap = await generateSoapNote(transcription);

    return NextResponse.json({ success: true, soap });
  } catch (error) {
    console.error("SOAP generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate SOAP note" },
      { status: 500 }
    );
  }
}
