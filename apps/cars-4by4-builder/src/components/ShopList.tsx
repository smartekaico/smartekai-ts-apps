import type { PublicPart, TeaserPart } from "@/lib/builds";
import { formatPrice } from "@/lib/pricing";
import { BUY_LABEL } from "@/lib/store";
import { FitmentBadge } from "@/components/FitmentBadge";
import { PartImage } from "@/components/PartImage";

// Guests get TeaserPart; the signed-in report passes full PublicPart.
type ShopPart = TeaserPart & Partial<Pick<PublicPart, "priceUsd" | "laborHoursEst" | "fitmentDifficulty">>;

export function ShopList({ parts, buildId }: { parts: ShopPart[]; buildId: string }) {
  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">
        We earn a commission if you buy through these links.
      </p>
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {parts.map((p) => (
          <li key={p.id} className="flex items-center gap-3 p-3">
            <div className="w-20 shrink-0 overflow-hidden rounded-md">
              <PartImage src={p.imageUrl} alt={p.name} category={p.category} />
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
              {p.store ? (
                <a
                  href={`/go/${p.id}?build=${buildId}`}
                  target="_blank"
                  rel="sponsored nofollow noopener noreferrer"
                  className="mt-1 inline-block rounded-md bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground hover:opacity-90 print:hidden"
                >
                  {BUY_LABEL[p.store]} ↗
                </a>
              ) : (
                <span className="mt-1 inline-block text-xs text-muted-foreground">Link coming soon</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
