import { Link } from "@tanstack/react-router";
import { formatPrice } from "@/lib/pricing";

export function BuildCard({
  slug,
  afterUrl,
  vehicleName,
  presetName,
  totalUsd,
}: {
  slug: string;
  afterUrl: string;
  vehicleName: string;
  presetName: string;
  totalUsd: number;
}) {
  return (
    <Link
      to="/builds/$slug"
      params={{ slug }}
      className="group overflow-hidden rounded-lg border border-border bg-card transition hover:-translate-y-0.5 hover:border-primary"
    >
      <img src={afterUrl} alt={`${vehicleName} ${presetName} build`} loading="lazy" className="aspect-video w-full object-cover" />
      <div className="flex items-center justify-between gap-2 p-4">
        <div>
          <p className="font-extrabold tracking-tight">{presetName}</p>
          <p className="text-xs text-muted-foreground">{vehicleName}</p>
        </div>
        <span className="text-sm font-bold text-primary">{formatPrice(totalUsd)}</span>
      </div>
    </Link>
  );
}
