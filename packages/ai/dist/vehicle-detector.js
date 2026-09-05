"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vehicleDetectionSchema = void 0;
exports.detectVehicle = detectVehicle;
const zod_1 = require("zod");
const ai_1 = require("ai");
const google_1 = require("@ai-sdk/google");
exports.vehicleDetectionSchema = zod_1.z.object({
    isValidVehicle: zod_1.z.boolean(),
    vehicleType: zod_1.z.string().nullable(),
    detectedMake: zod_1.z.string().nullable(),
    detectedModel: zod_1.z.string().nullable(),
    detectedColor: zod_1.z.string().nullable(),
    angle: zod_1.z.string().nullable(),
    validationError: zod_1.z.string().nullable(),
});
const google = (0, google_1.createGoogleGenerativeAI)({
    apiKey: process.env.GOOGLE_AI_API_KEY,
});
const MODEL_NAME = process.env.GOOGLE_AI_MODEL || "gemini-2.5-flash";
/**
 * Validates that an uploaded photo is a usable exterior shot of a 4x4-style
 * vehicle, and extracts make/model/color/angle for prompt construction.
 */
async function detectVehicle(imageUrl) {
    const model = google(MODEL_NAME.startsWith("models/") ? MODEL_NAME : `models/${MODEL_NAME}`);
    const { object } = await (0, ai_1.generateObject)({
        model,
        schema: exports.vehicleDetectionSchema,
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
