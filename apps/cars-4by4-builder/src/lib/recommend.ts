export type Use = "overland" | "trail" | "desert" | "daily";
export type Budget = "2k" | "5k" | "10k" | "any";
export type Lift = "stock" | "mild" | "big";
export type Install = "diy" | "shop";
export type Answers = { use?: Use; budget?: Budget; lift?: Lift; install?: Install };

type Slot =
  | "lift"
  | "shocks"
  | "tyres"
  | "wheels"
  | "rack"
  | "tent"
  | "awning"
  | "front"
  | "sides"
  | "under"
  | "lights"
  | "recovery"
  | "snorkel"
  | "bedcover";

export type RecommendPart = {
  id: string;
  priceUsd: string | number;
  fitmentDifficulty: string;
  vehicleIds: string[];
};

type Trait = {
  slot: Slot;
  scores: Record<Use, 0 | 1 | 2 | 3>;
  lift?: "mild" | "big";
  needsLift?: true;
};

const SHOCKS_LIFTS = new Set(["rough-country-6in-lift", "ome-bp51", "ironman-foam-cell"]);

export const PART_TRAITS: { [key: string]: Trait | undefined } = {
  "arb-summit-bullbar": { slot: "front", scores: { overland: 2, trail: 2, desert: 1, daily: 1 } },
  "arb-stealthbar": { slot: "front", scores: { overland: 1, trail: 1, desert: 2, daily: 1 } },
  "ironman-rock-sliders": { slot: "sides", scores: { overland: 1, trail: 3, desert: 2, daily: 0 } },
  "smittybilt-src": { slot: "sides", scores: { overland: 1, trail: 2, desert: 1, daily: 0 } },
  "arb-underbody-armor": { slot: "under", scores: { overland: 1, trail: 3, desert: 1, daily: 0 } },
  "method-beadlock-701": { slot: "wheels", scores: { overland: 1, trail: 2, desert: 3, daily: 0 } },
  "nitto-ridge-grappler-35": { slot: "tyres", scores: { overland: 2, trail: 2, desert: 3, daily: 0 }, needsLift: true },
  "bfg-km3-33": { slot: "tyres", scores: { overland: 3, trail: 3, desert: 1, daily: 0 } },
  "fuel-vector-wheels": { slot: "wheels", scores: { overland: 1, trail: 1, desert: 1, daily: 3 } },
  "frontrunner-slimline-ii": { slot: "rack", scores: { overland: 3, trail: 1, desert: 1, daily: 0 } },
  "arb-esperance-tent": { slot: "tent", scores: { overland: 3, trail: 1, desert: 1, daily: 0 } },
  "ironman-hardshell-tent": { slot: "tent", scores: { overland: 3, trail: 1, desert: 1, daily: 0 } },
  "arb-270-awning": { slot: "awning", scores: { overland: 3, trail: 1, desert: 2, daily: 0 } },
  "ome-bp51": { slot: "lift", scores: { overland: 3, trail: 2, desert: 2, daily: 1 }, lift: "mild" },
  "ironman-foam-cell": { slot: "lift", scores: { overland: 2, trail: 3, desert: 2, daily: 1 }, lift: "mild" },
  "rough-country-lift-kit": { slot: "lift", scores: { overland: 1, trail: 3, desert: 2, daily: 1 }, lift: "mild" },
  "bilstein-5100-shocks": { slot: "shocks", scores: { overland: 2, trail: 2, desert: 1, daily: 2 } },
  "rough-country-6in-lift": { slot: "lift", scores: { overland: 1, trail: 1, desert: 3, daily: 0 }, lift: "big" },
  "rigid-led-lightbar": { slot: "lights", scores: { overland: 1, trail: 1, desert: 3, daily: 0 } },
  "kc-hilites-cube": { slot: "lights", scores: { overland: 1, trail: 1, desert: 3, daily: 1 } },
  "ironman-snorkel": { slot: "snorkel", scores: { overland: 2, trail: 2, desert: 2, daily: 0 } },
  "warn-vr-evo-10s": { slot: "recovery", scores: { overland: 2, trail: 3, desert: 2, daily: 0 } },
  "leitner-acs-forged": { slot: "rack", scores: { overland: 3, trail: 1, desert: 1, daily: 0 } },
  "bakflip-mx4": { slot: "bedcover", scores: { overland: 1, trail: 0, desert: 0, daily: 3 } },
};

const CEILING: Record<Budget, number> = {
  "2k": 2000,
  "5k": 5000,
  "10k": 10000,
  any: Infinity,
};

const USE_LABEL: Record<Use, string> = {
  overland: "Overlanding pick",
  trail: "Trail pick",
  desert: "Desert pick",
  daily: "Daily driver pick",
};

const BUDGET_LABEL: Record<Budget, string> = {
  "2k": "under $2k",
  "5k": "within $2–5k",
  "10k": "within $5–10k",
  any: "no budget limit",
};

function isFabrication(part: RecommendPart) {
  return part.fitmentDifficulty === "Custom Fabrication";
}

function priceOf(p: RecommendPart) {
  return Number(p.priceUsd);
}

function scoreOf(trait: Trait, answers: Answers): number {
  const use = answers.use;
  if (use) return trait.scores[use];
  const vals = Object.values(trait.scores) as number[];
  return vals.reduce((a, b) => a + b, 0) / 4;
}

export function recommend(
  answers: Answers,
  parts: RecommendPart[],
  vehicleId: string,
): { partIds: string[]; reasons: Record<string, string> } {
  const candidates: Array<{ part: RecommendPart; trait: Trait; score: number }> = [];
  for (const part of parts) {
    if (!part.vehicleIds.includes(vehicleId)) continue;
    const trait = PART_TRAITS[part.id];
    if (!trait) throw new Error(`Missing PART_TRAITS entry for ${part.id}`);
    const lift = answers.lift;
    if (trait.lift && lift === "stock") continue;
    if (trait.lift === "big" && lift === "mild") continue;
    if (trait.needsLift && lift === "stock") continue;
    if (isFabrication(part) && answers.install === "diy") continue;
    candidates.push({ part, trait, score: scoreOf(trait, answers) });
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const pa = priceOf(a.part);
    const pb = priceOf(b.part);
    if (pa !== pb) return pa - pb;
    return a.part.id < b.part.id ? -1 : a.part.id > b.part.id ? 1 : 0;
  });

  const rackExists = candidates.some((c) => c.trait.slot === "rack");
  const picked: Array<{ part: RecommendPart; trait: Trait; score: number }> = [];
  const slotFilled = new Set<Slot>();

  const liftCandidates = candidates.filter((c) => c.trait.slot === "lift");
  let liftPicked: { part: RecommendPart; trait: Trait; score: number } | null = null;
  if (liftCandidates.length > 0) {
    let pool = liftCandidates;
    if (answers.lift === "big") {
      const bigs = liftCandidates.filter((c) => c.trait.lift === "big");
      if (bigs.length > 0) pool = bigs;
    }
    liftPicked = pool[0];
    picked.push(liftPicked);
    slotFilled.add("lift");
  }

  for (const c of candidates) {
    if (c.trait.slot === "lift") continue;
    if (slotFilled.has(c.trait.slot)) continue;
    if (c.trait.needsLift && !liftPicked) continue;
    if (c.trait.slot === "shocks" && liftPicked && SHOCKS_LIFTS.has(liftPicked.part.id)) continue;
    if (c.trait.slot === "tent") {
      if (rackExists && !slotFilled.has("rack")) continue;
    }
    picked.push(c);
    slotFilled.add(c.trait.slot);
  }

  picked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const pa = priceOf(a.part);
    const pb = priceOf(b.part);
    if (pa !== pb) return pa - pb;
    return a.part.id < b.part.id ? -1 : a.part.id > b.part.id ? 1 : 0;
  });

  const ceiling = answers.budget ? CEILING[answers.budget] : Infinity;
  const final: Array<{ part: RecommendPart; trait: Trait }> = [];
  let total = 0;
  for (const c of picked) {
    const p = priceOf(c.part);
    if (final.length >= 12) break;
    if (total + p <= ceiling) {
      final.push({ part: c.part, trait: c.trait });
      total += p;
    }
  }

  const reasons: Record<string, string> = {};
  for (const { part, trait } of final) {
    const frags: string[] = [];
    if (answers.use) frags.push(USE_LABEL[answers.use]);
    if (answers.budget) frags.push(BUDGET_LABEL[answers.budget]);
    if (trait.lift === "big") frags.push("Big lift");
    else if (trait.lift === "mild" && answers.lift && answers.lift !== "stock") frags.push("Mild lift");
    if (answers.install === "diy") frags.push("DIY bolt-on");
    if (trait.needsLift) frags.push("Needs a lift");
    if (frags.length === 0) frags.push("Recommended");
    reasons[part.id] = frags.join(" · ");
  }

  return { partIds: final.map((f) => f.part.id), reasons };
}

/**
 * The preset whose parts overlap most with the given parts (Spec 7 §2).
 * Score = shared parts / union of parts; ties go to the first preset. Pure.
 */
export function closestPreset<T extends { partIds: string[] }>(
  presets: T[],
  partIds: string[],
): T | null {
  if (presets.length === 0 || partIds.length === 0) return null;
  const chosen = new Set(partIds);
  let best: T | null = null;
  let bestScore = 0;
  for (const preset of presets) {
    const presetParts = new Set(preset.partIds);
    let shared = 0;
    for (const id of chosen) if (presetParts.has(id)) shared++;
    const union = new Set([...chosen, ...presetParts]).size;
    const score = union === 0 ? 0 : shared / union;
    if (score > bestScore) {
      bestScore = score;
      best = preset;
    }
  }
  return best;
}
