"use strict";
/**
 * Thin PayPal REST client (OAuth2 + Orders v2) — plain fetch, no SDK.
 * Server-side only: it holds the client secret. PAYPAL_ENV picks the API host
 * ("sandbox" by default, "live" for real money). Apps never call PayPal's REST
 * API directly (AGENTS.md: providers stay behind a package).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayPalError = void 0;
exports.paypalEnv = paypalEnv;
exports.getAccessToken = getAccessToken;
exports.createOrder = createOrder;
exports.captureOrder = captureOrder;
const BASE_URL = {
    sandbox: "https://api-m.sandbox.paypal.com",
    live: "https://api-m.paypal.com",
};
function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is not set — packages/paypal needs it to reach PayPal`);
    }
    return value;
}
function paypalEnv() {
    const value = process.env.PAYPAL_ENV ?? "sandbox";
    if (value !== "sandbox" && value !== "live") {
        throw new Error(`PAYPAL_ENV must be "sandbox" or "live", got "${value}"`);
    }
    return value;
}
class PayPalError extends Error {
    operation;
    status;
    body;
    constructor(operation, status, body) {
        super(`PayPal ${operation} failed: HTTP ${status} ${body.slice(0, 500)}`);
        this.operation = operation;
        this.status = status;
        this.body = body;
        this.name = "PayPalError";
    }
}
exports.PayPalError = PayPalError;
let cachedToken;
/** OAuth2 client-credentials token, cached until a minute before it expires. */
async function getAccessToken() {
    const env = paypalEnv();
    if (cachedToken && cachedToken.env === env && cachedToken.expiresAt > Date.now()) {
        return cachedToken.token;
    }
    const basic = Buffer.from(`${requireEnv("PAYPAL_CLIENT_ID")}:${requireEnv("PAYPAL_CLIENT_SECRET")}`).toString("base64");
    const res = await fetch(`${BASE_URL[env]}/v1/oauth2/token`, {
        method: "POST",
        headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: "grant_type=client_credentials",
    });
    const text = await res.text();
    if (!res.ok)
        throw new PayPalError("getAccessToken", res.status, text);
    const json = JSON.parse(text);
    cachedToken = { env, token: json.access_token, expiresAt: Date.now() + (json.expires_in - 60) * 1000 };
    return json.access_token;
}
async function post(operation, path, options = {}) {
    const token = await getAccessToken();
    const res = await fetch(`${BASE_URL[paypalEnv()]}${path}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
            // Idempotency: PayPal replays the original response for a repeated request id.
            ...(options.requestId ? { "PayPal-Request-Id": options.requestId } : {}),
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const text = await res.text();
    if (!res.ok)
        throw new PayPalError(operation, res.status, text);
    return JSON.parse(text);
}
/** Orders v2, intent CAPTURE, USD. Digital goods: no shipping address is collected. */
async function createOrder({ amountUsd, customId, description }) {
    const order = await post("createOrder", "/v2/checkout/orders", {
        body: {
            intent: "CAPTURE",
            purchase_units: [{ amount: { currency_code: "USD", value: amountUsd }, custom_id: customId, description }],
            application_context: { shipping_preference: "NO_SHIPPING" },
        },
    });
    return { id: order.id };
}
/** Captures an approved order. Repeating it for the same order replays PayPal's original response. */
async function captureOrder(orderId) {
    const order = await post("captureOrder", `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
        requestId: `capture-${orderId}`,
    });
    const unit = order.purchase_units?.[0];
    const capture = unit?.payments?.captures?.[0];
    return {
        orderId: order.id,
        captureId: capture?.id ?? null,
        status: capture?.status ?? order.status,
        amountUsd: capture?.amount?.value ?? null,
        currency: capture?.amount?.currency_code ?? null,
        customId: capture?.custom_id ?? unit?.custom_id ?? null,
    };
}
