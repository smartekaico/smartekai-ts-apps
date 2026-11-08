import { useState } from "react";
import type { ConfiguratorData } from "@/lib/builds";
import { closestPreset } from "@/lib/recommend";
import { formatPrice, summarize } from "@/lib/pricing";
import { BuildPreview3D } from "@/components/BuildPreview3D";
import { BuildReport } from "@/components/BuildReport";
import { ShopList } from "@/components/ShopList";
import { STUDIO_CROP } from "@/components/studio-photo";

type Vehicle = ConfiguratorData["vehicles"][number];
type Part = ConfiguratorData["parts"][number];
type Preset = ConfiguratorData["presets"][number];

/**
 * Step 3 (Spec 7 §2): the parts list. Everything comes from the URL, so the
 * link can be shared. No server write.
 */
export function PartsListStep({
  vehicle,
  partIds,
  parts,
  presets,
  onEdit,
}: {
  vehicle: Vehicle;
  partIds: string[];
  parts: Part[];
  presets: Preset[];
  onEdit: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const selectedParts = parts.filter((p) => partIds.includes(p.id));
  const { totalUsd } = summarize(selectedParts);

  const preset = closestPreset(presets, partIds);
  const exactMatch = preset !== null && preset.partIds.length === partIds.length && preset.partIds.every((id) => partIds.includes(id));
  const imageUrl = exactMatch ? preset.afterUrl : (preset?.afterUrl ?? vehicle.stockImageUrl);
  const label = exactMatch ? null : "Closest look. Your parts are listed below.";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-3xl">Your {vehicle.name} build</h1>
        <button type="button" onClick={onEdit} className="text-sm text-primary">
          Edit parts
        </button>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="lg:w-2/3">
          {imageUrl ? (
            <>
              <img src={imageUrl} alt={vehicle.name} className={`w-full rounded-lg object-cover ${STUDIO_CROP}`} />
              {label && <p className="mt-2 text-xs text-muted-foreground">{label}</p>}
            </>
          ) : null}

          <div className="mt-4">
            <ShopList parts={selectedParts} vehicleId={vehicle.id} />
          </div>

          <BuildReport parts={selectedParts} />

          <div className="mt-4 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:border-primary"
            >
              Print
            </button>
          </div>
        </div>

        <div className="lg:w-1/3 lg:sticky lg:top-4 lg:self-start print:hidden">
          <BuildPreview3D vehicleId={vehicle.id} partIds={partIds} className="h-[300px] w-full rounded-lg" />
          <button type="button" onClick={() => void copyLink()} className="mt-3 text-sm text-primary">
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      </div>
    </div>
  );
}
