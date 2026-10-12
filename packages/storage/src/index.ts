import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set — packages/storage needs it to reach Neon Object Storage`);
  }
  return value;
}

const client = new S3Client({
  region: requireEnv("AWS_REGION"),
  endpoint: requireEnv("AWS_ENDPOINT_URL_S3"),
  credentials: {
    accessKeyId: requireEnv("AWS_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("AWS_SECRET_ACCESS_KEY"),
  },
  forcePathStyle: true, // required for a custom (non-AWS) S3 endpoint
});

export async function uploadObject(
  bucket: string,
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }),
  );
}

export async function deleteObject(bucket: string, key: string): Promise<void> {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/**
 * For the private cars-uploads bucket — Gemini/Fal.ai fetch the photo via
 * this short-lived URL instead of the object ever being made public.
 */
export async function getPresignedReadUrl(
  bucket: string,
  key: string,
  expiresInSeconds = 300,
): Promise<string> {
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn: expiresInSeconds,
  });
}

/** Public URL for an object in a public_read bucket — no signing needed. */
export function getPublicUrl(bucket: string, key: string): string {
  return `${requireEnv("AWS_ENDPOINT_URL_S3")}/${bucket}/${key}`;
}

/**
 * Reads an object's bytes server-side. Used by same-origin image proxies so
 * browsers never have to fetch Neon Object Storage cross-origin (whose CDN
 * mishandles `Vary: Origin` and can serve a no-CORS cached variant).
 */
export async function getObjectBytes(
  bucket: string,
  key: string,
): Promise<{ bytes: ArrayBuffer; contentType: string }> {
  const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!res.Body) throw new Error(`Object not found: ${bucket}/${key}`);
  const body = res.Body as { transformToByteArray(): Promise<Uint8Array> };
  const view = await body.transformToByteArray();
  const bytes = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer;
  return { bytes, contentType: res.ContentType ?? "application/octet-stream" };
}

export const BUCKETS = {
  uploads: "cars-uploads",
  renders: "cars-renders",
} as const;