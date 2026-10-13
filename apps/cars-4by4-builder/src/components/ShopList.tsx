import type { PublicPart } from "@/lib/builds";
import { formatPrice } from "@/lib/pricing";
import { FitmentBadge } from "@/components/FitmentBadge";
import { PartImage } from "@/components/PartImage";

export function ShopList({ parts, buildId }: { parts: PublicPart[]; buildId: string }) {
  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-card">
      {parts.map((p) => (
        <li key={p.id} className="flex items-center gap-3 p-3">
          <div className="w-20 shrink-0 overflow-hidden rounded-md">
            <PartImage src={p.imageUrl} alt={p.name} category={p.category} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{p.name}</p>
            <p className="text-xs text-muted-foreground">
              {p.brand} · {p.laborHoursEst} hrs install
            </p>
            <div className="mt-1">
              <FitmentBadge difficulty={p.fitmentDifficulty} />
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-bold">{formatPrice(Number(p.priceUsd))}</p>
            {p.buyable ? (
              <a
                href={`/go/${p.id}?build=${buildId}`}
                target="_blank"
                rel="sponsored noopener noreferrer"
                className="mt-1 inline-block rounded-md bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground hover:opacity-90"
              >
                Buy ↗
              </a>
            ) : (
              <span className="mt-1 inline-block text-xs text-muted-foreground">Link coming soon</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
