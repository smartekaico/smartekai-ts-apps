import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { detectVehicle, generateUpgradeRender } from "@smartekai/ai";
import {
  uploadObject,
  getPresignedReadUrl,
  getPublicUrl,
  BUCKETS,
} from "@smartekai/storage";
import { dbCars, parts, upgradeSessions } from "@smartekai/db";
import { inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";

const sessionMiddleware = createMiddleware({
  type: "request",
}).server(async ({ request, next }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  return next({ context: { session } });
});

export const generateBuild = createServerFn({ method: "POST" })
  .middleware([sessionMiddleware])
  .validator((formData: FormData) => {
    const photo = formData.get("photo");
    const partIdsRaw = formData.get("partIds");
    if (!(photo instanceof File)) throw new Error("photo is required");
    if (typeof partIdsRaw !== "string") throw new Error("partIds is required");
    return { photo, partIds: JSON.parse(partIdsRaw) as string[] };
  })
  .handler(async ({ data, context }) => {
    const session = context.session;

    // Step 2: upload the raw photo to the private bucket, get a presigned read URL
    const buffer = Buffer.from(await data.photo.arrayBuffer());
    const uploadKey = `${crypto.randomUUID()}-${data.photo.name}`;
    await uploadObject(BUCKETS.uploads, uploadKey, buffer, data.photo.type);
    const presignedUrl = await getPresignedReadUrl(BUCKETS.uploads, uploadKey);

    // Step 3: vision validation
    const detection = await detectVehicle(presignedUrl);
    if (!detection.isValidVehicle) {
      return {
        status: "failed" as const,
        validationError: detection.validationError,
      };
    }

    // Step 4: build the transformation prompt
    const selectedParts = data.partIds.length
      ? await dbCars.select().from(parts).where(inArray(parts.id, data.partIds))
      : [];
    const vehicleDesc = [
      detection.detectedColor,
      detection.detectedMake,
      detection.detectedModel,
    ]
      .filter(Boolean)
      .join(" ");
    const prompt = `Photorealistic photo of a ${vehicleDesc} modified with: ${selectedParts
      .map((p) => p.aiPromptSnippet)
      .join(", ")}. Professional automotive photography, realistic reflections, seamless fitment, 8k.`;

    // Step 5: generate (awaited directly — no polling)
    let transformedUrl: string;
    try {
      transformedUrl = await generateUpgradeRender(presignedUrl, prompt);
    } catch {
      return {
        status: "failed" as const,
        validationError: "Generation failed — try again.",
      };
    }

    // Step 6: fetch the generated image and store it in the public bucket
    const generatedResponse = await fetch(transformedUrl);
    const generatedBuffer = Buffer.from(await generatedResponse.arrayBuffer());
    const renderKey = `${crypto.randomUUID()}.jpg`;
    await uploadObject(
      BUCKETS.renders,
      renderKey,
      generatedBuffer,
      "image/jpeg",
    );
    const publicRenderUrl = getPublicUrl(BUCKETS.renders, renderKey);

    // Step 7: persist the session
    const [inserted] = await dbCars
      .insert(upgradeSessions)
      .values({
        id: crypto.randomUUID(),
        userId: session?.user.id ?? null,
        originalImageUrl: presignedUrl,
        transformedImageUrl: publicRenderUrl,
        detectedVehicle: {
          make: detection.detectedMake,
          model: detection.detectedModel,
          color: detection.detectedColor,
        },
        selectedPartIds: data.partIds,
        status: "completed",
        isPublic: true,
      })
      .returning();

    return {
      status: "completed" as const,
      session: {
        ...inserted,
        detectedVehicle: inserted.detectedVehicle as {
          make: string | null;
          model: string | null;
          color: string | null;
        } | null,
      },
    };
  });