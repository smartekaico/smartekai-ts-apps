import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@smartekai/ui";
import { ensureGuestSession } from "@/lib/auth-client";
import { checkPhoto } from "@/lib/builds";
import { notifyCreditsChanged } from "@/lib/use-credits";
import { PhotoDropzone } from "@/components/PhotoDropzone";
import { VehiclePicker } from "@/components/VehiclePicker";
import type { ConfiguratorData } from "@/lib/builds";
import { AI_RENDERS_ENABLED } from "@/lib/features";

type Vehicle = ConfiguratorData["vehicles"][number];

type Check =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "matched"; buildId: string; label: string; vehicleId: string }
  | { state: "unmatched"; buildId: string; label: string; make: string | null; model: string | null }
  | { state: "notvehicle"; message: string };

export function TruckStep({
  vehicles,
  selectedVehicleId,
  onPickVehicle,
}: {
  vehicles: Vehicle[];
  selectedVehicleId: string | undefined;
  onPickVehicle: (id: string) => void;
}) {
  const navigate = useNavigate({ from: "/build" });
  const [check, setCheck] = useState<Check>({ state: "idle" });
  const [showTiles, setShowTiles] = useState(false);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  async function handleFile(file: File) {
    setCheck({ state: "checking" });
    setShowTiles(false);
    await ensureGuestSession();
    const formData = new FormData();
    formData.append("photo", file);
    try {
      const result = await checkPhoto({ data: formData });
      if (!result.ok) {
        setCheck({ state: "notvehicle", message: result.error });
        setShowTiles(true);
        return;
      }
      const d = result.detected;
      const label = [d.color, d.make, d.model].filter(Boolean).join(" ") || "your truck";
      if (result.vehicleId) {
        setCheck({ state: "matched", buildId: result.buildId, label, vehicleId: result.vehicleId });
        onPickVehicle(result.vehicleId);
      } else {
        setCheck({ state: "unmatched", buildId: result.buildId, label, make: d.make, model: d.model });
        setShowTiles(true);
      }
    } catch {
      setCheck({ state: "notvehicle", message: "Upload failed — check your connection and try again." });
      setShowTiles(true);
    }
  }

  function continueWith(buildId: string, vehicleId: string) {
    void navigate({ search: (prev: any) => ({ ...prev, vehicle: vehicleId, photoId: buildId, parts: prev?.parts, step: "parts" }), replace: true });
  }

  function pickModel(id: string) {
    onPickVehicle(id);
    // studio photo path: go to parts with no photoId
    void navigate({ search: (prev: any) => ({ ...prev, vehicle: id, photoId: undefined, parts: prev?.parts, step: "parts" }), replace: true });
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl">{AI_RENDERS_ENABLED ? "Your truck" : "Pick your truck"}</h1>

      {/* Choice A: upload photo (MVP: hidden - no photo upload) */}
      {AI_RENDERS_ENABLED && (
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="mb-3 font-semibold">Upload a photo of your truck</p>
        <PhotoDropzone onFileSelected={handleFile} disabled={check.state === "checking"} />

        {check.state === "checking" && <p className="mt-3 text-sm text-muted-foreground">Checking your photo…</p>}

        {check.state === "matched" && (
          <div className="mt-3 flex flex-col gap-2">
            <p className="rounded-md border border-emerald-500/40 px-3 py-2 text-sm font-semibold text-emerald-400">
              ✓ Looks like a {vehicles.find((v) => v.id === check.vehicleId)?.name ?? check.label}
            </p>
            <div className="flex gap-2">
              <Button onClick={() => continueWith(check.buildId, check.vehicleId)}>Continue</Button>
              <button type="button" className="text-sm text-primary" onClick={() => setShowTiles(true)}>
                Not right? Change
              </button>
            </div>
          </div>
        )}

        {check.state === "unmatched" && (
          <div className="mt-3 flex flex-col gap-2">
            <p className="rounded-md border border-amber-500/40 px-3 py-2 text-sm text-amber-400">
              We don't support your {[check.make, check.model].filter(Boolean).join(" ") || "truck"} yet. Pick the closest match and we'll still use your photo.
            </p>
          </div>
        )}

        {check.state === "notvehicle" && (
          <div className="mt-3 flex flex-col gap-2">
            <p className="rounded-md border border-destructive/50 px-3 py-2 text-sm text-destructive">{check.message}</p>
            <p className="text-sm text-muted-foreground">Pick a model instead.</p>
          </div>
        )}
      </div>
      )}

      {/* Tiles (model pick) */}
      {(AI_RENDERS_ENABLED ? showTiles || check.state === "idle" : true) && (
        <div className="rounded-lg border border-border bg-card p-4">
          {AI_RENDERS_ENABLED ? (
            <>
              <p className="mb-3 font-semibold">Pick a model</p>
              <p className="mb-3 text-xs text-muted-foreground">No photo? No problem — we'll use a studio photo.</p>
            </>
          ) : null}
          <VehiclePicker vehicles={vehicles} onPick={pickModel} />
        </div>
      )}
    </div>
  );
}