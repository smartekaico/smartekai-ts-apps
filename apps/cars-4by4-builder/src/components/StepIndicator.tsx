import { cn } from "@/lib/utils";
import { AI_RENDERS_ENABLED } from "@/lib/features";

const STEPS = AI_RENDERS_ENABLED
  ? ([
      { id: "vehicle", label: "Your truck" },
      { id: "parts", label: "Your build" },
      { id: "review", label: "See it" },
    ] as const)
  : ([
      { id: "vehicle", label: "Your truck" },
      { id: "parts", label: "Your build" },
      { id: "list", label: "Your parts list" },
    ] as const);

export function StepIndicator({
  current,
  onGo,
}: {
  current: string;
  onGo: (step: string) => void;
}) {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <span key={s.id} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden>/</span>}
            {done ? (
              <button type="button" onClick={() => onGo(s.id)} className="text-primary hover:underline">
                {i + 1} {s.label}
              </button>
            ) : (
              <span className={cn(active ? "text-foreground" : "text-muted-foreground/60")}>
                {i + 1} {s.label}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}