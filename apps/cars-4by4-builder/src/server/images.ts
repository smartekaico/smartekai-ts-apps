import { BUCKETS, getPresignedReadUrl, getPublicUrl } from "@smartekai/storage";

export const STOCK_PREFIX = "stock/";

/** Stock photos are public; user uploads are private and get a 1-hour signed URL. */
export async function originalImageUrl(key: string): Promise<string> {
  return key.startsWith(STOCK_PREFIX)
    ? getPublicUrl(BUCKETS.renders, key)
    : getPresignedReadUrl(BUCKETS.uploads, key, 3600);
}

export function publicImageUrl(key: string): string {
  return getPublicUrl(BUCKETS.renders, key);
}
