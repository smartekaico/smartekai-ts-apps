import { useEffect } from "react";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { getBuild } from "@/lib/builds";
import { notifyCreditsChanged } from "@/lib/use-credits";
import { formatPrice } from "@/lib/pricing";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { BuildProgress } from "@/components/BuildProgress";
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

  // A failed render was refunded server-side — refresh the header chip (effects run client-only).
  useEffect(() => {
    if (build.status === "failed") notifyCreditsChanged();
  }, [build.status]);

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

  const title = build.presetName ? `${build.vehicle.name} — ${build.presetName}` : `Your ${build.vehicle.name} build`;
  const slug = build.slug ?? build.id;

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
        <div className="ml-auto mt-4 flex max-w-xs justify-between border-t border-border pt-1 text-base font-bold">
          <span>Estimated total</span>
          <span>{formatPrice(build.estimatedTotalUsd)}</span>
        </div>
      </section>

      <section className="mt-10 rounded-lg border border-primary/40 bg-card p-5">
        <h2 className="text-xl">Full build report</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Per-part prices, install hours, the parts-and-labor breakdown and fitment notes — printable. Free with an
          account.
        </p>
        <Link
          to="/builds/$slug/report"
          params={{ slug }}
          className="mt-4 inline-flex rounded-md bg-primary px-5 py-2.5 font-bold text-primary-foreground"
        >
          Unlock full report
        </Link>
      </section>

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
      </div>
    </main>
  );
}
