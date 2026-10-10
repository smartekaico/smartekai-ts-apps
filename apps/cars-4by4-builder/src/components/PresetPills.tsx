import type { ConfiguratorData } from "@/lib/builds";
import { cn } from "@/lib/utils";

type Preset = ConfiguratorData["presets"][number];

export function PresetPills({
  presets,
  activeSlug,
  onPick,
}: {
  presets: Preset[];
  activeSlug: string | undefined;
  onPick: (preset: Preset) => void;
}) {
  if (presets.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick start</span>
      {presets.map((p) => (
        <button
          key={p.id}
          type="button"
          aria-pressed={activeSlug === p.slug}
          onClick={() => onPick(p)}
          className={cn(
            "rounded-md border px-3 py-1.5 text-sm font-semibold",
            activeSlug === p.slug ? "border-primary text-primary" : "border-border hover:border-primary/60",
          )}
        >
          {p.name}
        </button>
      ))}
    </div>
  );
}
