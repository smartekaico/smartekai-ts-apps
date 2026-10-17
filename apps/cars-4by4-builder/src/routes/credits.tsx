import { useRef, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { CREDIT_PACKS, RENDER_COST, rendersFor } from "@/lib/credit-packs";
import type { CreditPack } from "@/lib/credit-packs";
import { capturePayPalOrder, createPayPalOrder, getCreditsPage } from "@/lib/credits";
import { safeNext } from "@/lib/next";
import { notifyCreditsChanged } from "@/lib/use-credits";
import { Toast } from "@/components/Toast";

type CreditsSearch = { next?: string };
type Notice = { message: string; tone: "success" | "error" };

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
  const { balance, paypalClientId } = Route.useLoaderData();
  const { next } = Route.useSearch();
  const router = useRouter();
  const [notice, setNotice] = useState<Notice | null>(null);

  async function purchased(credited: number) {
    notifyCreditsChanged(); // header chip
    await router.invalidate(); // this page's balance
    setNotice({
      tone: "success",
      message: credited > 0 ? `Added ${credited} credits.` : "That order is already in your balance.",
    });
    if (next) window.setTimeout(() => window.location.assign(next), 1500);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl">Credits</h1>
      <p className="mt-2 text-muted-foreground">
        You have <span className="font-bold text-foreground">{balance} credits</span> (≈ {rendersFor(balance)}{" "}
        renders). Each render uses {RENDER_COST} credits. Credits never expire, and a failed render gives them back.
      </p>
      {next && <p className="mt-1 text-sm text-muted-foreground">After you buy, we'll take you back to your build.</p>}

      {paypalClientId ? (
        <PayPalScriptProvider options={{ clientId: paypalClientId, currency: "USD", intent: "capture" }}>
          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            {CREDIT_PACKS.map((pack) => (
              <PackCard
                key={pack.id}
                pack={pack}
                onPurchased={purchased}
                onError={(message) => setNotice({ tone: "error", message })}
              />
            ))}
          </ul>
        </PayPalScriptProvider>
      ) : (
        <p className="mt-8 rounded-md border border-border p-4 text-sm text-muted-foreground">
          Checkout isn't available right now — try again later.
        </p>
      )}

      <p className="mt-8 text-xs text-muted-foreground">Payments are processed by PayPal. Prices in USD.</p>
      {notice && <Toast message={notice.message} tone={notice.tone} onDismiss={() => setNotice(null)} />}
    </main>
  );
}

function PackCard({
  pack,
  onPurchased,
  onError,
}: {
  pack: CreditPack;
  onPurchased: (credited: number) => Promise<void>;
  onError: (message: string) => void;
}) {
  // The last order id PayPal handed us, so an error message can quote it.
  const orderIdRef = useRef<string | null>(null);

  function checkoutUnfinished(orderId: string | null) {
    notifyCreditsChanged(); // a capture may have landed — refresh the header chip
    onError(
      `Checkout didn't finish. If you were charged, contact us with your PayPal order id${orderId ? ` ${orderId}` : ""}.`,
    );
  }

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border bg-card p-5">
      <h2 className="text-xl">{pack.name}</h2>
      <p className="text-3xl font-extrabold">
        {pack.credits} <span className="text-base font-semibold text-muted-foreground">credits</span>
      </p>
      <p className="text-sm text-muted-foreground">≈ {rendersFor(pack.credits)} renders</p>
      <p className="text-lg font-bold">${pack.priceUsd}</p>
      <div className="mt-2 min-h-[50px]">
        <PayPalButtons
          style={{ layout: "vertical", label: "pay" }}
          createOrder={async () => {
            orderIdRef.current = null;
            const result = await createPayPalOrder({ data: { packId: pack.id } });
            if (!result.ok) throw new Error(result.error);
            orderIdRef.current = result.orderId;
            return result.orderId;
          }}
          onApprove={async (data) => {
            orderIdRef.current = data.orderID;
            let result: Awaited<ReturnType<typeof capturePayPalOrder>>;
            try {
              result = await capturePayPalOrder({ data: { orderId: data.orderID, packId: pack.id } });
            } catch (err) {
              console.error("PayPal capture request failed", err);
              checkoutUnfinished(data.orderID);
              return;
            }
            if (!result.ok) {
              notifyCreditsChanged();
              onError(result.error);
              return;
            }
            await onPurchased(result.credited);
          }}
          onError={(err) => {
            console.error("PayPal checkout error", err);
            checkoutUnfinished(orderIdRef.current);
          }}
        />
      </div>
    </li>
  );
}
