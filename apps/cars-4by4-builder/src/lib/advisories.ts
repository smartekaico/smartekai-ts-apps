type Part = { category: string; fitmentDifficulty: string; name: string };

export type Advisory = { type: "warning" | "info"; message: string };

const CATEGORY_ADVISORIES: Record<string, string> = {
  armor: "Front armor adds weight over the front axle — a heavier-rate front spring is commonly paired with it to keep ride height.",
  wheels_tires: "Larger tires may need a lift or trimming to clear at full steering lock.",
  overland: "Roof-mounted gear raises the center of gravity — drive conservatively at highway speed and in crosswinds.",
  suspension: "Suspension changes affect alignment and headlight aim — book an alignment after install.",
  lighting: "Auxiliary lights may need to be covered or switched off on public roads — check your local rules.",
};

export function getAdvisories(parts: Part[]): Advisory[] {
  const seenCategories = new Set<string>();
  const advisories: Advisory[] = [];

  for (const part of parts) {
    if (seenCategories.has(part.category)) continue;
    seenCategories.add(part.category);
    const message = CATEGORY_ADVISORIES[part.category];
    if (message) advisories.push({ type: "warning", message });
  }

  const customFab = parts.filter((p) => p.fitmentDifficulty === "Custom Fabrication");
  if (customFab.length > 0) {
    advisories.push({
      type: "info",
      message: `${customFab.map((p) => p.name).join(", ")} require${customFab.length === 1 ? "s" : ""} custom fabrication — budget extra shop time beyond the labor estimate.`,
    });
  }

  return advisories;
}