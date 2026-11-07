import type { ConfiguratorData } from "@/lib/builds";
import { formatPrice } from "@/lib/pricing";
import { STUDIO_CROP } from "@/components/studio-photo";
import { cn } from "@/lib/utils";

type Preset = ConfiguratorData["presets"][number];

/**
 * Popular builds: the truck's presets as photo cards with a name and a total.
 * Replaces the text pills in the MVP (Spec 7 §2).
 */
export function PopularBuilds({
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
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Popular builds</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={activeSlug === p.slug}
            onClick={() => onPick(p)}
            className={cn(
              "overflow-hidden rounded-lg border bg-card text-left transition hover:-translate-y-0.5",
              activeSlug === p.slug ? "border-primary ring-2 ring-primary" : "border-border hover:border-primary/60",
            )}
          >
            {p.afterUrl ? (
              <img src={p.afterUrl} alt={p.name} className={`aspect-video w-full object-cover ${STUDIO_CROP}`} />
            ) : (
              <div aria-hidden className="aspect-video w-full bg-muted bg-texture" />
            )}
            <div className="flex items-baseline justify-between gap-2 p-3">
              <span className="font-semibold">{p.name}</span>
              <span className="text-xs font-bold text-muted-foreground">{formatPrice(p.totalUsd)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
