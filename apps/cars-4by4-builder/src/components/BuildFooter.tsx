import { Link, useRouterState } from "@tanstack/react-router";
import { Button } from "@smartekai/ui";
import { RENDER_COST } from "@/lib/credit-packs";
import type { CreditState } from "@/lib/credit-packs";
import { formatPrice } from "@/lib/pricing";
import { useCredits } from "@/lib/use-credits";

export function BuildFooter({
  count,
  totalUsd,
  nextLabel,
  onNext,
}: {
  count: number;
  totalUsd: number;
  nextLabel?: string;
  onNext?: () => void;
}) {
  const credits = useCredits(true);

  return (
    <div className="sticky bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm">
            <span className="font-semibold">
              {count} {count === 1 ? "part" : "parts"}
            </span>
            <span className="text-muted-foreground"> · est. </span>
            <span className="font-semibold">{formatPrice(totalUsd)}</span>
          </p>
          <RenderCost credits={credits} />
        </div>
        {onNext && nextLabel ? (
          <Button disabled={count === 0} onClick={onNext}>
            {nextLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** Spec 3 §6: what the next render will use, shown before Generate. */
function RenderCost({ credits }: { credits: CreditState | null | undefined }) {
  const here = useRouterState({ select: (s) => s.location.href });
  const note = "text-xs text-muted-foreground";
  const link = "text-xs font-semibold text-primary hover:underline";

  // undefined = loading; null = no session yet (PhotoStep starts a guest one) — promise nothing.
  if (!credits) return null;
  if (!credits.freeRenderUsed) return <p className={note}>Free render</p>;
  if (!credits.account) {
    return (
      <Link to="/sign-in" search={{ next: here }} className={link}>
        Sign in to keep building
      </Link>
    );
  }
  if (credits.balance >= RENDER_COST) {
    return (
      <p className={note}>
        Uses {RENDER_COST} credits (you have {credits.balance})
      </p>
    );
  }
  return (
    <Link to="/credits" search={{ next: here }} className={link}>
      Buy credits
    </Link>
  );
}
