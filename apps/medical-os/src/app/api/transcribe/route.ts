import { NextRequest, NextResponse } from "next/server";
import { transcribeMedicalAudio } from "@smartekai/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 },
      );
    }

    // Convert File to ArrayBuffer
    const arrayBuffer = await audioFile.arrayBuffer();

    // Determine content type from file
    const contentType = audioFile.type || "audio/webm";

    // Transcribe using Deepgram
    const result = await transcribeMedicalAudio(arrayBuffer, contentType);

    if (!result.success) {
      return NextResponse.json(
        { error: "Transcription failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      transcription: result.transcription,
      language: result.language,
      confidence: result.confidence,
    });
  } catch (error) {
    console.error("Transcription API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
