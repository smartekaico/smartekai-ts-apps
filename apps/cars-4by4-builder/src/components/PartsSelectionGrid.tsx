import { useState } from "react";
import { Card, Button } from "@smartekai/ui";
import { cn } from "@/lib/utils";

type Part = {
  id: string;
  name: string;
  category: string;
  brand: string;
  priceUsd: string;
  imageUrl: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  front_bumper: "🛡️ Armor & Protection",
  wheels_tires: "🛞 Wheels & Tires",
  roof_tent: "⛺ Overlanding & Roof Gear",
  lighting: "💡 Off-Road Lighting & Extras",
  lift_kit: "🔧 Suspension & Lift",
};

export function PartsSelectionGrid({
  parts,
  selected,
  onChange,
}: {
  parts: Part[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const categories = Array.from(new Set(parts.map((p) => p.category)));
  const visible = activeCategory ? parts.filter((p) => p.category === activeCategory) : parts;

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1">
        <Button size="sm" variant={activeCategory === null ? "default" : "ghost"} onClick={() => setActiveCategory(null)}>
          All
        </Button>
        {categories.map((c) => (
          <Button key={c} size="sm" variant={activeCategory === c ? "default" : "ghost"} onClick={() => setActiveCategory(c)}>
            {CATEGORY_LABELS[c] ?? c}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {visible.map((part) => {
          const isSelected = selected.includes(part.id);
          return (
            <Card
              key={part.id}
              onClick={() => toggle(part.id)}
              className={cn("cursor-pointer p-3", isSelected && "ring-2 ring-primary")}
            >
              <p className="text-sm font-medium">{part.name}</p>
              <p className="text-xs text-muted-foreground">{part.brand}</p>
              <p className="mt-1 text-sm">${part.priceUsd}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}