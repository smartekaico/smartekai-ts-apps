import type { PublicPart, TeaserPart } from "@/lib/builds";
import { getAdvisories } from "@/lib/advisories";
import { formatPrice, summarize } from "@/lib/pricing";
import { AlertTriangle, Info } from "lucide-react";

type ShopPart = TeaserPart & Partial<Pick<PublicPart, "priceUsd" | "laborHoursEst" | "fitmentDifficulty">>;

/**
 * The parts / labour / total breakdown plus the advisory list. Extracted from
 * the report page so step 3, the build page and the report page share one copy.
 */
export function BuildReport({ parts }: { parts: ShopPart[] }) {
  const totals = summarize(
    parts.map((p) => ({ priceUsd: p.priceUsd ?? "0", laborHoursEst: p.laborHoursEst ?? "0" })),
  );
  const advisories = getAdvisories(
    parts.map((p) => ({
      category: p.category,
      fitmentDifficulty: p.fitmentDifficulty ?? "",
      name: p.name,
    })),
  );

  return (
    <>
      <dl className="ml-auto mt-4 flex max-w-xs flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Parts</dt>
          <dd>{formatPrice(totals.partsUsd)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Est. labor ({totals.laborHours} hrs)</dt>
          <dd>{formatPrice(totals.laborUsd)}</dd>
        </div>
        <div className="flex justify-between border-t border-border pt-1 text-base font-bold">
          <dt>Estimated total</dt>
          <dd>{formatPrice(totals.totalUsd)}</dd>
        </div>
      </dl>

      {advisories.length > 0 && (
        <section className="mt-10 break-inside-avoid">
          <h2 className="text-2xl">Fitment notes</h2>
          <ul className="mt-4 flex flex-col gap-2">
            {advisories.map((a) => (
              <li key={a.message} className="flex gap-3 rounded-lg border border-border bg-card p-3 text-sm">
                {a.type === "warning" ? (
                  <AlertTriangle aria-label="Warning" className="h-5 w-5 shrink-0 text-primary" />
                ) : (
                  <Info aria-label="Note" className="h-5 w-5 shrink-0 text-muted-foreground" />
                )}
                <span>{a.message}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}