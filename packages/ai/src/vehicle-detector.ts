import { z } from "zod";
import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export const vehicleDetectionSchema = z.object({
  isValidVehicle: z.boolean(),
  vehicleType: z.string().nullable(),
  detectedMake: z.string().nullable(),
  detectedModel: z.string().nullable(),
  detectedColor: z.string().nullable(),
  angle: z.string().nullable(),
  validationError: z.string().nullable(),
});

export type VehicleDetection = z.infer<typeof vehicleDetectionSchema>;

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI_API_KEY,
});

const MODEL_NAME = process.env.GOOGLE_AI_MODEL || "gemini-2.5-flash";

/**
 * Validates that an uploaded photo is a usable exterior shot of a 4x4-style
 * vehicle, and extracts make/model/color/angle for prompt construction.
 */
export async function detectVehicle(imageUrl: string): Promise<VehicleDetection> {
  const model = google(
    MODEL_NAME.startsWith("models/") ? MODEL_NAME : `models/${MODEL_NAME}`,
  );

  const { object } = await generateObject({
    model,
    schema: vehicleDetectionSchema,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `You are validating a photo upload for a 4x4/SUV/truck customizer app.
Look at the image and determine: is this a clear exterior photo of a 4x4-capable
vehicle (SUV, pickup truck, off-roader)? Reject blurry images, interior shots,
non-4x4 vehicles (sedans, sports cars), or images with no vehicle at all.
If valid, detect the make, model, color, and camera angle
(e.g. "front_three_quarter", "side_profile", "rear_three_quarter").
If invalid, explain why in validationError and leave the other detected fields null.`,
          },
          { type: "image", image: imageUrl },
        ],
      },
    ],
  });

  return object;
}