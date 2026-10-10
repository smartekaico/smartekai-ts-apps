import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@smartekai/ui";
import { PartsSelectionGrid } from "@/components/PartsSelectionGrid";
import { getParts } from "@/lib/queries";

export const Route = createFileRoute("/")({
  loader: async () => ({ parts: await getParts() }),
  component: Home,
});

function Home() {
  const { parts } = Route.useLoaderData();
  const [selected, setSelected] = useState<string[]>([]);
  const navigate = useNavigate();

  function handleContinue() {
    navigate({ to: "/build", search: { parts: selected } });
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold">Step 1: Select Your Upgrades</h1>
      <div className="mt-4">
        <PartsSelectionGrid parts={parts} selected={selected} onChange={setSelected} />
      </div>
      <div className="mt-6 flex justify-end">
        <Button disabled={selected.length === 0} onClick={handleContinue}>
          Continue ({selected.length} selected)
        </Button>
      </div>
    </main>
  );
}