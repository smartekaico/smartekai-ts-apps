import { useEffect } from "react";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { AlertTriangle, Info } from "lucide-react";
import { getBuild } from "@/lib/builds";
import { getAdvisories } from "@/lib/advisories";
import { formatPrice, summarize } from "@/lib/pricing";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { BuildProgress } from "@/components/BuildProgress";
import { BuildQuotePdfLink } from "@/components/BuildQuotePdfLink";
import { ShareButton } from "@/components/ShareButton";
import { ShopList } from "@/components/ShopList";

export const Route = createFileRoute("/builds/$slug")({
  loader: ({ params }) => getBuild({ data: params.slug }),
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const title = loaderData.presetName
      ? `${loaderData.vehicle.name} ${loaderData.presetName} build`
      : `${loaderData.vehicle.name} build`;
    return {
      meta: [
        { title: `${title} | 4x4 Builder` },
        { name: "description", content: `${loaderData.parts.length} upgrades with estimated prices and install time.` },
        { property: "og:title", content: title },
        ...(loaderData.afterUrl ? [{ property: "og:image", content: loaderData.afterUrl }] : []),
        ...(loaderData.isCurated ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  component: BuildPage,
});

function BuildPage() {
  const build = Route.useLoaderData();
  const router = useRouter();

  useEffect(() => {
    if (build.status !== "processing") return;
    const timer = setInterval(() => void router.invalidate(), 3000);
    return () => clearInterval(timer);
  }, [build.status, router]);

  if (build.status === "processing") {
    return (
      <main className="mx-auto max-w-3xl px-4">
        <BuildProgress />
      </main>
    );
  }

  if (build.status === "failed" || !build.afterUrl) {
    return (
      <main className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
        <h1 className="text-3xl">That render didn't work</h1>
        <p className="text-muted-foreground">{build.errorMessage ?? "Generation failed — try again."}</p>
        <Link
          to="/build"
          search={{ vehicle: build.vehicle.id, parts: build.selectedPartIds, step: "photo" }}
          className="rounded-md bg-primary px-5 py-2.5 font-bold text-primary-foreground"
        >
          Try again
        </Link>
      </main>
    );
  }

  const advisories = getAdvisories(build.parts);
  const totals = summarize(build.parts);
  const title = build.presetName ? `${build.vehicle.name} — ${build.presetName}` : `Your ${build.vehicle.name} build`;
  const pdfRenderUrl = build.renderKey ? `/api/render?key=${encodeURIComponent(build.renderKey)}` : build.afterUrl;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl md:text-4xl">{title}</h1>

      <div className="mt-6">
        <BeforeAfterSlider beforeUrl={build.beforeUrl} afterUrl={build.afterUrl} />
        <p className="mt-2 text-xs text-muted-foreground">AI visualization — actual appearance may vary.</p>
      </div>

      {build.isCurated && (
        <Link
          to="/build"
          search={{ vehicle: build.vehicle.id, preset: build.presetSlug ?? undefined, parts: build.selectedPartIds, step: "photo" }}
          className="mt-6 inline-flex rounded-md bg-primary px-5 py-3 font-bold text-primary-foreground"
        >
          Make it yours — try it on your truck
        </Link>
      )}

      <section className="mt-10">
        <h2 className="text-2xl">Shop this build</h2>
        <div className="mt-4">
          <ShopList parts={build.parts} buildId={build.id} />
        </div>
        <dl className="mt-4 ml-auto flex max-w-xs flex-col gap-1 text-sm">
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
        <section className="mt-10">
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

      <div className="mt-10 flex flex-wrap gap-3">
        <ShareButton />
        <a
          href={build.afterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-border px-4 py-2 text-sm font-semibold hover:border-primary"
        >
          Full-size image ↗
        </a>
        <BuildQuotePdfLink title={title} renderUrl={pdfRenderUrl} parts={build.parts} advisories={advisories} />
      </div>
    </main>
  );
}
