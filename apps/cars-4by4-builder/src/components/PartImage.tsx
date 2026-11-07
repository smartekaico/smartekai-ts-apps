import { cn } from "@/lib/utils";

const KNOWN_CATEGORIES = new Set(["armor", "wheels_tires", "overland", "suspension", "lighting"]);

export function PartImage({
  src,
  alt,
  category,
  kind,
  compact = false,
  className,
}: {
  src: string;
  alt: string;
  category?: string;
  kind?: "illustration" | "photo" | null;
  /** Small thumbnails: a short label, so it doesn't cover the picture. */
  compact?: boolean;
  className?: string;
}) {
  if (src) {
    return (
      <div className={cn("relative aspect-video w-full overflow-hidden", className)}>
        <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
        {kind === "illustration" ? (
          <span
            title="Illustration"
            className={cn(
              "absolute rounded bg-black/50 font-medium text-white",
              compact
                ? "bottom-0.5 right-0.5 px-1 text-[8px] leading-3"
                : "bottom-1 right-1 px-1.5 py-0.5 text-[10px] uppercase tracking-wide",
            )}
          >
            {compact ? "Illus." : "Illustration"}
          </span>
        ) : null}
      </div>
    );
  }
  const icon = category && KNOWN_CATEGORIES.has(category) ? `/parts/${category}.svg` : "/part-placeholder.svg";
  return <img src={icon} alt={alt} loading="lazy" className={cn("aspect-video w-full object-cover", className)} />;
}