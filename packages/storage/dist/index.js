"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUCKETS = void 0;
exports.uploadObject = uploadObject;
exports.getPresignedReadUrl = getPresignedReadUrl;
exports.getPublicUrl = getPublicUrl;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is not set — packages/storage needs it to reach Neon Object Storage`);
    }
    return value;
}
const client = new client_s3_1.S3Client({
    region: requireEnv("AWS_REGION"),
    endpoint: requireEnv("AWS_ENDPOINT_URL_S3"),
    credentials: {
        accessKeyId: requireEnv("AWS_ACCESS_KEY_ID"),
        secretAccessKey: requireEnv("AWS_SECRET_ACCESS_KEY"),
    },
    forcePathStyle: true, // required for a custom (non-AWS) S3 endpoint
});
async function uploadObject(bucket, key, body, contentType) {
    await client.send(new client_s3_1.PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
}
/**
 * For the private cars-uploads bucket — Gemini/Fal.ai fetch the photo via
 * this short-lived URL instead of the object ever being made public.
 */
async function getPresignedReadUrl(bucket, key, expiresInSeconds = 300) {
    return (0, s3_request_presigner_1.getSignedUrl)(client, new client_s3_1.GetObjectCommand({ Bucket: bucket, Key: key }), {
        expiresIn: expiresInSeconds,
    });
}
/** Public URL for an object in a public_read bucket — no signing needed. */
function getPublicUrl(bucket, key) {
    return `${requireEnv("AWS_ENDPOINT_URL_S3")}/${bucket}/${key}`;
}
exports.BUCKETS = {
    uploads: "cars-uploads",
    renders: "cars-renders",
};
