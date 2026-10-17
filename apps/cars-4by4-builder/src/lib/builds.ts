import { createServerFn } from "@tanstack/react-start";
import { notFound, redirect } from "@tanstack/react-router";
import { and, asc, count, desc, eq, gte, inArray, isNull, ne, or } from "drizzle-orm";
import { builds, getDbCars, parts, presets, vehicles } from "@smartekai/db/cars";
import type { DetectedVehicle, Part } from "@smartekai/db/cars";
import { detectVehicle } from "@smartekai/ai";
import { BUCKETS, deleteObject, getPresignedReadUrl, uploadObject } from "@smartekai/storage";
import { MAX_PARTS } from "@/lib/catalog";
import { summarize } from "@/lib/pricing";
import { storeOf } from "@/lib/store";
import type { Store } from "@/lib/store";
import type { CreditBlock } from "@/lib/credit-packs";
import { chargeRender, refundRender } from "@/server/credits";
import { STALE_PROCESSING_MS, TIMED_OUT_MESSAGE, failProcessingBuild, runGeneration } from "@/server/generate";
import { originalImageUrl, publicImageUrl } from "@/server/images";
import { photoRules, renderRules, tryConsume } from "@/server/rate-limit";
import { requestIp } from "@/server/request";
import { accountUser, currentUser } from "@/server/session";

const ACCEPTED_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const DAILY_RENDER_CAP = Number(process.env.CARS_DAILY_RENDER_CAP ?? 200);

type Fail = { ok: false; error: string; action?: CreditBlock };
const fail = (error: string, action?: CreditBlock): Fail => ({ ok: false, error, ...(action ? { action } : {}) });

export type PublicPart = {
  id: string;
  name: string;
  brand: string;
  category: string;
  priceUsd: string;
  laborHoursEst: string;
  fitmentDifficulty: string;
  imageUrl: string;
  store: Store | null; // null = no partner link yet (Buy stays hidden)
};

/** What a guest sees on the public build page — no per-part price, labor or fitment. */
export type TeaserPart = Pick<PublicPart, "id" | "name" | "brand" | "category" | "imageUrl" | "store">;

function toPublicPart(p: Part): PublicPart {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    priceUsd: p.priceUsd,
    laborHoursEst: p.laborHoursEst,
    fitmentDifficulty: p.fitmentDifficulty,
    imageUrl: p.imageUrl,
    store: storeOf(p.affiliateUrl),
  };
}

function toTeaserPart(p: Part): TeaserPart {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    imageUrl: p.imageUrl,
    store: storeOf(p.affiliateUrl),
  };
}

export const getConfigurator = createServerFn({ method: "GET" }).handler(async () => {
  const db = getDbCars();
  const [allVehicles, allParts, allPresets] = await Promise.all([
    db.select().from(vehicles).orderBy(asc(vehicles.sortOrder)),
    db.select().from(parts).orderBy(asc(parts.category), asc(parts.name)),
    db.select().from(presets).orderBy(asc(presets.sortOrder)),
  ]);
  return {
    vehicles: allVehicles.map((v) => ({
      id: v.id,
      name: v.name,
      yearRange: v.yearRange,
      stockImageUrl: v.stockImageKey ? publicImageUrl(v.stockImageKey) : null,
    })),
    parts: allParts.map((p) => ({ ...toPublicPart(p), vehicleIds: p.vehicleIds })),
    presets: allPresets.map((p) => ({ id: p.id, slug: p.slug, vehicleId: p.vehicleId, name: p.name, partIds: p.partIds })),
  };
});

export type ConfiguratorData = Awaited<ReturnType<typeof getConfigurator>>;

export const checkPhoto = createServerFn({ method: "POST" })
  .validator((formData: FormData) => {
    const photo = formData.get("photo");
    const vehicleId = formData.get("vehicleId");
    if (!(photo instanceof File)) throw new Error("photo is required");
    if (typeof vehicleId !== "string" || vehicleId === "") throw new Error("vehicleId is required");
    return { photo, vehicleId };
  })
  .handler(async ({ data }): Promise<{ ok: true; buildId: string; detected: DetectedVehicle } | Fail> => {
    const extension = ACCEPTED_TYPES[data.photo.type] as string | undefined;
    if (!extension) return fail("Please upload a JPG, PNG or WebP photo.");
    if (data.photo.size > MAX_PHOTO_BYTES) return fail("That photo is over 10 MB — try a smaller one.");
    if (!tryConsume(photoRules(requestIp()))) return fail("Too many uploads — try again in a bit.");

    const db = getDbCars();
    const vehicle = (await db.select({ id: vehicles.id }).from(vehicles).where(eq(vehicles.id, data.vehicleId))).at(0);
    if (!vehicle) return fail("Pick a vehicle first.");
    const user = await currentUser(); // before the upload: ownership is optional and must not waste it

    const id = crypto.randomUUID();
    const key = `uploads/${id}.${extension}`; // never the user's filename
    await uploadObject(BUCKETS.uploads, key, Buffer.from(await data.photo.arrayBuffer()), data.photo.type);

    let detection: Awaited<ReturnType<typeof detectVehicle>>;
    try {
      detection = await detectVehicle(await getPresignedReadUrl(BUCKETS.uploads, key));
    } catch (err) {
      await deleteObject(BUCKETS.uploads, key);
      throw err;
    }
    if (!detection.isValidVehicle) {
      await deleteObject(BUCKETS.uploads, key);
      return fail(detection.validationError ?? "We couldn't find a 4x4 in that photo — try another angle.");
    }

    const detected: DetectedVehicle = {
      make: detection.detectedMake,
      model: detection.detectedModel,
      color: detection.detectedColor,
    };
    await db.insert(builds).values({
      id,
      userId: user?.id ?? null,
      vehicleId: vehicle.id,
      originalImageKey: key,
      status: "draft",
      selectedPartIds: [],
      detectedVehicle: detected,
    });
    return { ok: true, buildId: id, detected };
  });

export const startBuild = createServerFn({ method: "POST" })
  .validator((input: { buildId?: string; vehicleId: string; partIds: string[] }) => {
    if (typeof input.vehicleId !== "string") throw new Error("vehicleId is required");
    if (input.buildId !== undefined && typeof input.buildId !== "string") throw new Error("invalid buildId");
    if (!Array.isArray(input.partIds) || !input.partIds.every((p) => typeof p === "string")) {
      throw new Error("partIds must be an array of strings");
    }
    return { buildId: input.buildId, vehicleId: input.vehicleId, partIds: [...new Set(input.partIds)] };
  })
  .handler(async ({ data }): Promise<{ ok: true; id: string } | Fail> => {
    if (data.partIds.length === 0 || data.partIds.length > MAX_PARTS) {
      return fail(`Pick between 1 and ${MAX_PARTS} upgrades.`);
    }
    const db = getDbCars();
    const vehicle = (await db.select().from(vehicles).where(eq(vehicles.id, data.vehicleId))).at(0);
    if (!vehicle) return fail("Unknown vehicle.");

    const selected = await db
      .select({ id: parts.id, vehicleIds: parts.vehicleIds })
      .from(parts)
      .where(inArray(parts.id, data.partIds));
    if (selected.length !== data.partIds.length || selected.some((p) => !p.vehicleIds.includes(vehicle.id))) {
      return fail("Some upgrades don't fit this vehicle — go back and re-check.");
    }

    const ip = requestIp();
    if (!tryConsume(renderRules(ip))) return fail("You've hit the render limit for now — try again in an hour.");

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const [{ value: rendersToday }] = await db
      .select({ value: count() })
      .from(builds)
      .where(and(gte(builds.createdAt, startOfDay), eq(builds.isCurated, false), ne(builds.status, "draft")));
    if (rendersToday >= DAILY_RENDER_CAP) {
      return fail("We're at capacity today — browse the gallery and check back tomorrow.");
    }

    // Spec 3 §3: every render is charged to a session user — a guest or an account.
    // PhotoStep creates a guest session first, so this is rare.
    const user = await currentUser();
    if (!user) return fail("Sign in to keep building.", "sign-in");

    // Resolve what to render before charging, so a bad request costs nothing.
    let target: { kind: "draft"; id: string } | { kind: "stock"; id: string; imageKey: string };
    if (data.buildId) {
      const draft = (
        await db
          .select({ userId: builds.userId })
          .from(builds)
          .where(and(eq(builds.id, data.buildId), eq(builds.status, "draft")))
      ).at(0);
      // Renders cost credits: only the caller's own draft (or an unowned one) may be started.
      if (!draft || (draft.userId !== null && draft.userId !== user.id)) {
        return fail("That photo expired — upload it again.");
      }
      target = { kind: "draft", id: data.buildId };
    } else {
      if (!vehicle.stockImageKey) return fail("No studio photo for this vehicle yet — upload your own.");
      target = { kind: "stock", id: crypto.randomUUID(), imageKey: vehicle.stockImageKey };
    }

    const gate = await chargeRender(user, target.id, ip);
    if (!gate.ok) return fail(gate.error, gate.action);

    try {
      if (target.kind === "draft") {
        const updated = await db
          .update(builds)
          .set({
            status: "processing",
            userId: user.id,
            charge: gate.charge,
            vehicleId: vehicle.id,
            selectedPartIds: data.partIds,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(builds.id, target.id),
              eq(builds.status, "draft"),
              or(isNull(builds.userId), eq(builds.userId, user.id)),
            ),
          )
          .returning({ id: builds.id });
        if (updated.length === 0) {
          await refundRender(user.id, gate.charge, target.id); // lost a race (double click, cleanup)
          return fail("That photo expired — upload it again.");
        }
      } else {
        await db.insert(builds).values({
          id: target.id,
          userId: user.id,
          charge: gate.charge,
          vehicleId: vehicle.id,
          originalImageKey: target.imageKey,
          status: "processing",
          selectedPartIds: data.partIds,
        });
      }
    } catch (err) {
      // The flip/insert threw, but it may still have committed (e.g. the response
      // was lost). If the row is `processing`, it holds the charge: fail it and let
      // refundFailedBuild (exactly-once) give it back. If no processing row
      // matched, the write never took, so the charge lives nowhere else and
      // refundRender is the only refund. If even that check fails we can't tell
      // which — refund nothing (a committed row is swept later) and log.
      try {
        if (!(await failProcessingBuild(target.id, "Generation failed — try again."))) {
          await refundRender(user.id, gate.charge, target.id);
        }
      } catch (refundErr) {
        console.error(
          `[builds] MANUAL REVIEW: start of build ${target.id} failed and its ${gate.charge} charge state is unknown`,
          refundErr,
        );
      }
      throw err;
    }

    void runGeneration(target.id); // intentionally not awaited — the build page polls getBuild
    return { ok: true, id: target.id };
  });

function validateSlugOrId(slugOrId: string): string {
  if (typeof slugOrId !== "string" || slugOrId.length > 100) throw new Error("invalid build id");
  return slugOrId;
}

/** Shared by the public page and the report. Throws notFound for missing/draft builds. */
async function loadBuild(slugOrId: string) {
  const db = getDbCars();
  let build = (await db.select().from(builds).where(or(eq(builds.slug, slugOrId), eq(builds.id, slugOrId)))).at(0);
  if (!build || build.status === "draft") throw notFound();

  if (build.status === "processing" && Date.now() - build.updatedAt.getTime() > STALE_PROCESSING_MS) {
    // A render lost to a restart: fail + refund — unless it finished meanwhile
    // (the guarded UPDATE matches nothing), in which case report the real row.
    await failProcessingBuild(build.id, TIMED_OUT_MESSAGE, new Date(Date.now() - STALE_PROCESSING_MS));
    build = (await db.select().from(builds).where(eq(builds.id, build.id))).at(0);
    if (!build) throw notFound();
  }
  const { status, errorMessage } = build;

  const vehicle = (await db.select().from(vehicles).where(eq(vehicles.id, build.vehicleId))).at(0);
  if (!vehicle) throw notFound();
  const preset = build.presetId
    ? (await db.select().from(presets).where(eq(presets.id, build.presetId))).at(0)
    : undefined;
  const buildParts = build.selectedPartIds.length
    ? await db.select().from(parts).where(inArray(parts.id, build.selectedPartIds))
    : [];

  return {
    build,
    parts: buildParts,
    view: {
      id: build.id,
      slug: build.slug,
      isCurated: build.isCurated,
      status,
      errorMessage,
      vehicle: { id: vehicle.id, name: vehicle.name },
      presetName: preset?.name ?? null,
      presetSlug: preset?.slug ?? null,
      selectedPartIds: build.selectedPartIds,
      beforeUrl: await originalImageUrl(build.originalImageKey),
      afterUrl: build.renderKey ? publicImageUrl(build.renderKey) : null,
    },
  };
}

/** Public build page: gated fields (per-part price, labor, fitment) are never sent. */
export const getBuild = createServerFn({ method: "GET" })
  .validator(validateSlugOrId)
  .handler(async ({ data: slugOrId }) => {
    const { view, parts: buildParts } = await loadBuild(slugOrId);
    return {
      ...view,
      parts: buildParts.map(toTeaserPart),
      estimatedTotalUsd: summarize(buildParts).totalUsd,
    };
  });

/** Spec 2 §3.5: account users only; owner's builds, or any curated build. */
export const getReport = createServerFn({ method: "GET" })
  .validator(validateSlugOrId)
  .handler(async ({ data: slugOrId }) => {
    const user = await accountUser();
    if (!user) throw redirect({ to: "/sign-in", search: { next: `/builds/${slugOrId}/report` } });

    const { build, view, parts: buildParts } = await loadBuild(slugOrId);
    if (!build.isCurated && build.userId !== user.id) throw notFound(); // don't reveal it exists
    if (view.status === "processing") throw redirect({ to: "/builds/$slug", params: { slug: slugOrId } });
    if (view.status !== "completed" || !view.afterUrl) throw notFound();

    return { ...view, afterUrl: view.afterUrl, parts: buildParts.map(toPublicPart) };
  });

export const getGallery = createServerFn({ method: "GET" }).handler(async () => {
  const db = getDbCars();
  const [curated, allParts, allVehicles, allPresets] = await Promise.all([
    db.select().from(builds).where(and(eq(builds.isCurated, true), eq(builds.status, "completed"))),
    db.select({ id: parts.id, priceUsd: parts.priceUsd, laborHoursEst: parts.laborHoursEst }).from(parts),
    db.select().from(vehicles).orderBy(asc(vehicles.sortOrder)),
    db.select().from(presets).orderBy(asc(presets.sortOrder)),
  ]);
  const partById = new Map(allParts.map((p) => [p.id, p]));
  const vehicleOrder = new Map(allVehicles.map((v, i) => [v.id, i]));
  const presetById = new Map(allPresets.map((p) => [p.id, p]));

  const gallery = await Promise.all(
    curated.flatMap((b) => {
      if (!b.slug || !b.renderKey) return [];
      const slug = b.slug;
      const renderKey = b.renderKey;
      const preset = b.presetId ? presetById.get(b.presetId) : undefined;
      const vehicle = allVehicles.find((v) => v.id === b.vehicleId);
      const priced = b.selectedPartIds.flatMap((id) => {
        const p = partById.get(id);
        return p ? [p] : [];
      });
      return [
        (async () => ({
          slug,
          vehicleId: b.vehicleId,
          vehicleName: vehicle?.name ?? "",
          presetName: preset?.name ?? "",
          presetSort: preset?.sortOrder ?? 0,
          partIds: b.selectedPartIds,
          totalUsd: summarize(priced).totalUsd,
          beforeUrl: await originalImageUrl(b.originalImageKey),
          afterUrl: publicImageUrl(renderKey),
        }))(),
      ];
    }),
  );

  gallery.sort(
    (a, b) =>
      (vehicleOrder.get(a.vehicleId) ?? 0) - (vehicleOrder.get(b.vehicleId) ?? 0) || a.presetSort - b.presetSort,
  );

  return {
    vehicles: allVehicles.map((v) => ({ id: v.id, name: v.name })),
    builds: gallery,
  };
});

export const getProjects = createServerFn({ method: "GET" }).handler(async () => {
  const user = await accountUser();
  if (!user) throw redirect({ to: "/sign-in", search: { next: "/projects" } });

  const rows = await getDbCars()
    .select({
      id: builds.id,
      status: builds.status,
      renderKey: builds.renderKey,
      createdAt: builds.createdAt,
      vehicleName: vehicles.name,
    })
    .from(builds)
    .innerJoin(vehicles, eq(vehicles.id, builds.vehicleId))
    .where(and(eq(builds.userId, user.id), ne(builds.status, "draft")))
    .orderBy(desc(builds.createdAt));

  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    vehicleName: r.vehicleName,
    createdAt: r.createdAt.toISOString(),
    thumbUrl: r.renderKey ? publicImageUrl(r.renderKey) : null,
  }));
});
