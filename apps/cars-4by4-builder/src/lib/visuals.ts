// Pure scene description for the 3D preview. No `three` import — this module is
// safe to evaluate on the server and is checked by unit-style spot checks.

export type BodyKind = "pickup" | "suv";

export type VehicleShape = {
  body: BodyKind;
  length: number; // metres
  wheelbase: number;
  width: number;
  height: number;
  bedLength?: number; // pickups only
  colour: string; // hex
};

export type PartVisual =
  | { kind: "lift"; inches: number }
  | { kind: "tyre"; inches: 33 | 35 }
  | { kind: "wheel"; style: "fuel" | "method" }
  | { kind: "lightbar" }
  | { kind: "pods" }
  | { kind: "roofRack" }
  | { kind: "bedRack" }
  | { kind: "tent" }
  | { kind: "awning" }
  | { kind: "bumper" }
  | { kind: "stealthbar" }
  | { kind: "winch" }
  | { kind: "snorkel" }
  | { kind: "sliders" }
  | { kind: "skid" }
  | { kind: "tonneau" };

export type AccessoryKind =
  | "lightbar"
  | "pods"
  | "roofRack"
  | "bedRack"
  | "tent"
  | "awning"
  | "bumper"
  | "stealthbar"
  | "winch"
  | "snorkel"
  | "sliders"
  | "skid"
  | "tonneau";

export type SceneSpec = {
  shape: VehicleShape;
  liftInches: number;
  tyreInches: 31 | 33 | 35;
  wheel: "stock" | "fuel" | "method";
  accessories: Set<AccessoryKind>;
  rackFor: "roof" | "bed" | null;
};

export const VEHICLE_SHAPES: Record<string, VehicleShape> = {
  lc300: { body: "suv", length: 5.0, wheelbase: 2.85, width: 1.98, height: 1.95, colour: "#d4d4d8" },
  "patrol-y62": { body: "suv", length: 5.2, wheelbase: 3.08, width: 1.99, height: 1.94, colour: "#cbd5e1" },
  "wrangler-jl": { body: "suv", length: 4.9, wheelbase: 3.0, width: 1.89, height: 1.84, colour: "#fca5a5" },
  f150: { body: "pickup", length: 5.9, wheelbase: 3.7, width: 2.03, height: 1.96, bedLength: 1.7, colour: "#93c5fd" },
  "silverado-1500": { body: "pickup", length: 5.8, wheelbase: 3.75, width: 2.04, height: 1.93, bedLength: 1.75, colour: "#fecaca" },
  "sierra-1500": { body: "pickup", length: 5.8, wheelbase: 3.75, width: 2.04, height: 1.93, bedLength: 1.75, colour: "#bbf7d0" },
  "tacoma-3g": { body: "pickup", length: 5.4, wheelbase: 3.24, width: 1.9, height: 1.78, bedLength: 1.5, colour: "#fed7aa" },
};

export const PART_VISUALS: Record<string, PartVisual> = {
  "arb-summit-bullbar": { kind: "bumper" },
  "arb-stealthbar": { kind: "stealthbar" },
  "ironman-rock-sliders": { kind: "sliders" },
  "arb-underbody-armor": { kind: "skid" },
  "method-beadlock-701": { kind: "wheel", style: "method" },
  "nitto-ridge-grappler-35": { kind: "tyre", inches: 35 },
  "bfg-km3-33": { kind: "tyre", inches: 33 },
  "fuel-vector-wheels": { kind: "wheel", style: "fuel" },
  "frontrunner-slimline-ii": { kind: "roofRack" },
  "arb-esperance-tent": { kind: "tent" },
  "ironman-hardshell-tent": { kind: "tent" },
  "arb-270-awning": { kind: "awning" },
  "ome-bp51": { kind: "lift", inches: 2 },
  "ironman-foam-cell": { kind: "lift", inches: 2 },
  "rough-country-lift-kit": { kind: "lift", inches: 2.5 },
  "bilstein-5100-shocks": { kind: "lift", inches: 1 },
  "rigid-led-lightbar": { kind: "lightbar" },
  "kc-hilites-cube": { kind: "pods" },
  "ironman-snorkel": { kind: "snorkel" },
  "warn-vr-evo-10s": { kind: "winch" },
  "leitner-acs-forged": { kind: "bedRack" },
  "bakflip-mx4": { kind: "tonneau" },
  "rough-country-6in-lift": { kind: "lift", inches: 6 },
};

export function sceneSpec(vehicleId: string, partIds: string[]): SceneSpec | null {
  const shape = VEHICLE_SHAPES[vehicleId] as VehicleShape | undefined;
  if (!shape) return null;
  let liftInches = 0;
  let tyreInches: 31 | 33 | 35 = 31;
  let wheel: "stock" | "fuel" | "method" = "stock";
  const accessories = new Set<AccessoryKind>();
  for (const id of partIds) {
    const v = PART_VISUALS[id] as PartVisual | undefined;
    if (!v) continue;
    if (v.kind === "lift") liftInches = Math.max(liftInches, v.inches);
    else if (v.kind === "tyre") tyreInches = Math.max(tyreInches, v.inches) as 33 | 35;
    else if (v.kind === "wheel") wheel = v.style;
    else accessories.add(v.kind);
  }
  // tent implies a rack
  let rackFor: "roof" | "bed" | null = accessories.has("roofRack")
    ? "roof"
    : accessories.has("bedRack")
      ? "bed"
      : null;
  if (accessories.has("tent") && !rackFor) {
    rackFor = shape.body === "pickup" ? "bed" : "roof";
    if (shape.body === "pickup") accessories.add("bedRack");
    else accessories.add("roofRack");
  }
  // tonneau ignored on SUVs
  if (shape.body === "suv") accessories.delete("tonneau");
  // bedRack ignored on SUVs
  if (shape.body === "suv") accessories.delete("bedRack");
  return { shape, liftInches, tyreInches, wheel, accessories, rackFor };
}