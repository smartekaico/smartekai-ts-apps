import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@smartekai/ui";
import { ensureGuestSession } from "@/lib/auth-client";
import { startBuild } from "@/lib/builds";
import { getAuthOptions } from "@/lib/auth-options";
import { RENDER_COST } from "@/lib/credit-packs";
import type { CreditBlock } from "@/lib/credit-packs";
import { useCredits, notifyCreditsChanged } from "@/lib/use-credits";
import { formatPrice } from "@/lib/pricing";
import { PhotoDropzone } from "@/components/PhotoDropzone";
import { Toast } from "@/components/Toast";
import type { ToastAction } from "@/components/Toast";
import type { ConfiguratorData } from "@/lib/builds";

type Part = ConfiguratorData["parts"][number];

function blockAction(block: CreditBlock | undefined, retryWithCredits: () => void): ToastAction | undefined {
  if (!block) return undefined;
  if (block === "confirm-credits") return { label: `Use ${RENDER_COST} credits`, onClick: retryWithCredits };
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  return block === "sign-in"
    ? { label: "Sign in", href: `/sign-in?next=${next}` }
    : { label: "Buy credits", href: `/credits?next=${next}` };
}

export function ReviewStep({
  vehicle,
  photoId,
  partIds,
  parts,
  totalUsd,
  onEdit,
  onPickVehicle,
}: {
  vehicle: { id: string; name: string; stockImageUrl: string | null };
  photoId: string | undefined;
  partIds: string[];
  parts: Part[];
  totalUsd: number;
  onEdit: () => void;
  onPickVehicle: () => void;
}) {
  const navigate = useNavigate();
  const credits = useCredits(true);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  useEffect(() => {
    getAuthOptions().then((o) => setGoogleEnabled(o.google)).catch(() => {});
  }, []);
  const [starting, setStarting] = useState(false);
  const [toast, setToast] = useState<{ message: string; action?: ToastAction } | null>(null);
  const [replacingPhoto, setReplacingPhoto] = useState(false);

  const selectedParts = parts.filter((p) => partIds.includes(p.id));

  async function start(buildId?: string, allowCredits = false) {
    setStarting(true);
    setToast(null);
    await ensureGuestSession();
    try {
      const result = await startBuild({ data: { buildId, vehicleId: vehicle.id, partIds, allowCredits } });
      if (!result.ok) {
        setToast({ message: result.error, action: blockAction(result.action, () => void start(buildId, true)) });
        notifyCreditsChanged();
        setStarting(false);
        return;
      }
      notifyCreditsChanged();
      await navigate({ to: "/builds/$slug", params: { slug: result.id } });
    } catch {
      setToast({ message: "Something went wrong — try again." });
      setStarting(false);
    }
  }

  // button label
  let buttonLabel = "Generate my build";
  let buttonDisabled = false;
  let onClick: () => void = () => void start(photoId);
  if (credits === undefined) {
    buttonLabel = "Loading…";
    buttonDisabled = true;
  } else if (credits === null || !credits.account) {
    if (credits === null || credits.freeRenderUsed) {
      if (googleEnabled) {
        buttonLabel = "Sign in with Google and get 20 free credits";
        onClick = () => {
          window.location.assign(`/sign-in?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        };
      } else {
        buttonLabel = "Sign in to continue";
        onClick = () => { window.location.assign(`/sign-in?next=${encodeURIComponent(window.location.pathname + window.location.search)}`); };
      }
    } else {
      buttonLabel = `Generate my build · Free`;
    }
  } else {
    if (credits.balance >= RENDER_COST) {
      buttonLabel = `Generate my build · ${RENDER_COST} credits`;
    } else if (!credits.freeRenderUsed) {
      buttonLabel = `Generate my build · Free`;
    } else {
      buttonLabel = "Buy credits to continue";
      onClick = () => { window.location.assign(`/credits?next=${encodeURIComponent(window.location.pathname + window.location.search)}`); };
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-2">
        <h1 className="text-3xl">See it</h1>
        <button type="button" onClick={onEdit} className="text-sm text-primary">Edit</button>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          {photoId ? (
            <div className="h-16 w-24 rounded bg-muted" />
          ) : vehicle.stockImageUrl ? (
            <img src={vehicle.stockImageUrl} alt={vehicle.name} className="h-16 w-24 rounded object-cover" />
          ) : (
            <div className="h-16 w-24 rounded bg-muted" />
          )}
          <div>
            <p className="font-semibold">{vehicle.name}</p>
            <p className="text-xs text-muted-foreground">{selectedParts.length} upgrades</p>
          </div>
        </div>
        <ul className="mt-3 flex flex-col gap-1 text-sm">
          {selectedParts.map((p) => (
            <li key={p.id}>{p.name}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm font-bold">Estimated total: {formatPrice(totalUsd)}</p>
      </div>

      {!photoId && (
        <button
          type="button"
          className="text-sm text-primary"
          onClick={() => setReplacingPhoto(true)}
        >
          Use your own photo instead
        </button>
      )}

      {replacingPhoto && (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="mb-2 text-sm font-semibold">Upload a photo of your truck</p>
          <PhotoDropzone
            onFileSelected={async (file) => {
              // reuse checkPhoto via a quick inline; for simplicity navigate to vehicle step
              setReplacingPhoto(false);
              onPickVehicle();
            }}
            disabled={false}
          />
        </div>
      )}

      <Button disabled={buttonDisabled || starting} onClick={onClick}>
        {starting ? "Starting…" : buttonLabel}
      </Button>

      {toast && <Toast message={toast.message} action={toast.action} onDismiss={() => setToast(null)} />}
    </div>
  );
}