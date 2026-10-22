import { seedParts } from "./parts";

type PresetKey = "overlander" | "dune" | "trail";

const SUV_PRESET_PARTS: Record<PresetKey, string[]> = {
  overlander: ["frontrunner-slimline-ii", "arb-esperance-tent", "arb-270-awning", "arb-summit-bullbar", "bfg-km3-33", "ome-bp51"],
  dune: ["arb-stealthbar", "method-beadlock-701", "nitto-ridge-grappler-35", "rough-country-lift-kit", "kc-hilites-cube"],
  trail: ["ironman-rock-sliders", "arb-underbody-armor", "bfg-km3-33", "ironman-foam-cell", "warn-vr-evo-10s", "ironman-snorkel"],
};

const TRUCK_PRESET_PARTS: Record<PresetKey, string[]> = {
  overlander: ["leitner-acs-forged", "arb-esperance-tent", "bfg-km3-33", "fuel-vector-wheels", "bilstein-5100-shocks"],
  dune: ["rough-country-6in-lift", "method-beadlock-701", "nitto-ridge-grappler-35", "rigid-led-lightbar", "kc-hilites-cube"],
  trail: ["rough-country-lift-kit", "bfg-km3-33", "warn-vr-evo-10s", "rigid-led-lightbar", "bakflip-mx4"],
};

const PRESET_NAMES: Record<PresetKey, string> = { overlander: "Overlander", dune: "Desert / Dune", trail: "Trail" };

const TRUCKS = ["f150", "silverado-1500", "sierra-1500"];

// Preset ids and slugs keep the `${vehicleId}-${key}` / `${vehicleSlug}-${key}`
// pattern so a preset URL stays stable per vehicle.
const VEHICLE_SLUGS: Record<string, string> = {
  lc300: "land-cruiser",
  "patrol-y62": "patrol",
  "wrangler-jl": "wrangler",
  f150: "f-150",
  "silverado-1500": "silverado",
  "sierra-1500": "sierra",
};

const FITMENT = new Map(seedParts.map((part) => [part.id, part.vehicleIds] as const));

export const seedPresets = Object.entries(VEHICLE_SLUGS).flatMap(([vehicleId, vehicleSlug]) => {
  const parts = TRUCKS.includes(vehicleId) ? TRUCK_PRESET_PARTS : SUV_PRESET_PARTS;
  return (Object.keys(parts) as PresetKey[]).map((key, i) => {
    const partIds = parts[key];
    // A preset that contains a part which does not fit its vehicle would ship a
    // build the configurator then refuses to price (lib/builds.ts ignores
    // mismatched parts), so fail at seed time instead.
    for (const partId of partIds) {
      const fits = FITMENT.get(partId);
      if (!fits) throw new Error(`preset ${vehicleId}-${key}: unknown part "${partId}"`);
      if (!fits.includes(vehicleId)) throw new Error(`preset ${vehicleId}-${key}: "${partId}" does not fit ${vehicleId}`);
    }
    return {
      id: `${vehicleId}-${key}`,
      slug: `${vehicleSlug}-${key}`,
      vehicleId,
      name: PRESET_NAMES[key],
      partIds,
      sortOrder: i + 1,
    };
  });
});
