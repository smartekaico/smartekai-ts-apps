# AI-Powered 4x4 Customizer — Pivot Design

Source material: `.agents/cars-4by4-builder/sops/sop-v2-ai-customizer.md` (pasted revised
SOP). This **supersedes** `.agents/cars-4by4-builder/specs/2026-09-05-mvp-design.md` for
this app's core mechanic — the 3D Three.js configurator is dropped entirely in favor of a
photo-upload + vision-AI + generative-inpainting pipeline. `.agents/cars-4by4-builder/
plans/active.md` (written against the old design) is being replaced by `writing-plans`
right after this spec is approved.

## 1. What this is

Upload a real photo of your 4x4, pick upgrades from a catalog (bumpers, wheels/tires,
roof racks, tents, lighting), and get back a photorealistic AI-rendered version of *your
actual truck* wearing those parts — plus an itemized quote, fitment/safety notes, and
affiliate links. Any vehicle works; there's no fixed 3-vehicle catalog anymore.

## 2. What's unchanged from the prior spec

- App at `apps/cars-4by4-builder`, TanStack Start, npm workspaces, Dokploy deployment —
  see prior spec §2 (still accurate; the framework/deployment reasoning didn't depend on
  the 3D mechanic).
- Dedicated `dbCars` connection on `DATABASE_NEONDB_SMARTEKAI`, added to
  `packages/db/src/client.ts`/`index.ts` alongside `dbLegal`/`dbMedical` — see prior spec
  §3's connection mechanics (the *tables* on it are different now, see §4 below).
- Separate Better Auth instance for this app (not the shared legal/medical one), with its
  own minimal `carsUsers`/`carsSessions`/`carsAccounts`/`carsVerifications` table family —
  see prior spec §4. Scope stays anonymous + email/password; OAuth is still deferred even
  though the new SOP mentions it, since it's unrelated to what actually changed in this
  pivot (the AI pipeline is the new risk, not auth).
- No multi-tenancy, no `organizationId` anywhere.
- `@smartekai/ui` still only has `Button`/`Card`/`Input`/`Label` — anything else the SOP's
  UI section wants (file dropzone, comparison slider, toast, accordion) is a local
  component in the app, not a blind addition to the shared design system, for the same
  reason as before.
- Hand-curated seed data for the parts catalog, not scraped via `@smartekai/crw`.

## 3. What's new: the AI layer

### 3.1 Vision — extends `@smartekai/ai`

`packages/ai` already wraps Gemini via Vercel AI SDK's `generateObject` (see
`soap-generator.ts`). A new `detectVehicle(imageUrl: string)` export follows the exact
same shape: a Zod schema plus a multimodal `generateObject` call (image + text prompt),
same `createGoogleGenerativeAI` client, same `GOOGLE_AI_API_KEY` — no new AI provider
account. Returns `{ isValidVehicle, vehicleType, detectedMake, detectedModel,
detectedColor, angle, validationError }` per the SOP's shape.

### 3.2 Image generation — also extends `@smartekai/ai`

**Superseded 2026-09-11: switched from Fal.ai to Gemini 3.1 Flash Image.** The SOP names
"Flux Inpainting" generically, but real inpainting APIs (e.g. `fal-ai/flux-lora/inpainting`)
require an explicit `mask_url` this SOP never accounts for producing — the original design
here used `fal-ai/flux-pro/kontext` instead (mask-free, instruction-based editing), which
worked, but required a separate Fal.ai account. That account hit a billing lock
(`"User is locked. Reason: TOP_UP."`) before first use, and the user asked to consolidate
onto Gemini instead — a model actually exists for this: **Gemini 3.1 Flash Image** ("Nano
Banana 2"), Google's native image-generation/editing model, confirmed via Google's own
model card to support Image + Text → Text + Image editing. Same mask-free shape Fal.ai's
Kontext model had, now on the same provider `detectVehicle` already uses — one API key
(`GOOGLE_AI_API_KEY`), no separate billing account, and it eliminates the Fal.ai blocker
entirely.

A new `generateUpgradeRender(originalImageUrl: string, prompt: string)` export wraps this
via the Vercel AI SDK's `generateText` with `responseModalities: ["TEXT", "IMAGE"]`, same
"thin wrapper" shape as `transcription.ts` wraps Deepgram, same Gemini client construction
as `vehicle-detector.ts`:

```typescript
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_AI_API_KEY });

export async function generateUpgradeRender(originalImageUrl: string, prompt: string) {
  const result = await generateText({
    model: google("models/gemini-3.1-flash-image"),
    providerOptions: { google: { responseModalities: ["TEXT", "IMAGE"] } },
    messages: [{
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image", image: originalImageUrl },
      ],
    }],
  });
  const image = result.files.find((f) => f.mediaType.startsWith("image/"));
  if (!image) throw new Error("Gemini did not return an image in the response");
  return { data: image.uint8Array, mediaType: image.mediaType };
}
```

Note the return shape changed from a URL (Fal.ai's response) to raw bytes (Gemini's
response) — the pipeline (§5) uploads those bytes to `cars-renders` directly, one fewer
network round-trip than fetching a URL first. Verified against the real API: a real photo
of a Toyota Land Cruiser Prado, prompted to add a bull bar, came back with a clean,
photorealistic edit — background, angle, and vehicle color all preserved.

No new env var — `GOOGLE_AI_API_KEY` already exists in this repo. `FAL_KEY` and
`@fal-ai/client` are removed entirely.

### 3.3 Object storage — new `packages/storage` package, backed by Neon Object Storage

Not R2, not AWS S3 — **Neon Object Storage**, a S3-compatible object store built into the
already-provisioned Neon project (confirmed via Neon's docs: branch-scoped S3 endpoint,
same Neon credential system, no separate cloud account). Since this is a third-party-
shaped API surface distinct from `@smartekai/ai`'s AI calls, it gets its own thin package
— same pattern as `@smartekai/crw` wrapping Firecrawl.

`packages/storage/src/index.ts` wraps `@aws-sdk/client-s3`:

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const client = new S3Client({
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true, // required for a custom S3 endpoint
});

export async function uploadObject(bucket: string, key: string, body: Buffer, contentType: string) {
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
}

// Used for the private cars-uploads bucket — Gemini fetches the photo via this
// short-lived URL instead of the object ever being made public.
export async function getPresignedReadUrl(bucket: string, key: string, expiresInSeconds = 300) {
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: expiresInSeconds });
}
```

(`@aws-sdk/s3-request-presigner` is a second new dependency alongside `@aws-sdk/client-s3`.)

Two buckets, both on the same Neon project/branch as `dbCars`:
- `cars-uploads` (**private**) — raw user photos. Never exposed directly; the pipeline
  generates presigned GET URLs server-side when Gemini needs to fetch the image.
- `cars-renders` (**public_read**) — AI-generated results. Served directly via their
  public URL for the before/after slider, share links, and OpenGraph preview tags.

New env vars: `AWS_ENDPOINT_URL_S3` (branch-scoped,
`https://br-<branch-id>.storage.c-1.<region>.aws.neon.tech`), `AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY`, `AWS_REGION`. Obtained via the Neon Console (Object Storage tab
→ New bucket) or `neonctl buckets create <name> --access-level <private|public_read>`
once `neonctl` is authenticated (it isn't in this environment yet — one-time manual
`neonctl auth` or a `NEON_API_KEY`, same category of prerequisite as
`DATABASE_NEONDB_SMARTEKAI` was).

## 4. Data model — `packages/db/src/schema.ts`

`vehicles` and `builds` from the prior spec are dropped. `parts` gains fields; a new
`upgradeSessions` table replaces `builds`:

```typescript
export const parts = pgTable("parts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // "front_bumper" | "wheels_tires" | "roof_tent" | "lift_kit" | "snorkel" | "lighting"
  brand: text("brand").notNull(),
  priceUsd: numeric("price_usd", { precision: 10, scale: 2 }).notNull(),
  laborHoursEst: numeric("labor_hours_est", { precision: 4, scale: 1 }).notNull(),
  fitmentDifficulty: text("fitment_difficulty").notNull(), // "Direct Bolt-On" | "Minor Trimming" | "Custom Fabrication"
  aiPromptSnippet: text("ai_prompt_snippet").notNull(),
  imageUrl: text("image_url").notNull(),
  affiliateUrl: text("affiliate_url").notNull(),
});

export const upgradeSessions = pgTable("upgrade_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => carsUsers.id), // nullable — guest by default
  originalImageUrl: text("original_image_url").notNull(),
  transformedImageUrl: text("transformed_image_url"),
  detectedVehicle: jsonb("detected_vehicle"), // { make, model, year, color }
  selectedPartIds: text("selected_part_ids").array().notNull(),
  status: text("status").default("pending").notNull(), // "pending" | "processing" | "completed" | "failed"
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

`carsUsers`/`carsSessions`/`carsAccounts`/`carsVerifications` are unchanged from the prior
spec (§4 there) — the pivot doesn't touch auth's data model, only the product's.

## 5. Pipeline shape — synchronous, no job queue

This app deploys to a self-managed Dokploy/Node server (Nitro), not a serverless platform
with a hard request-timeout — so there's no infrastructure reason to introduce a
background-job/polling architecture the repo doesn't otherwise have. One server function
does the whole thing per generation request:

1. Receive the uploaded photo (multipart `FormData`) + selected part IDs.
2. Upload the raw photo to `cars-uploads` (private), generate a presigned GET URL.
3. Call `detectVehicle(presignedUrl)`. If `isValidVehicle` is false, return the
   `validationError` immediately — no generation attempted, no `upgradeSessions` row
   written for an invalid upload.
4. Build the transformation prompt: vehicle details + each selected part's
   `aiPromptSnippet`, joined per the SOP's prompt template.
5. Call `generateUpgradeRender(presignedUrl, prompt)` — awaited directly, no polling.
6. Upload the result to `cars-renders` (public_read).
7. Insert one `upgradeSessions` row with both URLs, `detectedVehicle`, `status:
   "completed"` (or `"failed"` with no `transformedImageUrl` if generation errors).

The visitor sees a single loading state across steps 2–7 (this can be 10–30+ seconds per
the SOP's own estimate) — a plain "Generating your build…" screen, not a progress
percentage tied to a step the client can't actually observe from a single awaited call.

## 6. UI flow

Five steps per the SOP, each a route or route section in `apps/cars-4by4-builder`:

1. **Select upgrades** — category-grouped card grid (local component, `Card`/`Badge`-
   style from `@smartekai/ui` where they fit, checkboxes for multi-select) — same
   category-panel pattern as the old spec's configurator, applied to the new `parts`
   shape.
2. **Upload photo** — local dropzone component (drag-and-drop + `<input type="file"
   accept="image/*" capture>` for mobile camera), with the SOP's angle-guidance copy
   overlaid.
3. **Validation** — the upload step's server function call; a local toast-style component
   (not `@smartekai/ui`, which has no `Toast`) surfaces `validationError` inline.
4. **Generation** — loading state, then routes to the report.
5. **Report** (`/builds/$sessionId`) — local before/after comparison-slider component,
   BOM table (mirrors the old spec's report table shape, new columns per the SOP:
   Upgrade / Fitment Type / Labor / Price / Buy link), fitment/safety advisory text, PDF
   export (`@react-pdf/renderer`, same precedent as before), "Share My Build" (copies the
   URL, sets OpenGraph tags via the route's `head()` pointing at the public
   `transformedImageUrl`), "Buy All Parts" (affiliate links).

## 7. Fitment/safety advisory notes — simple rule text, not a physics model

The SOP's example notes ("adding this bull bar causes ~30mm front sag", "35-inch tires
need a cab-mount chop") are per-part **static advisory strings**, not a calculated
physics model like the old spec's weight/GVM rule engine (there's no vehicle weight data
in this pivot's schema — `detectedVehicle` only has make/model/year/color from vision,
not curb weight or GVM). Each `parts` row that warrants a caveat carries an optional
`fitmentDifficulty`-driven note; the report just surfaces those per selected part. No new
schema field needed beyond what's already defined in §4 — `fitmentDifficulty` plus a
hardcoded per-category advisory string keyed the same way `PART_PLACEHOLDER_COLOR` was
keyed in the old plan.

## 8. Explicitly out of scope for this spec

- OAuth (still deferred, per §2).
- Background job/polling infrastructure — synchronous only, per §5.
- Any physics-based weight/GVM calculation — replaced by static per-part advisory text,
  per §7.
- Authenticating `neonctl` for bucket creation — an external manual step the user does,
  not something this plan executes. (Fal.ai provisioning is no longer relevant — see §3.2.)
- Multi-tenancy, OpenGraph image generation beyond pointing at the existing
  `transformedImageUrl` (no separate OG-image-generation step).

## 9. Milestones (ordered, not dated)

1. **Foundation** — `packages/db` schema (`parts`, `upgradeSessions`,
   `carsUsers`/`carsSessions`/`carsAccounts`/`carsVerifications`), `dbCars` connection,
   app scaffold, cars Better Auth instance (reusable as-is from the old plan's Phase 1 —
   only the schema tables differ).
2. **Storage & AI thin clients** — `packages/storage` (Neon Object Storage), buckets
   created, `@smartekai/ai`'s `detectVehicle`/`generateUpgradeRender` additions.
3. **Upload → validate → generate pipeline** — the synchronous server function from §5,
   end to end against the real Gemini (both calls) + Neon Object Storage services.
4. **Catalog & selection UI** — hand-curated `parts` seed data (new fields), the
   category-grid selection step.
5. **Report page** — before/after slider, BOM table, advisory notes, PDF export, share
   link/OG tags, affiliate links.
