import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { getGallery } from "@/lib/builds";
import { pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { AI_RENDERS_ENABLED } from "@/lib/features";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { BuildCard } from "@/components/BuildCard";

export const Route = createFileRoute("/")({
  loader: () => getGallery(),
  head: ({ loaderData }) => {
    const title = AI_RENDERS_ENABLED
      ? "Overlander Builder — see upgrades on your truck before you buy"
      : "Overlander Builder — real 4x4 builds, real parts, real prices";
    const featured = loaderData?.builds.at(0);
    const { meta, links } = pageMeta({
      title,
      description: AI_RENDERS_ENABLED
        ? "Pick real off-road upgrades, see them on your own truck, and get an itemized parts list with estimated prices."
        : "Plan your 4x4 build. Start from a popular build, swap parts, see the cost and where to buy.",
      path: "/",
      image: featured?.afterUrl,
      imageAlt: featured ? `${featured.vehicleName} ${featured.presetName} build` : undefined,
    });
    return { meta: [{ title }, ...meta], links };
  },
  component: Home,
});

function Home() {
  const { builds, vehicles } = Route.useLoaderData();
  const [filter, setFilter] = useState("all");
  const featured = builds.at(0);
  const visible = filter === "all" ? builds : builds.filter((b) => b.vehicleId === filter);

  return (
    <main>
      <section className="border-b border-border bg-texture">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-2 md:items-center md:py-16">
          <div>
            <h1 className="text-4xl md:text-5xl">
              {AI_RENDERS_ENABLED ? "Build your 4x4 before you buy" : "Plan your 4x4 build"}
            </h1>
            <p className="mt-4 text-muted-foreground">
              {AI_RENDERS_ENABLED
                ? "Pick real upgrades, see them on your own truck, and get an itemized parts list with estimated prices."
                : "Start from a popular build, swap parts, see the cost and where to buy."}
            </p>
            <Link to="/build" className="mt-6 inline-flex rounded-md bg-primary px-5 py-3 font-bold text-primary-foreground">
              Build yours
            </Link>
          </div>
          {featured ? (
            <div>
              <BeforeAfterSlider beforeUrl={featured.beforeUrl} afterUrl={featured.afterUrl} />
              <p className="mt-2 text-xs text-muted-foreground">
                {featured.vehicleName} — {featured.presetName}. AI visualization — actual appearance may vary.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-2xl">Popular builds</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {[{ id: "all", name: "All" }, ...vehicles].map((v) => (
            <button
              key={v.id}
              type="button"
              aria-pressed={filter === v.id}
              onClick={() => setFilter(v.id)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-semibold",
                filter === v.id ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/60",
              )}
            >
              {v.name}
            </button>
          ))}
        </div>

        {visible.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((b) => (
              <BuildCard key={b.slug} {...b} />
            ))}
          </div>
        ) : (
          <p className="mt-6 text-muted-foreground">
            Gallery builds are on the way.{" "}
            <Link to="/build" className="font-semibold text-primary">
              Start your own build
            </Link>
            .
          </p>
        )}
      </section>
    </main>
  );
}
