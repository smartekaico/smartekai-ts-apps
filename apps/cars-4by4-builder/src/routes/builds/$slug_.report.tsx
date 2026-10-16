import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Info } from "lucide-react";
import { getReport } from "@/lib/builds";
import { getAdvisories } from "@/lib/advisories";
import { formatPrice, summarize } from "@/lib/pricing";
import { ShopList } from "@/components/ShopList";

export const Route = createFileRoute("/builds/$slug_/report")({
  loader: ({ params }) => getReport({ data: params.slug }),
  head: () => ({ meta: [{ title: "Build report | 4x4 Builder" }, { name: "robots", content: "noindex" }] }),
  component: ReportPage,
});

function ReportPage() {
  const report = Route.useLoaderData();
  const totals = summarize(report.parts);
  const advisories = getAdvisories(report.parts);
  const title = report.presetName ? `${report.vehicle.name} — ${report.presetName}` : `${report.vehicle.name} build`;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Build report</p>
          <h1 className="text-3xl md:text-4xl">{title}</h1>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:border-primary print:hidden"
        >
          Print
        </button>
      </div>

      <img src={report.afterUrl} alt={title} className="mt-6 w-full rounded-lg" />
      <p className="mt-2 text-xs text-muted-foreground">AI visualization — actual appearance may vary.</p>

      <section className="mt-10">
        <h2 className="text-2xl">Parts</h2>
        <div className="mt-4">
          <ShopList parts={report.parts} buildId={report.id} />
        </div>
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
      </section>

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

      <p className="mt-10 text-xs text-muted-foreground">
        Prices and install times are estimates. We earn a commission if you buy through links in this report.
      </p>
    </main>
  );
}
