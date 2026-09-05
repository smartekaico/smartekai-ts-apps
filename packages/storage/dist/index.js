"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUCKETS = void 0;
exports.uploadObject = uploadObject;
exports.getPresignedReadUrl = getPresignedReadUrl;
exports.getPublicUrl = getPublicUrl;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION,
    endpoint: process.env.AWS_ENDPOINT_URL_S3,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
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
    const endpoint = process.env.AWS_ENDPOINT_URL_S3;
    return `${endpoint}/${bucket}/${key}`;
}
exports.BUCKETS = {
    uploads: "cars-uploads",
    renders: "cars-renders",
};
