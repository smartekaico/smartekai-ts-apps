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
      {/* Phones: a swipeable row of smaller cards, so the parts aren't pushed two screens down. */}
      <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={activeSlug === p.slug}
            onClick={() => onPick(p)}
            className={cn(
              "w-[68%] shrink-0 snap-start overflow-hidden rounded-lg border bg-card text-left transition hover:-translate-y-0.5 sm:w-auto",
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
