import { useState } from "react";
import type { Answers, Budget, Install, Lift, Use } from "@/lib/recommend";
import { recommend } from "@/lib/recommend";
import type { PublicPart } from "@/lib/builds";

type Props = {
  vehicleId: string;
  parts: (PublicPart & { vehicleIds: string[] })[];
  answers: Answers;
  onShowBuild: (answers: Answers, partIds: string[]) => void;
  onSkip: () => void;
};

const USE_OPTIONS: { value: Use; label: string }[] = [
  { value: "overland", label: "Overlanding" },
  { value: "trail", label: "Trail / rock crawling" },
  { value: "desert", label: "Desert / dunes" },
  { value: "daily", label: "Daily driver" },
];

const BUDGET_OPTIONS: { value: Budget; label: string }[] = [
  { value: "2k", label: "Under $2k" },
  { value: "5k", label: "$2k – $5k" },
  { value: "10k", label: "$5k – $10k" },
  { value: "any", label: "$10k+" },
];

const LIFT_OPTIONS: { value: Lift; label: string }[] = [
  { value: "stock", label: "Stock height" },
  { value: "mild", label: "Mild lift (2–3\")" },
  { value: "big", label: "Big lift (6\")" },
];

const INSTALL_OPTIONS: { value: Install; label: string }[] = [
  { value: "diy", label: "DIY bolt-on" },
  { value: "shop", label: "Shop install" },
];

function Question<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (v: T | undefined) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{title}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(active ? undefined : o.value)}
              className={
                "rounded-lg border px-3 py-3 text-sm font-medium transition " +
                (active
                  ? "border-primary bg-primary/10 text-primary ring-2 ring-primary"
                  : "border-border bg-card hover:border-primary/50")
              }
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function HelpMeChoose({ vehicleId, parts, answers, onShowBuild, onSkip }: Props) {
  const [use, setUse] = useState<Use | undefined>(answers.use);
  const [budget, setBudget] = useState<Budget | undefined>(answers.budget);
  const [lift, setLift] = useState<Lift | undefined>(answers.lift);
  const [install, setInstall] = useState<Install | undefined>(answers.install);

  function showBuild() {
    const a: Answers = { use, budget, lift, install };
    const { partIds } = recommend(a, parts, vehicleId);
    onShowBuild(a, partIds);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Help me choose</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Optional. Answer any or all — skip what you don't care about.
        </p>
      </div>
      <Question title="What's it for?" options={USE_OPTIONS} value={use} onChange={setUse} />
      <Question title="Parts budget" options={BUDGET_OPTIONS} value={budget} onChange={setBudget} />
      <Question title="How high?" options={LIFT_OPTIONS} value={lift} onChange={setLift} />
      <Question title="Who installs?" options={INSTALL_OPTIONS} value={install} onChange={setInstall} />
      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="button"
          onClick={showBuild}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          Show my build
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold transition hover:border-primary/50"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
