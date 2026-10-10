import { Button } from "@smartekai/ui";
import { formatPrice } from "@/lib/region";
import type { Region } from "@/lib/region";

export function BuildFooter({
  count,
  totalUsd,
  region,
  nextLabel,
  onNext,
}: {
  count: number;
  totalUsd: number;
  region: Region;
  nextLabel?: string;
  onNext?: () => void;
}) {
  return (
    <div className="sticky bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <p className="text-sm">
          <span className="font-semibold">{count} {count === 1 ? "part" : "parts"}</span>
          <span className="text-muted-foreground"> · est. </span>
          <span className="font-semibold">{formatPrice(totalUsd, region)}</span>
        </p>
        {onNext && nextLabel ? (
          <Button disabled={count === 0} onClick={onNext}>
            {nextLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
