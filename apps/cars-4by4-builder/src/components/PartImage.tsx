import { Disc, Shield, Tent, Waves, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CATEGORY_LABELS } from "@/lib/catalog";
import type { Category } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const CATEGORY_ICON: Record<Category, LucideIcon> = {
  armor: Shield,
  wheels_tires: Disc,
  overland: Tent,
  suspension: Waves,
  lighting: Zap,
};

/** Parts have no licensed photo yet (imageUrl ""), so fall back to a category tile. */
function PartPlaceholder({ category, className }: { category?: string; className?: string }) {
  const key = category as Category | undefined;
  const Icon = key ? CATEGORY_ICON[key] : undefined;
  const label = key ? CATEGORY_LABELS[key] : undefined;
  return (
    <div
      aria-hidden
      className={cn(
        "flex aspect-video w-full flex-col items-center justify-center gap-1 bg-muted bg-texture text-muted-foreground",
        className,
      )}
    >
      {Icon ? <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} /> : null}
      {label ? (
        <span className="max-w-full truncate px-1 text-[10px] font-medium uppercase tracking-wide">{label}</span>
      ) : null}
    </div>
  );
}

export function PartImage({
  src,
  alt,
  category,
  className,
}: {
  src: string;
  alt: string;
  category?: string;
  className?: string;
}) {
  if (src) return <img src={src} alt={alt} loading="lazy" className={cn("aspect-video w-full object-cover", className)} />;
  return <PartPlaceholder category={category} className={className} />;
}
