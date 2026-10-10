export const CATEGORIES = ["armor", "wheels_tires", "overland", "suspension", "lighting"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  armor: "Armor",
  wheels_tires: "Wheels & Tires",
  overland: "Overland",
  suspension: "Suspension",
  lighting: "Lighting & Recovery",
};

export const MAX_PARTS = 12;

export const FITMENT_BADGES: Record<string, { label: string; tone: "ok" | "warn" | "hard" }> = {
  "Direct Bolt-On": { label: "Bolt-on", tone: "ok" },
  "Minor Trimming": { label: "Trimming", tone: "warn" },
  "Custom Fabrication": { label: "Fabrication", tone: "hard" },
};