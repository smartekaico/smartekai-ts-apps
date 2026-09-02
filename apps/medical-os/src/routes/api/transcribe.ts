import { createFileRoute } from "@tanstack/react-router";
import { transcribeMedicalAudio } from "@smartekai/ai";

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const formData = await request.formData();
          const audioFile = formData.get("audio") as File;

          if (!audioFile) {
            return Response.json(
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
            return Response.json(
              { error: "Transcription failed" },
              { status: 500 },
            );
          }

          return Response.json({
            success: true,
            transcription: result.transcription,
            language: result.language,
            confidence: result.confidence,
          });
        } catch (error) {
          console.error("Transcription API error:", error);
          return Response.json(
            { error: "Internal server error" },
            { status: 500 },
          );
        }
      },
    },
  },
});
