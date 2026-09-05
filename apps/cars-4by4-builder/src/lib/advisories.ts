type Part = { category: string; fitmentDifficulty: string; name: string };

export type Advisory = { type: "warning" | "info"; message: string };

const CATEGORY_ADVISORIES: Record<string, string> = {
  front_bumper: "Adding front-mounted armor shifts weight forward — a heavy-duty front spring upgrade is commonly paired with this to restore ride height.",
  wheels_tires: "Larger tires may require a lift kit or wheel spacers to clear the fenders/cab mounts at full steering lock.",
  roof_tent: "Roof-mounted gear raises the center of gravity — drive conservatively at highway speed and in crosswinds.",
  lift_kit: "Suspension changes can affect factory alignment and headlight aim — a post-install alignment is recommended.",
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