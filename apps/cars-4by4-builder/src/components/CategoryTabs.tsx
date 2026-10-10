import { CATEGORIES, CATEGORY_LABELS } from "@/lib/catalog";
import type { Category } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export function CategoryTabs({
  active,
  onChange,
}: {
  active: Category | "all";
  onChange: (next: Category | "all") => void;
}) {
  const tabs: Array<{ id: Category | "all"; label: string }> = [
    { id: "all", label: "All" },
    ...CATEGORIES.map((c) => ({ id: c, label: CATEGORY_LABELS[c] })),
  ];
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-pressed={active === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold",
            active === t.id ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/60",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
