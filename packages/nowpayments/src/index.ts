/**
 * Thin NOWPayments client — plain fetch, no SDK. Server-side only: it holds the
 * API key. NOWPAYMENTS_ENV picks the API host ("sandbox" | "live"; anything else,
 * including unset, throws). Apps never call NOWPayments directly (AGENTS.md:
 * providers stay behind a package).
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export type NowPaymentsEnv = "sandbox" | "live";

/** Settlement coin for the cars checkout: USDT on Tron only. */
export const NOWPAYMENTS_PAY_CURRENCY = "usdttrc20";

const BASE_URL: Record<NowPaymentsEnv, string> = {
  sandbox: "https://api-sandbox.nowpayments.io/v1",
  live: "https://api.nowpayments.io/v1",
};

export function nowPaymentsEnv(): NowPaymentsEnv {
  const value = process.env.NOWPAYMENTS_ENV;
  if (value !== "sandbox" && value !== "live") {
    throw new Error(`NOWPAYMENTS_ENV must be "sandbox" or "live", got ${value === undefined ? "nothing (unset)" : `"${value}"`}`);
  }
  return value;
}

function requireApiKey(): string {
  const value = process.env.NOWPAYMENTS_API_KEY;
  if (!value) {
    throw new Error("NOWPAYMENTS_API_KEY is not set — packages/nowpayments needs it to reach NOWPayments");
  }
  return value;
}

export class NowPaymentsError extends Error {
  /** NOWPayments' error `code`, or "TIMEOUT" / "NETWORK" / "BAD_RESPONSE". */
  readonly code?: string;
  /** Response body excerpt (max 500 chars). */
  readonly body: string;

  constructor(
    readonly operation: string,
    readonly status: number,
    body: string,
    parsed?: { code?: string; message?: string },
  ) {
    const fields = parsed ?? parseErrorBody(body);
    const excerpt = body.slice(0, 500);
    const parts = [`NOWPayments ${operation} failed: HTTP ${status}`];
    if (fields.code) parts.push(`code=${fields.code}`);
    if (fields.message) parts.push(`message=${fields.message.slice(0, 200)}`);
    parts.push(excerpt);
    super(parts.join(" "));
    this.name = "NowPaymentsError";
    this.code = fields.code;
    this.body = excerpt;
  }
}

/** Best-effort parse of a {status, code, message} error body. Never throws. */
function parseErrorBody(body: string): { code?: string; message?: string } {
  try {
    const json: unknown = JSON.parse(body);
    if (!json || typeof json !== "object") return {};
    const j = json as { code?: unknown; message?: unknown };
    return {
      code: typeof j.code === "string" && j.code ? j.code : undefined,
      message: typeof j.message === "string" && j.message ? j.message : undefined,
    };
  } catch {
    return {};
  }
}

const FETCH_TIMEOUT_MS = 15_000;

/** fetch with a hard timeout; timeout/network failures surface as NowPaymentsError (status 0). */
async function timedFetch(operation: string, url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new NowPaymentsError(operation, 0, `request timed out after ${FETCH_TIMEOUT_MS}ms`, { code: "TIMEOUT" });
    }
    // Deliberately not echoing err.message: keep messages free of anything but our own text.
    throw new NowPaymentsError(operation, 0, `network error: ${name || "unknown"}`, { code: "NETWORK" });
  }
}

async function request<T>(operation: string, path: string, init: { method: "GET" | "POST"; body?: unknown }): Promise<T> {
  const base = BASE_URL[nowPaymentsEnv()];
  const res = await timedFetch(operation, `${base}${path}`, {
    method: init.method,
    headers: { "x-api-key": requireApiKey(), "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await res.text();
  if (!res.ok) throw new NowPaymentsError(operation, res.status, text);
  try {
    const json: unknown = JSON.parse(text);
    if (!json || typeof json !== "object") throw new Error("not an object");
    return json as T;
  } catch {
    throw new NowPaymentsError(operation, res.status, text, { code: "BAD_RESPONSE" });
  }
}

/** The API returns ids as numbers in some places and strings in others; we always hand out strings. */
function str(value: unknown): string | undefined {
  if (typeof value === "string") return value || undefined;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

// ---------------------------------------------------------------------------
// Invoice
// ---------------------------------------------------------------------------

export interface CreateInvoiceInput {
  /** Sent as a JSON number (e.g. 14), per the API docs' request examples. */
  priceAmount: number;
  priceCurrency: string;
  payCurrency: string;
  orderId: string;
  orderDescription: string;
  ipnCallbackUrl: string;
  successUrl: string;
  cancelUrl: string;
}

export interface NowInvoice {
  id: string;
  invoiceUrl: string;
}

export async function createInvoice(input: CreateInvoiceInput): Promise<NowInvoice> {
  const json = await request<{ id?: unknown; invoice_url?: unknown }>("createInvoice", "/invoice", {
    method: "POST",
    body: {
      price_amount: input.priceAmount,
      price_currency: input.priceCurrency,
      pay_currency: input.payCurrency,
      order_id: input.orderId,
      order_description: input.orderDescription,
      ipn_callback_url: input.ipnCallbackUrl,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    },
  });
  const id = str(json.id);
  const invoiceUrl = typeof json.invoice_url === "string" ? json.invoice_url : undefined;
  if (!id || !invoiceUrl) {
    throw new NowPaymentsError("createInvoice", 200, JSON.stringify(json), { code: "BAD_RESPONSE" });
  }
  return { id, invoiceUrl };
}

// ---------------------------------------------------------------------------
// Payment
// ---------------------------------------------------------------------------

export interface NowPayment {
  paymentId: string;
  /** Absent for payments not created from an invoice. */
  invoiceId?: string;
  orderId?: string;
  /** waiting | confirming | confirmed | sending | partially_paid | finished | failed | refunded | expired */
  status: string;
  /** As the API gives it (number or numeric string); compare with {@link toCents}. */
  priceAmount: number | string | undefined;
  priceCurrency?: string;
  payCurrency?: string;
  payAmount?: number | string;
  actuallyPaid?: number | string;
}

function amount(value: unknown): number | string | undefined {
  return typeof value === "number" || typeof value === "string" ? value : undefined;
}

function lower(value: unknown): string | undefined {
  return typeof value === "string" ? value.toLowerCase() : undefined;
}

export async function getPayment(paymentId: string): Promise<NowPayment> {
  const json = await request<Record<string, unknown>>("getPayment", `/payment/${encodeURIComponent(paymentId)}`, {
    method: "GET",
  });
  const id = str(json.payment_id);
  const status = typeof json.payment_status === "string" ? json.payment_status : undefined;
  if (!id || !status) {
    throw new NowPaymentsError("getPayment", 200, JSON.stringify(json), { code: "BAD_RESPONSE" });
  }
  return {
    paymentId: id,
    invoiceId: str(json.invoice_id),
    orderId: str(json.order_id),
    status,
    priceAmount: amount(json.price_amount),
    priceCurrency: lower(json.price_currency),
    payCurrency: lower(json.pay_currency),
    payAmount: amount(json.pay_amount),
    actuallyPaid: amount(json.actually_paid),
  };
}

/**
 * Decimal amount (number or numeric string, e.g. 14, "14", "14.00") to integer cents.
 * Returns null if it isn't a plain non-negative decimal with at most 2 fractional digits.
 */
export function toCents(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const s = typeof value === "number" ? (Number.isFinite(value) ? String(value) : "") : value.trim();
  const m = /^(\d+)(?:\.(\d{1,2})0*)?$/.exec(s);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}

export interface MinAmount {
  currencyFrom: string;
  currencyTo: string;
  minAmount: number | string | undefined;
  fiatEquivalent: number | string | undefined;
}

/** Setup / go-live check only (spec §2 crypto minimums). */
export async function getMinAmount(from: string, to: string, fiatEquivalent?: string): Promise<MinAmount> {
  const qs = new URLSearchParams({ currency_from: from, currency_to: to });
  if (fiatEquivalent) qs.set("fiat_equivalent", fiatEquivalent);
  const json = await request<Record<string, unknown>>("getMinAmount", `/min-amount?${qs.toString()}`, {
    method: "GET",
  });
  return {
    currencyFrom: str(json.currency_from) ?? from,
    currencyTo: str(json.currency_to) ?? to,
    minAmount: amount(json.min_amount),
    fiatEquivalent: amount(json.fiat_equivalent),
  };
}

// ---------------------------------------------------------------------------
// IPN signature
// ---------------------------------------------------------------------------

/** JSON.stringify with object keys sorted at every depth. */
function stringifyRecursiveSorted(value: unknown): string {
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(v).sort()) out[k] = sort((v as Record<string, unknown>)[k]);
      return out;
    }
    return v;
  };
  return JSON.stringify(sort(value));
}

/** NOWPayments' documented Node form: top-level key list as the replacer (nested objects keep key order, and
 * the replacer array also filters nested keys to the top-level names — kept verbatim to match their sample). */
function stringifyTopLevelReplacer(value: Record<string, unknown>): string {
  return JSON.stringify(value, Object.keys(value).sort());
}

function hmacHex(message: string, secret: string): string {
  return createHmac("sha512", secret).update(message).digest("hex");
}

/** Lowercase hex HMAC-SHA512 of the recursively key-sorted JSON — for local IPN replay tests. */
export function signIpn(payload: unknown, secret: string): string {
  return hmacHex(stringifyRecursiveSorted(payload), secret);
}

function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/**
 * Which signature form matched: "recursive" (all keys sorted at every depth), "top-level" (NOWPayments'
 * documented `JSON.stringify(params, Object.keys(params).sort())`), or null. Never throws.
 */
export function matchIpnSignature(
  rawBody: string,
  header: string | null | undefined,
  secret: string,
): "recursive" | "top-level" | null {
  try {
    if (!header || !secret) return null;
    const sig = header.trim().toLowerCase();
    const parsed: unknown = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    if (safeEqualHex(sig, hmacHex(stringifyRecursiveSorted(parsed), secret))) return "recursive";
    if (safeEqualHex(sig, hmacHex(stringifyTopLevelReplacer(parsed as Record<string, unknown>), secret))) {
      return "top-level";
    }
    return null;
  } catch {
    return null;
  }
}

/** True if `header` (x-nowpayments-sig) is a valid signature of `rawBody` under either accepted form. Never throws. */
export function verifyIpnSignature(rawBody: string, header: string | null | undefined, secret: string): boolean {
  return matchIpnSignature(rawBody, header, secret) !== null;
}
