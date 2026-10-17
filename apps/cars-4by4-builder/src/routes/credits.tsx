import { useEffect, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import type { CreditPurchaseStatus } from "@smartekai/db/cars";
import { CREDIT_PACKS, RENDER_COST, rendersFor } from "@/lib/credit-packs";
import type { CreditPack } from "@/lib/credit-packs";
import { createInvoice, getCreditsPage, getPurchaseStatus, isPurchaseId } from "@/lib/credits";
import type { PurchaseView } from "@/lib/credits";
import { safeNext } from "@/lib/next";
import { notifyCreditsChanged } from "@/lib/use-credits";
import { Toast } from "@/components/Toast";

type CreditsSearch = { next?: string; purchase?: string };

export const Route = createFileRoute("/credits")({
  validateSearch: (search: Record<string, unknown>): CreditsSearch => ({
    next: typeof search.next === "string" ? safeNext(search.next) : undefined,
    purchase: isPurchaseId(search.purchase) ? search.purchase : undefined,
  }),
  loaderDeps: ({ search }) => ({ next: search.next, purchase: search.purchase }),
  loader: ({ deps }) => getCreditsPage({ data: { next: deps.next, purchase: deps.purchase } }),
  head: () => ({ meta: [{ title: "Buy credits | 4x4 Builder" }, { name: "robots", content: "noindex" }] }),
  component: CreditsPage,
});

function CreditsPage() {
  const { balance, next } = Route.useLoaderData();
  const { purchase } = Route.useSearch();
  const [pendingPack, setPendingPack] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buy(pack: CreditPack) {
    setPendingPack(pack.id);
    setError(null);
    try {
      const result = await createInvoice({ data: { packId: pack.id, next } });
      if (result.ok) {
        window.location.assign(result.invoiceUrl); // full navigation; keep buttons disabled
        return;
      }
      setError(result.error);
    } catch {
      setError("Couldn't start checkout — try again.");
    }
    setPendingPack(null);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl">Credits</h1>
      <p className="mt-2 text-muted-foreground">
        You have <span className="font-bold text-foreground">{balance} credits</span> (≈ {rendersFor(balance)}{" "}
        renders). Each render uses {RENDER_COST} credits. Credits never expire, and a failed render gives them back.
      </p>
      {next && !purchase && (
        <p className="mt-1 text-sm text-muted-foreground">After you buy, we'll take you back to your build.</p>
      )}

      {purchase && <PurchaseStatusPanel key={purchase} id={purchase} next={next} />}

      <ul className="mt-8 grid gap-4 md:grid-cols-2">
        {CREDIT_PACKS.map((pack) => (
          <PackCard
            key={pack.id}
            pack={pack}
            pending={pendingPack === pack.id}
            disabled={pendingPack !== null}
            onBuy={() => void buy(pack)}
          />
        ))}
      </ul>

      <p className="mt-8 text-xs text-muted-foreground">
        Payments are processed by NOWPayments in USDT on the Tron network (TRC20). Prices in USD.
      </p>

      {error && <Toast message={error} onDismiss={() => setError(null)} />}
    </main>
  );
}

function PackCard({
  pack,
  pending,
  disabled,
  onBuy,
}: {
  pack: CreditPack;
  pending: boolean;
  disabled: boolean;
  onBuy: () => void;
}) {
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
        onClick={onBuy}
        disabled={disabled}
        aria-busy={pending}
        className="mt-2 rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Starting checkout…" : "Pay with USDT (TRC20)"}
      </button>
    </li>
  );
}

// ── Return page: /credits?purchase=<id> (spec §5 flow 4) ───────────────────

const POLL_MS = 4_000;
const POLL_FOR_MS = 60 * 60_000; // stop polling after an hour; a reload resumes

const TERMINAL = new Set<CreditPurchaseStatus>(["credited", "partially_paid", "expired", "failed", "refunded", "review"]);

type PanelState =
  | { kind: "loading" }
  | { kind: "found"; purchase: PurchaseView }
  | { kind: "missing" }
  | { kind: "stale" }; // stopped polling while still in progress

function PurchaseStatusPanel({ id, next }: { id: string; next?: string }) {
  const router = useRouter();
  const [state, setState] = useState<PanelState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stopAt = Date.now() + POLL_FOR_MS;

    async function poll() {
      let view: PurchaseView | null | undefined;
      try {
        view = await getPurchaseStatus({ data: { id } });
      } catch {
        view = undefined; // transient: keep the last state, try again
      }
      if (cancelled) return;
      if (view === null) {
        setState({ kind: "missing" });
        return;
      }
      if (view) {
        setState({ kind: "found", purchase: view });
        if (TERMINAL.has(view.status)) {
          if (view.status === "credited") {
            notifyCreditsChanged();
            void router.invalidate(); // refresh the balance in the loader data
          }
          return;
        }
      }
      if (Date.now() >= stopAt) {
        setState((s) => (s.kind === "found" ? s : { kind: "stale" }));
        return;
      }
      timer = setTimeout(() => void poll(), POLL_MS);
    }

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id, router]);

  return (
    <section aria-live="polite" className="mt-6 rounded-lg border border-border bg-card p-5">
      <PanelBody state={state} id={id} next={next} />
    </section>
  );
}

function SupportNote({ id }: { id: string }) {
  return (
    <p className="mt-1 text-sm text-muted-foreground">
      Contact support with purchase id <code className="select-all rounded bg-muted px-1 py-0.5 text-xs">{id}</code>.
    </p>
  );
}

function PanelBody({ state, id, next }: { state: PanelState; id: string; next?: string }) {
  if (state.kind === "loading") return <p className="text-muted-foreground">Checking your payment…</p>;
  if (state.kind === "missing") return <p className="font-semibold">We couldn't find that purchase.</p>;
  if (state.kind === "stale") {
    return <p className="text-muted-foreground">Still waiting on this payment — reload the page to check again.</p>;
  }

  const { purchase } = state;
  switch (purchase.status) {
    case "pending":
    case "waiting":
      return (
        <>
          <p className="font-semibold">Waiting for payment</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {purchase.packName} pack — {purchase.credits} credits. This page updates on its own.
          </p>
        </>
      );
    case "confirming":
    case "sending":
      return (
        <>
          <p className="font-semibold">Confirming on Tron</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Payment received — waiting for network confirmations. This usually takes a minute or two.
          </p>
        </>
      );
    case "credited":
      return (
        <>
          <p className="font-semibold text-emerald-600 dark:text-emerald-400">✓ {purchase.credits} credits added</p>
          {next && (
            <a
              href={next}
              className="mt-3 inline-block rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground hover:opacity-90"
            >
              Back to your build
            </a>
          )}
        </>
      );
    case "expired":
    case "failed":
      return (
        <>
          <p className="font-semibold">Payment expired</p>
          <p className="mt-1 text-sm text-muted-foreground">No charge was made. Pick a pack below to try again.</p>
        </>
      );
    case "partially_paid":
      return (
        <>
          <p className="font-semibold">Underpaid</p>
          <SupportNote id={id} />
        </>
      );
    case "refunded":
      return <p className="font-semibold">Payment refunded</p>;
    case "review":
      return (
        <>
          <p className="font-semibold">We're checking this payment</p>
          <SupportNote id={id} />
        </>
      );
  }
}
