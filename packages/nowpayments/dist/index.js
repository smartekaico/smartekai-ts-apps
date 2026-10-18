"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NowPaymentsError = exports.NOWPAYMENTS_PAY_CURRENCY = void 0;
exports.nowPaymentsEnv = nowPaymentsEnv;
exports.createInvoice = createInvoice;
exports.getPayment = getPayment;
exports.toCents = toCents;
exports.getMinAmount = getMinAmount;
exports.priceMeetsMinimum = priceMeetsMinimum;
exports.signIpn = signIpn;
exports.matchIpnSignature = matchIpnSignature;
exports.verifyIpnSignature = verifyIpnSignature;
/**
 * Thin NOWPayments client — plain fetch, no SDK. Server-side only: it holds the
 * API key. NOWPAYMENTS_ENV picks the API host ("sandbox" | "live"; anything else,
 * including unset, throws). Apps never call NOWPayments directly (AGENTS.md:
 * providers stay behind a package).
 */
const node_crypto_1 = require("node:crypto");
/** Settlement coin for the cars checkout: USDT on Tron only. */
exports.NOWPAYMENTS_PAY_CURRENCY = "usdttrc20";
const BASE_URL = {
    sandbox: "https://api-sandbox.nowpayments.io/v1",
    live: "https://api.nowpayments.io/v1",
};
function nowPaymentsEnv() {
    const value = process.env.NOWPAYMENTS_ENV;
    if (value !== "sandbox" && value !== "live") {
        throw new Error(`NOWPAYMENTS_ENV must be "sandbox" or "live", got ${value === undefined ? "nothing (unset)" : `"${value}"`}`);
    }
    return value;
}
function requireApiKey() {
    const value = process.env.NOWPAYMENTS_API_KEY;
    if (!value) {
        throw new Error("NOWPAYMENTS_API_KEY is not set — packages/nowpayments needs it to reach NOWPayments");
    }
    return value;
}
class NowPaymentsError extends Error {
    operation;
    status;
    /** NOWPayments' error `code`, or "TIMEOUT" / "NETWORK" / "BAD_RESPONSE". */
    code;
    /** Response body excerpt (max 500 chars). */
    body;
    constructor(operation, status, body, parsed) {
        const fields = parsed ?? parseErrorBody(body);
        const excerpt = body.slice(0, 500);
        const parts = [`NOWPayments ${operation} failed: HTTP ${status}`];
        if (fields.code)
            parts.push(`code=${fields.code}`);
        if (fields.message)
            parts.push(`message=${fields.message.slice(0, 200)}`);
        parts.push(excerpt);
        super(parts.join(" "));
        this.operation = operation;
        this.status = status;
        this.name = "NowPaymentsError";
        this.code = fields.code;
        this.body = excerpt;
    }
}
exports.NowPaymentsError = NowPaymentsError;
/** Best-effort parse of a {status, code, message} error body. Never throws. */
function parseErrorBody(body) {
    try {
        const json = JSON.parse(body);
        if (!json || typeof json !== "object")
            return {};
        const j = json;
        return {
            code: typeof j.code === "string" && j.code ? j.code : undefined,
            message: typeof j.message === "string" && j.message ? j.message : undefined,
        };
    }
    catch {
        return {};
    }
}
const FETCH_TIMEOUT_MS = 15_000;
/** fetch with a hard timeout; timeout/network failures surface as NowPaymentsError (status 0). */
async function timedFetch(operation, url, init) {
    try {
        return await fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    }
    catch (err) {
        const name = err instanceof Error ? err.name : "";
        if (name === "TimeoutError" || name === "AbortError") {
            throw new NowPaymentsError(operation, 0, `request timed out after ${FETCH_TIMEOUT_MS}ms`, { code: "TIMEOUT" });
        }
        // Deliberately not echoing err.message: keep messages free of anything but our own text.
        throw new NowPaymentsError(operation, 0, `network error: ${name || "unknown"}`, { code: "NETWORK" });
    }
}
async function request(operation, path, init) {
    const base = BASE_URL[nowPaymentsEnv()];
    const res = await timedFetch(operation, `${base}${path}`, {
        method: init.method,
        headers: { "x-api-key": requireApiKey(), "Content-Type": "application/json" },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const text = await res.text();
    if (!res.ok)
        throw new NowPaymentsError(operation, res.status, text);
    try {
        const json = JSON.parse(text);
        if (!json || typeof json !== "object")
            throw new Error("not an object");
        return json;
    }
    catch {
        throw new NowPaymentsError(operation, res.status, text, { code: "BAD_RESPONSE" });
    }
}
/** The API returns ids as numbers in some places and strings in others; we always hand out strings. */
function str(value) {
    if (typeof value === "string")
        return value || undefined;
    if (typeof value === "number" && Number.isFinite(value))
        return String(value);
    return undefined;
}
async function createInvoice(input) {
    const json = await request("createInvoice", "/invoice", {
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
function amount(value) {
    return typeof value === "number" || typeof value === "string" ? value : undefined;
}
function lower(value) {
    return typeof value === "string" ? value.toLowerCase() : undefined;
}
async function getPayment(paymentId) {
    const json = await request("getPayment", `/payment/${encodeURIComponent(paymentId)}`, {
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
function toCents(value) {
    if (value === null || value === undefined)
        return null;
    const s = typeof value === "number" ? (Number.isFinite(value) ? String(value) : "") : value.trim();
    const m = /^(\d+)(?:\.(\d{1,2})0*)?$/.exec(s);
    if (!m)
        return null;
    return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}
/**
 * `GET /min-amount` — the floor NOWPayments puts under a payment, per currency pair.
 *
 * With `from` set to the price currency, `fiatEquivalent` is the floor in fiat, which is what
 * {@link priceMeetsMinimum} wants. The floor floats (usdttrc20 was $11.36, then $18.55), so this
 * is a per-checkout check, not a go-live constant.
 */
async function getMinAmount(from, to, fiatEquivalent) {
    const qs = new URLSearchParams({ currency_from: from, currency_to: to });
    if (fiatEquivalent)
        qs.set("fiat_equivalent", fiatEquivalent);
    const json = await request("getMinAmount", `/min-amount?${qs.toString()}`, {
        method: "GET",
    });
    return {
        currencyFrom: str(json.currency_from) ?? from,
        currencyTo: str(json.currency_to) ?? to,
        minAmount: amount(json.min_amount),
        fiatEquivalent: amount(json.fiat_equivalent),
    };
}
/**
 * True if `priceAmount` (in the price currency, e.g. USD) reaches the provider's floor.
 *
 * Fail-open: a missing, zero or unparsable floor counts as "no floor" (true), so a stale or
 * broken `/min-amount` response never blocks a sale by itself.
 */
function priceMeetsMinimum(priceAmount, minFiat) {
    const min = typeof minFiat === "number" ? minFiat : Number(minFiat);
    if (!Number.isFinite(min) || min <= 0)
        return true;
    const price = typeof priceAmount === "number" ? priceAmount : Number(priceAmount);
    return Number.isFinite(price) && price >= min;
}
// ---------------------------------------------------------------------------
// IPN signature
// ---------------------------------------------------------------------------
/** JSON.stringify with object keys sorted at every depth. */
function stringifyRecursiveSorted(value) {
    const sort = (v) => {
        if (Array.isArray(v))
            return v.map(sort);
        if (v && typeof v === "object") {
            const out = {};
            for (const k of Object.keys(v).sort())
                out[k] = sort(v[k]);
            return out;
        }
        return v;
    };
    return JSON.stringify(sort(value));
}
/** NOWPayments' documented Node form: top-level key list as the replacer (nested objects keep key order, and
 * the replacer array also filters nested keys to the top-level names — kept verbatim to match their sample). */
function stringifyTopLevelReplacer(value) {
    return JSON.stringify(value, Object.keys(value).sort());
}
function hmacHex(message, secret) {
    return (0, node_crypto_1.createHmac)("sha512", secret).update(message).digest("hex");
}
/** Lowercase hex HMAC-SHA512 of the recursively key-sorted JSON — for local IPN replay tests. */
function signIpn(payload, secret) {
    return hmacHex(stringifyRecursiveSorted(payload), secret);
}
function safeEqualHex(a, b) {
    const ba = Buffer.from(a, "utf8");
    const bb = Buffer.from(b, "utf8");
    return ba.length === bb.length && (0, node_crypto_1.timingSafeEqual)(ba, bb);
}
/**
 * Which signature form matched: "recursive" (all keys sorted at every depth), "top-level" (NOWPayments'
 * documented `JSON.stringify(params, Object.keys(params).sort())`), or null. Never throws.
 */
function matchIpnSignature(rawBody, header, secret) {
    try {
        if (!header || !secret)
            return null;
        const sig = header.trim().toLowerCase();
        const parsed = JSON.parse(rawBody);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
            return null;
        if (safeEqualHex(sig, hmacHex(stringifyRecursiveSorted(parsed), secret)))
            return "recursive";
        if (safeEqualHex(sig, hmacHex(stringifyTopLevelReplacer(parsed), secret))) {
            return "top-level";
        }
        return null;
    }
    catch {
        return null;
    }
}
/** True if `header` (x-nowpayments-sig) is a valid signature of `rawBody` under either accepted form. Never throws. */
function verifyIpnSignature(rawBody, header, secret) {
    return matchIpnSignature(rawBody, header, secret) !== null;
}
