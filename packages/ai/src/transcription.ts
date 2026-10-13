import { DeepgramClient } from "@deepgram/sdk";

let deepgram: DeepgramClient | null = null;

function getDeepgramClient() {
  if (!deepgram) {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      throw new Error("DEEPGRAM_API_KEY is not set");
    }
    deepgram = new DeepgramClient({ apiKey });
  }
  return deepgram;
}

export interface TranscriptionResult {
  success: boolean;
  transcription: string;
  language: string;
  duration?: number;
  confidence?: number;
}

/**
 * Transcribes audio using Deepgram's nova-3-medical model
 * Optimized for medical dictation with keyterm boosting
 */
export async function transcribeMedicalAudio(
  audioBuffer: ArrayBuffer,
  contentType = "audio/webm",
): Promise<TranscriptionResult> {
  try {
    // v5 throws DeepgramError on failure (caught below) instead of returning { error }.
    const response = await getDeepgramClient().listen.v1.media.transcribeFile(
      { data: Buffer.from(new Uint8Array(audioBuffer)), contentType },
      {
        model: "nova-3-medical",
        smart_format: true,
        punctuate: true,
        keyterm: ["Blood pressure:2", "BP:2", "Temperature:2", "Pulse:2"],
      },
    );
    // Only callback requests get the "accepted" shape; we never set one.
    const result = "results" in response ? response : undefined;

    const transcript =
      result?.results?.channels[0]?.alternatives?.[0]?.transcript || "";

    const confidence =
      result?.results?.channels[0]?.alternatives?.[0]?.confidence;

    return {
      success: true,
      transcription: transcript,
      language: "en", // Deepgram auto-detects
      confidence,
    };
  } catch (error) {
    console.error("Transcription error:", error);
    return {
      success: false,
      transcription: "",
      language: "en",
    };
  }
}
