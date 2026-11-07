import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getConfigurator } from "@/lib/builds";
import { pageMeta } from "@/lib/seo";
import { MAX_PARTS } from "@/lib/catalog";
import type { Category } from "@/lib/catalog";
import { recommend } from "@/lib/recommend";
import type { Answers, Budget, Install, Lift, Use } from "@/lib/recommend";
import { summarize } from "@/lib/pricing";
import { BuildFooter } from "@/components/BuildFooter";
import { BuildPreview3D } from "@/components/BuildPreview3D";
import { CategoryTabs } from "@/components/CategoryTabs";
import { HelpMeChoose } from "@/components/HelpMeChoose";
import { Panel } from "@/components/Panel";
import { PartCard } from "@/components/PartCard";
import { PresetPills } from "@/components/PresetPills";
import { ReviewStep } from "@/components/ReviewStep";
import { StepIndicator } from "@/components/StepIndicator";
import { TruckStep } from "@/components/TruckStep";
import { VehiclePicker } from "@/components/VehiclePicker";

type Step = "vehicle" | "parts" | "review";
type BuildSearch = {
  vehicle?: string;
  preset?: string;
  parts?: string[];
  step?: Step;
  photoId?: string;
  help?: boolean;
  use?: Use;
  budget?: Budget;
  lift?: Lift;
  install?: Install;
};
const STEPS: Step[] = ["vehicle", "parts", "review"];
const USES: Use[] = ["overland", "trail", "desert", "daily"];
const BUDGETS: Budget[] = ["2k", "5k", "10k", "any"];
const LIFTS: Lift[] = ["stock", "mild", "big"];
const INSTALLS: Install[] = ["diy", "shop"];

export const Route = createFileRoute("/build")({
  validateSearch: (search: Record<string, unknown>): BuildSearch => {
    // old link mapping
    let step = STEPS.find((s) => s === search.step);
    const hasPhoto = typeof search.photoId === "string";
    const hasParts = Array.isArray(search.parts) && (search.parts as unknown[]).length > 0;
    if (search.step === "photo") step = hasParts && !hasPhoto ? "vehicle" : hasPhoto ? "review" : "vehicle";
    if (search.step === "questions") step = "parts";
    return {
      vehicle: typeof search.vehicle === "string" ? search.vehicle : undefined,
      preset: typeof search.preset === "string" ? search.preset : undefined,
      parts: Array.isArray(search.parts)
        ? (search.parts as unknown[]).filter((p): p is string => typeof p === "string").slice(0, MAX_PARTS)
        : undefined,
      step,
      photoId: typeof search.photoId === "string" ? search.photoId : undefined,
      help: search.help === true || search.help === "1" || search.help === "true" ? true : undefined,
      use: USES.find((v) => v === search.use),
      budget: BUDGETS.find((v) => v === search.budget),
      lift: LIFTS.find((v) => v === search.lift),
      install: INSTALLS.find((v) => v === search.install),
    };
  },
  loaderDeps: ({ search }) => ({ vehicle: search.vehicle }),
  loader: ({ deps }) => getConfigurator({ data: deps.vehicle }),
  head: () => {
    const title = "Build your 4x4 | Overlander Builder";
    const { meta, links } = pageMeta({
      title,
      description: "Choose your truck, pick lift kits, tires, racks and lights, and see the estimated cost before you buy.",
      path: "/build",
    });
    return { meta: [{ title }, ...meta], links };
  },
  component: Configurator,
});

function Configurator() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/build" });
  const [category, setCategory] = useState<Category | "all">("all");
  const [panelOpen, setPanelOpen] = useState(search.help === true);
  const [showPreview, setShowPreview] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) setShowPreview(true);
  }, []);

  const vehicle = data.vehicles.find((v) => v.id === search.vehicle);
  const step: Step = !vehicle || search.step === "vehicle" ? "vehicle" : (search.step ?? "parts");
  const selected = search.parts ?? [];
  const fitting = vehicle ? data.parts.filter((p) => p.vehicleIds.includes(vehicle.id)) : [];
  const selectedParts = fitting.filter((p) => selected.includes(p.id));
  const visible = category === "all" ? fitting : fitting.filter((p) => p.category === category);
  const { totalUsd } = summarize(selectedParts);

  const answers: Answers = {
    use: search.use,
    budget: search.budget,
    lift: search.lift,
    install: search.install,
  };
  const hasAnswers = !!(search.use || search.budget || search.lift || search.install);
  const reasons = hasAnswers && vehicle
    ? recommend(answers, fitting, vehicle.id).reasons
    : {};

  function update(next: BuildSearch, replace = false) {
    void navigate({ search: (prev) => ({ ...prev, ...next }), replace });
  }

  function toggle(id: string) {
    const next = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
    update({ parts: next, preset: undefined }, true);
  }

  // keep fitting parts when truck changes: compare selected with fitting
  return (
    <>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <StepIndicator current={step} onGo={(s) => update({ step: s as Step })} />

        {step === "vehicle" && (
          <div className="mt-6">
            <TruckStep
              vehicles={data.vehicles}
              selectedVehicleId={search.vehicle}
              onPickVehicle={(id) => {
                const nextFitting = new Set(data.parts.filter((p) => p.vehicleIds.includes(id)).map((p) => p.id));
                const kept = selected.filter((x) => nextFitting.has(x));
                update({ vehicle: id, parts: kept, preset: undefined, step: "parts" }, true);
              }}
            />
          </div>
        )}

        {step === "parts" && vehicle && (
          <>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
              <h1 className="text-3xl">Your build</h1>
              <button type="button" onClick={() => update({ step: "vehicle" })} className="text-sm text-primary">
                Change truck
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-4 lg:flex-row">
              <div className="flex flex-col gap-4 lg:w-2/3">
                <PresetPills
                  presets={data.presets.filter((p) => p.vehicleId === vehicle.id)}
                  activeSlug={search.preset}
                  onPick={(p) => update({ preset: p.slug, parts: p.partIds, use: undefined, budget: undefined, lift: undefined, install: undefined }, true)}
                />
                <div className="flex items-center justify-between">
                  <CategoryTabs active={category} onChange={setCategory} />
                  <button type="button" className="text-sm text-primary" onClick={() => setPanelOpen(true)}>
                    Not sure? 4 quick questions
                  </button>
                </div>
                {selected.length >= MAX_PARTS && (
                  <p className="text-sm text-muted-foreground">That's the max of {MAX_PARTS} upgrades per build.</p>
                )}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {visible.map((part) => (
                    <PartCard
                      key={part.id}
                      part={part}
                      selected={selected.includes(part.id)}
                      disabled={selected.length >= MAX_PARTS}
                      onToggle={() => toggle(part.id)}
                      reason={selected.includes(part.id) ? reasons[part.id] : undefined}
                    />
                  ))}
                </div>
              </div>
              <div className="hidden lg:block lg:w-1/3 lg:sticky lg:top-4 lg:self-start">
                <BuildPreview3D vehicleId={vehicle.id} partIds={selected} className="h-[400px] w-full rounded-lg" />
              </div>
            </div>
            {showPreview && (
              <div className="mt-4 lg:hidden">
                <BuildPreview3D vehicleId={vehicle.id} partIds={selected} className="h-[260px] w-full rounded-lg" />
              </div>
            )}
            {!showPreview && (
              <button
                type="button"
                className="mt-4 text-sm text-primary lg:hidden"
                onClick={() => setShowPreview(true)}
              >
                Show 3D preview
              </button>
            )}
          </>
        )}

        {step === "review" && vehicle && (
          <ReviewStep
            vehicle={vehicle}
            photoId={search.photoId}
            partIds={selected}
            parts={fitting}
            totalUsd={totalUsd}
            onEdit={() => update({ step: "parts" })}
            onPickVehicle={() => update({ step: "vehicle" })}
          />
        )}
      </main>

      {step === "parts" && (
        <BuildFooter
          count={selectedParts.length}
          totalUsd={totalUsd}
          nextLabel="Next: see it"
          onNext={() => update({ step: "review" })}
        />
      )}

      <Panel open={panelOpen} onClose={() => { setPanelOpen(false); update({ help: undefined }, true); }}>
        <HelpMeChoose
          vehicleId={vehicle?.id ?? ""}
          parts={fitting}
          answers={answers}
          onShowBuild={(a, partIds) => {
            update(
              {
                use: a.use,
                budget: a.budget,
                lift: a.lift,
                install: a.install,
                parts: partIds,
                preset: undefined,
                step: "parts",
                help: undefined,
              },
              true,
            );
            setPanelOpen(false);
          }}
          onSkip={() => {
            update({ step: "parts", help: undefined }, true);
            setPanelOpen(false);
          }}
        />
      </Panel>
    </>
  );
}