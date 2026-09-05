export declare function uploadObject(bucket: string, key: string, body: Buffer, contentType: string): Promise<void>;
/**
 * For the private cars-uploads bucket — Gemini/Fal.ai fetch the photo via
 * this short-lived URL instead of the object ever being made public.
 */
export declare function getPresignedReadUrl(bucket: string, key: string, expiresInSeconds?: number): Promise<string>;
/** Public URL for an object in a public_read bucket — no signing needed. */
export declare function getPublicUrl(bucket: string, key: string): string;
export declare const BUCKETS: {
    readonly uploads: "cars-uploads";
    readonly renders: "cars-renders";
};
