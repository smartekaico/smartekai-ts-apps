import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getConfigurator } from "@/lib/builds";
import { MAX_PARTS } from "@/lib/catalog";
import type { Category } from "@/lib/catalog";
import { recommend } from "@/lib/recommend";
import type { Answers, Budget, Install, Lift, Use } from "@/lib/recommend";
import { summarize } from "@/lib/pricing";
import { BuildFooter } from "@/components/BuildFooter";
import { BuildPreview3D } from "@/components/BuildPreview3D";
import { CategoryTabs } from "@/components/CategoryTabs";
import { HelpMeChoose } from "@/components/HelpMeChoose";
import { PartCard } from "@/components/PartCard";
import { PhotoStep } from "@/components/PhotoStep";
import { PresetPills } from "@/components/PresetPills";
import { VehiclePicker } from "@/components/VehiclePicker";

type Step = "vehicle" | "questions" | "parts" | "photo";
type BuildSearch = {
  vehicle?: string;
  preset?: string;
  parts?: string[];
  step?: Step;
  use?: Use;
  budget?: Budget;
  lift?: Lift;
  install?: Install;
};
const STEPS: Step[] = ["vehicle", "questions", "parts", "photo"];
const USES: Use[] = ["overland", "trail", "desert", "daily"];
const BUDGETS: Budget[] = ["2k", "5k", "10k", "any"];
const LIFTS: Lift[] = ["stock", "mild", "big"];
const INSTALLS: Install[] = ["diy", "shop"];
const STEP_NUMS = ["vehicle", "parts", "photo"];

export const Route = createFileRoute("/build")({
  validateSearch: (search: Record<string, unknown>): BuildSearch => ({
    vehicle: typeof search.vehicle === "string" ? search.vehicle : undefined,
    preset: typeof search.preset === "string" ? search.preset : undefined,
    parts: Array.isArray(search.parts)
      ? search.parts.filter((p): p is string => typeof p === "string").slice(0, MAX_PARTS)
      : undefined,
    step: STEPS.find((s) => s === search.step),
    use: USES.find((v) => v === search.use),
    budget: BUDGETS.find((v) => v === search.budget),
    lift: LIFTS.find((v) => v === search.lift),
    install: INSTALLS.find((v) => v === search.install),
  }),
  loaderDeps: ({ search }) => ({ vehicle: search.vehicle }),
  loader: ({ deps }) => getConfigurator({ data: deps.vehicle }),
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

  return (
    <>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {step === "questions"
            ? "Optional"
            : `Step ${STEP_NUMS.indexOf(step) + 1} of 3${vehicle ? ` · ${vehicle.name}` : ""}`}
        </p>

        {step === "vehicle" && (
          <>
            <h1 className="mt-1 text-3xl">Pick your truck</h1>
            <div className="mt-6">
              <VehiclePicker
                vehicles={data.vehicles}
                onPick={(id) => update({ vehicle: id, parts: [], preset: undefined, step: "questions" })}
              />
            </div>
          </>
        )}

        {step === "questions" && vehicle && (
          <HelpMeChoose
            vehicleId={vehicle.id}
            parts={fitting}
            answers={answers}
            onShowBuild={(a, partIds) =>
              update(
                {
                  use: a.use,
                  budget: a.budget,
                  lift: a.lift,
                  install: a.install,
                  parts: partIds,
                  preset: undefined,
                  step: "parts",
                },
                true,
              )
            }
            onSkip={() => update({ step: "parts" })}
          />
        )}

        {step === "parts" && vehicle && (
          <>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
              <h1 className="text-3xl">Choose your upgrades</h1>
              <button type="button" onClick={() => update({ step: "vehicle" })} className="text-sm text-primary">
                Change truck
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-4 lg:flex-row">
              <div className="order-2 flex flex-col gap-4 lg:order-1 lg:w-2/3">
                <PresetPills
                  presets={data.presets.filter((p) => p.vehicleId === vehicle.id)}
                  activeSlug={search.preset}
                  onPick={(p) => update({ preset: p.slug, parts: p.partIds, use: undefined, budget: undefined, lift: undefined, install: undefined }, true)}
                />
                <CategoryTabs active={category} onChange={setCategory} />
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => update({ step: "questions" })}
                    className="text-sm text-primary"
                  >
                    Help me choose
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
              <div className="order-1 lg:order-2 lg:w-1/3 lg:sticky lg:top-4 lg:self-start">
                <BuildPreview3D vehicleId={vehicle.id} partIds={selected} className="h-[260px] w-full rounded-lg lg:h-[400px]" />
              </div>
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

      {step !== "vehicle" && step !== "questions" && (
        <BuildFooter
          count={selectedParts.length}
          totalUsd={totalUsd}
          nextLabel={step === "parts" ? "Next: add your truck" : undefined}
          onNext={step === "parts" ? () => update({ step: "photo" }) : undefined}
        />
      )}
    </>
  );
}
