import { eq } from "drizzle-orm";
import { generateStudioImage } from "@smartekai/ai";
import { getDbCars, parts } from "@smartekai/db/cars";
import { BUCKETS, MUTABLE_PUBLIC_CACHE, uploadObject } from "@smartekai/storage";

// Generic descriptions only — no brand names, logos or text, so the model does
// not invent a logo. Missing entry → throw (no silent fallback to the brand).
const SUBJECTS: Record<string, string> = {
  "arb-summit-bullbar": "a heavy-duty steel front bull bar with integrated recovery points and round driving lights",
  "arb-stealthbar": "a low-profile stealth front bumper with integrated fog lights",
  "ironman-rock-sliders": "steel rock sliders along the rocker panels of an SUV",
  "smittybilt-src": "textured black tubular side armor bars along the rocker panels",
  "arb-underbody-armor": "a visible steel skid plate beneath the front bumper",
  "method-beadlock-701": "a bronze 17-inch beadlock-style wheel with visible bolt rings",
  "nitto-ridge-grappler-35": "a single 35-inch aggressive hybrid all-terrain mud-terrain tyre, side view",
  "bfg-km3-33": "a single 33-inch mud-terrain tyre with large tread blocks, side view",
  "fuel-vector-wheels": "a matte black 18-inch off-road wheel with a deep concave face",
  "frontrunner-slimline-ii": "a slim black aluminum platform roof rack",
  "arb-esperance-tent": "a closed grey hard-shell rooftop tent, low profile clamshell",
  "ironman-hardshell-tent": "a low-profile black hard-shell rooftop tent",
  "arb-270-awning": "a rolled-up 270-degree awning bag mounted along a roof rack",
  "ome-bp51": "a pair of remote-reservoir off-road shock absorbers with coil springs",
  "ironman-foam-cell": "a pair of foam-cell off-road shock absorbers with coil springs",
  "rough-country-lift-kit": "a suspension lift kit with coil springs and shocks",
  "bilstein-5100-shocks": "a pair of yellow-bodied monotube off-road shock absorbers",
  "rigid-led-lightbar": "a 40-inch straight black off-road LED light bar with mounting brackets",
  "kc-hilites-cube": "a pair of small square LED pod lights on A-pillar mounts",
  "ironman-snorkel": "a black safari snorkel running up the A-pillar to the roofline",
  "warn-vr-evo-10s": "a black recovery winch mounted at the front centre of a bumper",
  "leitner-acs-forged": "a black aluminum bed rack over a pickup truck bed, rising to cab height",
  "bakflip-mx4": "a hard folding pickup truck bed cover, partly folded, matte black",
  "rough-country-6in-lift": "a tall lift kit with lifted knuckles and fabricated crossmembers",
};

const STYLE = "Isolated product photograph on a seamless light-grey studio background, soft even lighting, three-quarter view, centred, whole product in frame. No logos, no brand names, no text, no people.";

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const ids = args.filter((a) => a !== "--force");
  const db = getDbCars();

  let targets: { id: string; imageUrl: string }[];
  if (ids.length > 0) {
    targets = [];
    for (const id of ids) {
      const r = (await db.select({ id: parts.id, imageUrl: parts.imageUrl }).from(parts).where(eq(parts.id, id))).at(0);
      if (!r) throw new Error(`unknown part: ${id}`);
      if (!force && r.imageUrl) {
        console.log(`skip ${id}: already has an image (use --force to regenerate)`);
        continue;
      }
      targets.push(r);
    }
  } else {
    const rows = await db.select({ id: parts.id, imageUrl: parts.imageUrl }).from(parts);
    targets = rows.filter((r) => !r.imageUrl);
  }

  if (targets.length === 0) {
    console.log("nothing to do");
    return;
  }

  for (const t of targets) {
    const subject = SUBJECTS[t.id];
    if (!subject) throw new Error(`no SUBJECTS entry for ${t.id}`);
    console.log(`generate parts/${t.id}…`);
    const image = await generateStudioImage(`${subject}. ${STYLE}`);
    const extension = image.mediaType.split("/")[1] || "png";
    const key = `parts/${t.id}.${extension}`;
    await uploadObject(BUCKETS.renders, key, Buffer.from(image.data), image.mediaType, MUTABLE_PUBLIC_CACHE);
    await db.update(parts).set({ imageUrl: key }).where(eq(parts.id, t.id));
    console.log(`  → ${key}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});