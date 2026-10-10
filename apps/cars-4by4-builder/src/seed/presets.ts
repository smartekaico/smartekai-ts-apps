const PRESET_PARTS = {
  overlander: ["frontrunner-slimline-ii", "arb-esperance-tent", "arb-270-awning", "arb-summit-bullbar", "bfg-km3-33", "ome-bp51"],
  dune: ["arb-stealthbar", "method-beadlock-701", "nitto-ridge-grappler-35", "rough-country-lift-kit", "kc-hilites-cube"],
  trail: ["ironman-rock-sliders", "arb-underbody-armor", "bfg-km3-33", "ironman-foam-cell", "warn-vr-evo-10s", "ironman-snorkel"],
};

const PRESET_NAMES = { overlander: "Overlander", dune: "Desert / Dune", trail: "Trail" };

const VEHICLE_SLUGS = { lc300: "land-cruiser", "patrol-y62": "patrol", "wrangler-jl": "wrangler" };

export const seedPresets = Object.entries(VEHICLE_SLUGS).flatMap(([vehicleId, vehicleSlug]) =>
  (Object.keys(PRESET_PARTS) as Array<keyof typeof PRESET_PARTS>).map((key, i) => ({
    id: `${vehicleId}-${key}`,
    slug: `${vehicleSlug}-${key}`,
    vehicleId,
    name: PRESET_NAMES[key],
    partIds: PRESET_PARTS[key],
    sortOrder: i + 1,
  })),
);
