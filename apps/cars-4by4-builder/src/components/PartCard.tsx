import type { PublicPart } from "@/lib/builds";
import { formatPrice } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { FitmentBadge } from "@/components/FitmentBadge";
import { PartImage } from "@/components/PartImage";

export function PartCard({
  part,
  selected,
  disabled,
  onToggle,
}: {
  part: PublicPart;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled && !selected}
      aria-pressed={selected}
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition",
        selected ? "-translate-y-0.5 shadow-lg shadow-primary/10 ring-2 ring-primary" : "hover:border-primary/50",
        disabled && !selected && "opacity-50",
      )}
    >
      <PartImage src={part.imageUrl} alt={part.name} />
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-sm font-semibold leading-tight">{part.name}</p>
        <p className="text-xs text-muted-foreground">{part.brand}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="text-sm font-bold">{formatPrice(Number(part.priceUsd))}</span>
          <FitmentBadge difficulty={part.fitmentDifficulty} />
        </div>
      </div>
    </button>
  );
}
