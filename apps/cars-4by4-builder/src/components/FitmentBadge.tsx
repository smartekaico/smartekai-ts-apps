import { FITMENT_BADGES } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const TONES = {
  ok: "border-emerald-500/40 text-emerald-400",
  warn: "border-primary/50 text-primary",
  hard: "border-destructive/50 text-destructive",
};

export function FitmentBadge({ difficulty }: { difficulty: string }) {
  const badge = FITMENT_BADGES[difficulty] ?? { label: difficulty, tone: "warn" as const };
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", TONES[badge.tone])}>
      {badge.label}
    </span>
  );
}
