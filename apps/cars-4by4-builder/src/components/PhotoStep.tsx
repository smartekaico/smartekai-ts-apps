import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@smartekai/ui";
import { ensureGuestSession } from "@/lib/auth-client";
import { checkPhoto, startBuild } from "@/lib/builds";
import { RENDER_COST } from "@/lib/credit-packs";
import type { CreditBlock } from "@/lib/credit-packs";
import { notifyCreditsChanged } from "@/lib/use-credits";
import { PhotoDropzone } from "@/components/PhotoDropzone";
import { Toast } from "@/components/Toast";
import type { ToastAction } from "@/components/Toast";

type Check =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "verified"; buildId: string; label: string }
  | { state: "rejected"; message: string };

type Notice = { message: string; action?: ToastAction };

/**
 * A Sign in / Buy credits link that brings the user back to this exact step,
 * or — when the free render fell through to credits — a button that retries
 * the same start, this time agreeing to pay credits.
 */
function blockAction(block: CreditBlock | undefined, retryWithCredits: () => void): ToastAction | undefined {
  if (!block) return undefined;
  if (block === "confirm-credits") return { label: `Use ${RENDER_COST} credits`, onClick: retryWithCredits };
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  return block === "sign-in"
    ? { label: "Sign in", href: `/sign-in?next=${next}` }
    : { label: "Buy credits", href: `/credits?next=${next}` };
}

export function PhotoStep({
  vehicle,
  partIds,
}: {
  vehicle: { id: string; name: string; stockImageUrl: string | null };
  partIds: string[];
}) {
  const navigate = useNavigate();
  const [check, setCheck] = useState<Check>({ state: "idle" });
  const [starting, setStarting] = useState(false);
  const [toast, setToast] = useState<Notice | null>(null);

  async function handleFile(file: File) {
    setCheck({ state: "checking" });
    await ensureGuestSession();
    const formData = new FormData();
    formData.append("photo", file);
    formData.append("vehicleId", vehicle.id);
    try {
      const result = await checkPhoto({ data: formData });
      if (!result.ok) {
        setCheck({ state: "rejected", message: result.error });
        return;
      }
      const d = result.detected;
      const label = [d.color, d.make, d.model].filter(Boolean).join(" ") || vehicle.name;
      setCheck({ state: "verified", buildId: result.buildId, label });
    } catch {
      setCheck({ state: "idle" });
      setToast({ message: "Upload failed — check your connection and try again." });
    }
  }

  async function start(buildId?: string, allowCredits = false) {
    setStarting(true);
    setToast(null);
    await ensureGuestSession();
    try {
      const result = await startBuild({ data: { buildId, vehicleId: vehicle.id, partIds, allowCredits } });
      if (!result.ok) {
        setToast({ message: result.error, action: blockAction(result.action, () => void start(buildId, true)) });
        notifyCreditsChanged(); // the footer's cost line may be stale
        setStarting(false);
        return;
      }
      notifyCreditsChanged(); // the header chip: a free render or credits were just used
      await navigate({ to: "/builds/$slug", params: { slug: result.id } });
    } catch {
      setToast({ message: "Something went wrong — try again." });
      setStarting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PhotoDropzone onFileSelected={handleFile} disabled={check.state === "checking" || starting} />

      {check.state === "checking" && <p className="text-sm text-muted-foreground">Checking your photo…</p>}
      {check.state === "verified" && (
        <p className="rounded-md border border-emerald-500/40 px-3 py-2 text-sm font-semibold text-emerald-400">
          ✓ {check.label}
        </p>
      )}
      {check.state === "rejected" && (
        <p className="rounded-md border border-destructive/50 px-3 py-2 text-sm text-destructive">{check.message}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {vehicle.stockImageUrl ? (
          <button
            type="button"
            disabled={starting}
            onClick={() => start()}
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            No photo? Use our studio {vehicle.name}
          </button>
        ) : (
          <span />
        )}
        <Button disabled={check.state !== "verified" || starting} onClick={() => check.state === "verified" && start(check.buildId)}>
          {starting ? "Starting…" : "Generate my build"}
        </Button>
      </div>

      {toast && <Toast message={toast.message} action={toast.action} onDismiss={() => setToast(null)} />}
    </div>
  );
}
