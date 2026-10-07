import { createFileRoute } from "@tanstack/react-router";
import { generateSoapNote } from "@smartekai/ai";

export const Route = createFileRoute("/api/generate-soap")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { transcription } = await request.json();

          if (!transcription) {
            return Response.json(
              { error: "No transcription provided" },
              { status: 400 },
            );
          }

          const soap = await generateSoapNote(transcription);

          // generateSoapNote returns { soap: {...} } (the AI object schema's
          // root key); unwrap so clients consume the note sections directly.
          return Response.json({ success: true, soap: soap.soap });
        } catch (error) {
          console.error("SOAP generation error:", error);
          return Response.json(
            { error: "Failed to generate SOAP note" },
            { status: 500 },
          );
        }
      },
    },
  },
});
