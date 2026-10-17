import { createFileRoute } from "@tanstack/react-router";
import { CREDIT_PACKS, RENDER_COST, rendersFor } from "@/lib/credit-packs";
import type { CreditPack } from "@/lib/credit-packs";
import { getCreditsPage } from "@/lib/credits";
import { safeNext } from "@/lib/next";

type CreditsSearch = { next?: string };

export const Route = createFileRoute("/credits")({
  validateSearch: (search: Record<string, unknown>): CreditsSearch => ({
    next: typeof search.next === "string" ? safeNext(search.next) : undefined,
  }),
  loaderDeps: ({ search }) => ({ next: search.next }),
  loader: ({ deps }) => getCreditsPage({ data: { next: deps.next } }),
  head: () => ({ meta: [{ title: "Buy credits | 4x4 Builder" }, { name: "robots", content: "noindex" }] }),
  component: CreditsPage,
});

function CreditsPage() {
  const { balance, next } = Route.useLoaderData();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl">Credits</h1>
      <p className="mt-2 text-muted-foreground">
        You have <span className="font-bold text-foreground">{balance} credits</span> (≈ {rendersFor(balance)}{" "}
        renders). Each render uses {RENDER_COST} credits. Credits never expire, and a failed render gives them back.
      </p>
      {next && <p className="mt-1 text-sm text-muted-foreground">After you buy, we'll take you back to your build.</p>}

      <ul className="mt-8 grid gap-4 md:grid-cols-2">
        {CREDIT_PACKS.map((pack) => (
          <PackCard key={pack.id} pack={pack} />
        ))}
      </ul>

      <p className="mt-8 text-xs text-muted-foreground">
        Payments are processed by NOWPayments in USDT on the Tron network (TRC20). Prices in USD.
      </p>
    </main>
  );
}

// Checkout button is a placeholder until the NOWPayments invoice flow lands (Spec 3 §5).
function PackCard({ pack }: { pack: CreditPack }) {
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border bg-card p-5">
      <h2 className="text-xl">{pack.name}</h2>
      <p className="text-3xl font-extrabold">
        {pack.credits} <span className="text-base font-semibold text-muted-foreground">credits</span>
      </p>
      <p className="text-sm text-muted-foreground">≈ {rendersFor(pack.credits)} renders</p>
      <p className="text-lg font-bold">${pack.priceUsd}</p>
      <button
        type="button"
        disabled
        className="mt-2 rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground opacity-50"
      >
        Coming soon
      </button>
    </li>
  );
}
