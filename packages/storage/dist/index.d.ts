export declare function uploadObject(bucket: string, key: string, body: Buffer, contentType: string, cacheControl?: string): Promise<void>;
export declare function deleteObject(bucket: string, key: string): Promise<void>;
/**
 * For the private cars-uploads bucket — Gemini/Fal.ai fetch the photo via
 * this short-lived URL instead of the object ever being made public.
 */
export declare function getPresignedReadUrl(bucket: string, key: string, expiresInSeconds?: number): Promise<string>;
/** Public URL for an object in a public_read bucket — no signing needed. */
export declare function getPublicUrl(bucket: string, key: string): string;
/**
 * Reads an object's bytes server-side. Used by same-origin image proxies so
 * browsers never have to fetch Neon Object Storage cross-origin (whose CDN
 * mishandles `Vary: Origin` and can serve a no-CORS cached variant).
 */
export declare function getObjectBytes(bucket: string, key: string): Promise<{
    bytes: ArrayBuffer;
    contentType: string;
}>;
export declare const BUCKETS: {
    readonly uploads: "cars-uploads";
    readonly renders: "cars-renders";
};
/**
 * For public objects stored under a stable key and overwritten in place
 * (stock photos, `renders/<buildId>.<ext>`). Without an explicit directive the
 * browser applies heuristic freshness and keeps serving the old bytes after a
 * re-render; `no-cache` forces an ETag revalidation instead.
 */
export declare const MUTABLE_PUBLIC_CACHE = "no-cache";
