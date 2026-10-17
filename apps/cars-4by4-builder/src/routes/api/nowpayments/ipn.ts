import { createFileRoute } from "@tanstack/react-router";
import { NowPaymentsError, getPayment, matchIpnSignature } from "@smartekai/nowpayments";
import type { NowPayment } from "@smartekai/nowpayments";
import { applyPayment } from "@/server/checkout";
import { requestIp } from "@/server/request";

// Spec 3 §5 flow 3: NOWPayments IPN. The body is only a hint — we take its
// payment_id and act on GET /payment/{id}. Logs carry ids/statuses only, never
// the raw body or secrets.

const LOG = "[nowpayments] ipn:";
const MAX_BODY_BYTES = 64 * 1024;

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** payment_id from the parsed body (number or numeric string), or null. */
function paymentIdOf(rawBody: string): string | null {
  try {
    const parsed: unknown = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object") return null;
    const id = (parsed as { payment_id?: unknown }).payment_id;
    if (typeof id === "number" && Number.isSafeInteger(id) && id > 0) return String(id);
    if (typeof id === "string" && /^\d{1,30}$/.test(id)) return id;
    return null;
  } catch {
    return null;
  }
}

function allowedIps(): string[] | null {
  const list = (process.env.NOWPAYMENTS_IPN_IPS ?? "")
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);
  return list.length > 0 ? list : null;
}

async function handleIpn(request: Request): Promise<Response> {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret) {
    console.error(`${LOG} NOWPAYMENTS_IPN_SECRET is not set — rejecting with 500 so NOWPayments retries`);
    return json(500, { ok: false });
  }

  // Raw text first: the signature is computed over the parsed raw body.
  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) return json(400, { ok: false, error: "body too large" });

  // (a) Signature.
  const form = matchIpnSignature(rawBody, request.headers.get("x-nowpayments-sig"), secret);
  if (!form) {
    console.warn(`${LOG} invalid or missing signature — 401`);
    return json(401, { ok: false, error: "invalid signature" });
  }

  // (b) Optional IP allowlist.
  const ips = allowedIps();
  if (ips) {
    const ip = requestIp();
    if (!ips.includes(ip)) {
      console.warn(`${LOG} request from ${ip} not in NOWPAYMENTS_IPN_IPS — 403`);
      return json(403, { ok: false, error: "forbidden" });
    }
  }

  // (c) Never trust the body: only payment_id, then GET /payment.
  const paymentId = paymentIdOf(rawBody);
  if (!paymentId) {
    console.warn(`${LOG} signed body has no valid payment_id — 400`);
    return json(400, { ok: false, error: "missing payment_id" });
  }
  console.info(`${LOG} payment ${paymentId}: signature matched (${form} form)`);

  let payment: NowPayment;
  try {
    payment = await getPayment(paymentId);
  } catch (err) {
    if (err instanceof NowPaymentsError) {
      console.error(
        `${LOG} payment ${paymentId}: GET /payment failed (status=${err.status} code=${err.code ?? "-"}) — 503, NOWPayments retries`,
      );
      return json(503, { ok: false });
    }
    console.error(`${LOG} payment ${paymentId}: GET /payment error — 500:`, err instanceof Error ? err.message : err);
    return json(500, { ok: false });
  }

  // (d)/(e) Match + status handling.
  try {
    const outcome = await applyPayment(payment);
    console.info(`${LOG} payment ${paymentId} (${payment.status}): ${outcome}`);
    return json(200, { ok: true });
  } catch (err) {
    console.error(`${LOG} payment ${paymentId}: DB error — 500, NOWPayments retries:`, err);
    return json(500, { ok: false });
  }
}

export const Route = createFileRoute("/api/nowpayments/ipn")({
  server: {
    handlers: {
      POST: ({ request }) => handleIpn(request),
      // POST only: without this, other methods fall through to the SSR page shell.
      ANY: () => new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } }),
    },
  },
});
