import { createFileRoute, redirect } from "@tanstack/react-router";
import { getReport } from "@/lib/builds";
import { getAdvisories } from "@/lib/advisories";
import { ShopList } from "@/components/ShopList";
import { BuildReport } from "@/components/BuildReport";
import { STUDIO_CROP, isStudioPhoto } from "@/components/studio-photo";
import { cn } from "@/lib/utils";
import { AI_RENDERS_ENABLED } from "@/lib/features";

export const Route = createFileRoute("/builds/$slug_/report")({
  loader: ({ params }) => {
    // Spec 7: the report needs a sign-in and a saved build; the build page now
    // shows prices and fitment to everyone, so send visitors there.
    if (!AI_RENDERS_ENABLED) throw redirect({ to: "/builds/$slug", params: { slug: params.slug } });
    return getReport({ data: params.slug });
  },
  head: () => ({ meta: [{ title: "Build report | Overlander Builder" }, { name: "robots", content: "noindex" }] }),
  component: ReportPage,
});

function ReportPage() {
  const report = Route.useLoaderData();
  const title = report.presetName ? `${report.vehicle.name} — ${report.presetName}` : `${report.vehicle.name} build`;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 print:max-w-none print:p-0 print:text-black">
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

      <div className="mt-6 overflow-hidden rounded-lg">
        <img src={report.afterUrl} alt={title} className={cn("w-full", isStudioPhoto(report.beforeUrl) && STUDIO_CROP)} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">AI visualization — actual appearance may vary.</p>

      <section className="mt-10">
        <h2 className="text-2xl">Parts</h2>
        <div className="mt-4">
          <ShopList parts={report.parts} buildId={report.id} />
        </div>
        <BuildReport parts={report.parts} />
      </section>

      <p className="mt-10 text-xs text-muted-foreground">
        Prices and install times are estimates. We earn a commission if you buy through links in this report.
      </p>
    </main>
  );
}
