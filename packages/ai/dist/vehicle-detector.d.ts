import { z } from "zod";
export declare const vehicleDetectionSchema: z.ZodObject<{
    isValidVehicle: z.ZodBoolean;
    vehicleType: z.ZodNullable<z.ZodString>;
    detectedMake: z.ZodNullable<z.ZodString>;
    detectedModel: z.ZodNullable<z.ZodString>;
    detectedColor: z.ZodNullable<z.ZodString>;
    angle: z.ZodNullable<z.ZodString>;
    validationError: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    isValidVehicle: boolean;
    vehicleType: string | null;
    detectedMake: string | null;
    detectedModel: string | null;
    detectedColor: string | null;
    angle: string | null;
    validationError: string | null;
}, {
    isValidVehicle: boolean;
    vehicleType: string | null;
    detectedMake: string | null;
    detectedModel: string | null;
    detectedColor: string | null;
    angle: string | null;
    validationError: string | null;
}>;
export type VehicleDetection = z.infer<typeof vehicleDetectionSchema>;
/**
 * Validates that an uploaded photo is a usable exterior shot of a 4x4-style
 * vehicle, and extracts make/model/color/angle for prompt construction.
 */
export declare function detectVehicle(imageUrl: string): Promise<VehicleDetection>;
