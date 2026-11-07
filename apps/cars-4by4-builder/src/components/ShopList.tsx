import type { PublicPart, TeaserPart } from "@/lib/builds";
import { formatPrice } from "@/lib/pricing";
import { BUY_LABEL } from "@/lib/store";
import { FitmentBadge } from "@/components/FitmentBadge";
import { PartImage } from "@/components/PartImage";

// Guests get TeaserPart; the signed-in report passes full PublicPart.
type ShopPart = TeaserPart & Partial<Pick<PublicPart, "priceUsd" | "laborHoursEst" | "fitmentDifficulty">>;

export function ShopList({
  parts,
  buildId,
  vehicleId,
}: {
  parts: ShopPart[];
  /** A saved build: /go attributes the click to it. */
  buildId?: string;
  /** No saved build (MVP parts list): /go uses the truck's own link. */
  vehicleId?: string;
}) {
  const query = buildId ? `build=${buildId}` : vehicleId ? `vehicle=${vehicleId}` : "";
  return (
    <div>
      {parts.some((p) => p.store) && (
        <p className="mb-2 text-xs text-muted-foreground">We earn a commission if you buy through these links.</p>
      )}
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {parts.map((p) => (
          <li key={p.id} className="flex items-center gap-3 p-3">
            <div className="w-20 shrink-0 overflow-hidden rounded-md">
              <PartImage src={p.imageUrl} alt={p.name} category={p.category} kind={p.imageKind} compact />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{p.name}</p>
              <p className="text-xs text-muted-foreground">
                {p.brand}
                {p.laborHoursEst !== undefined && <> · {p.laborHoursEst} hrs install</>}
              </p>
              {p.fitmentDifficulty !== undefined && (
                <div className="mt-1">
                  <FitmentBadge difficulty={p.fitmentDifficulty} />
                </div>
              )}
            </div>
            <div className="shrink-0 text-right">
              {p.priceUsd !== undefined && (
                <p className="font-bold">
                  <span className="text-xs font-normal text-muted-foreground">Est. </span>
                  {formatPrice(Number(p.priceUsd))}
                </p>
              )}
              {p.store && (
                <a
                  href={`/go/${p.id}?${query}`}
                  target="_blank"
                  rel="sponsored nofollow noopener noreferrer"
                  className="mt-1 inline-block rounded-md bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground hover:opacity-90 print:hidden"
                >
                  {BUY_LABEL[p.store]} <span aria-hidden="true">↗</span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
