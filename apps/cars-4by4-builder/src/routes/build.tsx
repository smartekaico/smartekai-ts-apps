import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getConfigurator } from "@/lib/builds";
import { MAX_PARTS } from "@/lib/catalog";
import type { Category } from "@/lib/catalog";
import { summarize } from "@/lib/pricing";
import { BuildFooter } from "@/components/BuildFooter";
import { CategoryTabs } from "@/components/CategoryTabs";
import { PartCard } from "@/components/PartCard";
import { PhotoStep } from "@/components/PhotoStep";
import { PresetPills } from "@/components/PresetPills";
import { VehiclePicker } from "@/components/VehiclePicker";

type Step = "vehicle" | "parts" | "photo";
type BuildSearch = { vehicle?: string; preset?: string; parts?: string[]; step?: Step };
const STEPS: Step[] = ["vehicle", "parts", "photo"];

export const Route = createFileRoute("/build")({
  validateSearch: (search: Record<string, unknown>): BuildSearch => ({
    vehicle: typeof search.vehicle === "string" ? search.vehicle : undefined,
    preset: typeof search.preset === "string" ? search.preset : undefined,
    parts: Array.isArray(search.parts)
      ? search.parts.filter((p): p is string => typeof p === "string").slice(0, MAX_PARTS)
      : undefined,
    step: STEPS.find((s) => s === search.step),
  }),
  loader: () => getConfigurator(),
  head: () => ({ meta: [{ title: "Build your 4x4 | 4x4 Builder" }] }),
  component: Configurator,
});

function Configurator() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/build" });
  const [category, setCategory] = useState<Category | "all">("all");

  const vehicle = data.vehicles.find((v) => v.id === search.vehicle);
  const step: Step = !vehicle || search.step === "vehicle" ? "vehicle" : (search.step ?? "parts");
  const selected = search.parts ?? [];
  const fitting = vehicle ? data.parts.filter((p) => p.vehicleIds.includes(vehicle.id)) : [];
  const selectedParts = fitting.filter((p) => selected.includes(p.id));
  const visible = category === "all" ? fitting : fitting.filter((p) => p.category === category);
  const { totalUsd } = summarize(selectedParts);

  function update(next: BuildSearch, replace = false) {
    void navigate({ search: (prev) => ({ ...prev, ...next }), replace });
  }

  function toggle(id: string) {
    const next = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
    update({ parts: next, preset: undefined }, true);
  }

  return (
    <>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Step {STEPS.indexOf(step) + 1} of 3{vehicle ? ` · ${vehicle.name}` : ""}
        </p>

        {step === "vehicle" && (
          <>
            <h1 className="mt-1 text-3xl">Pick your truck</h1>
            <div className="mt-6">
              <VehiclePicker
                vehicles={data.vehicles}
                onPick={(id) => update({ vehicle: id, parts: [], preset: undefined, step: "parts" })}
              />
            </div>
          </>
        )}

        {step === "parts" && vehicle && (
          <>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
              <h1 className="text-3xl">Choose your upgrades</h1>
              <button type="button" onClick={() => update({ step: "vehicle" })} className="text-sm text-primary">
                Change truck
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-4">
              <PresetPills
                presets={data.presets.filter((p) => p.vehicleId === vehicle.id)}
                activeSlug={search.preset}
                onPick={(p) => update({ preset: p.slug, parts: p.partIds }, true)}
              />
              <CategoryTabs active={category} onChange={setCategory} />
            </div>
            {selected.length >= MAX_PARTS && (
              <p className="mt-3 text-sm text-muted-foreground">That's the max of {MAX_PARTS} upgrades per build.</p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {visible.map((part) => (
                <PartCard
                  key={part.id}
                  part={part}
                  region={data.region}
                  selected={selected.includes(part.id)}
                  disabled={selected.length >= MAX_PARTS}
                  onToggle={() => toggle(part.id)}
                />
              ))}
            </div>
          </>
        )}

        {step === "photo" && vehicle && (
          <>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
              <h1 className="text-3xl">Add your truck</h1>
              <button type="button" onClick={() => update({ step: "parts" })} className="text-sm text-primary">
                Back to upgrades
              </button>
            </div>
            <div className="mt-6 max-w-2xl">
              <PhotoStep vehicle={vehicle} partIds={selectedParts.map((p) => p.id)} />
            </div>
          </>
        )}
      </main>

      {step !== "vehicle" && (
        <BuildFooter
          count={selectedParts.length}
          totalUsd={totalUsd}
          region={data.region}
          nextLabel={step === "parts" ? "Next: add your truck" : undefined}
          onNext={step === "parts" ? () => update({ step: "photo" }) : undefined}
        />
      )}
    </>
  );
}
