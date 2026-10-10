import type { ConfiguratorData } from "@/lib/builds";

type Vehicle = ConfiguratorData["vehicles"][number];

export function VehiclePicker({ vehicles, onPick }: { vehicles: Vehicle[]; onPick: (id: string) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {vehicles.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => onPick(v.id)}
          className="overflow-hidden rounded-lg border border-border bg-card text-left transition hover:-translate-y-0.5 hover:border-primary"
        >
          {v.stockImageUrl ? (
            <img src={v.stockImageUrl} alt={v.name} className="aspect-video w-full object-cover" />
          ) : (
            <div aria-hidden className="aspect-video w-full bg-muted bg-texture" />
          )}
          <div className="flex items-center justify-between p-4">
            <span className="text-lg font-extrabold tracking-tight">{v.name}</span>
            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">{v.yearRange}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
