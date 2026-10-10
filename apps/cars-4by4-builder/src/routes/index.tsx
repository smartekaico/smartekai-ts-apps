import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { getGallery } from "@/lib/builds";
import { cn } from "@/lib/utils";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { BuildCard } from "@/components/BuildCard";

export const Route = createFileRoute("/")({
  loader: () => getGallery(),
  head: () => ({
    meta: [
      { title: "4x4 Builder — see upgrades on your truck before you buy" },
      { name: "description", content: "Pick real off-road upgrades, see them on your own truck, and get an itemized parts list with estimated prices." },
    ],
  }),
  component: Home,
});

function Home() {
  const { builds, vehicles, region } = Route.useLoaderData();
  const [filter, setFilter] = useState("all");
  const featured = builds.at(0);
  const visible = filter === "all" ? builds : builds.filter((b) => b.vehicleId === filter);

  return (
    <main>
      <section className="border-b border-border bg-texture">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-2 md:items-center md:py-16">
          <div>
            <h1 className="text-4xl md:text-5xl">Build your 4x4 before you buy</h1>
            <p className="mt-4 text-muted-foreground">
              Pick real upgrades, see them on your own truck, and get an itemized parts list with estimated prices.
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
              <BuildCard key={b.slug} {...b} region={region} />
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
