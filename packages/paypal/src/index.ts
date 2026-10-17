/**
 * Thin PayPal REST client (OAuth2 + Orders v2) — plain fetch, no SDK.
 * Server-side only: it holds the client secret. PAYPAL_ENV picks the API host
 * ("sandbox" by default, "live" for real money). Apps never call PayPal's REST
 * API directly (AGENTS.md: providers stay behind a package).
 */

export type PayPalEnv = "sandbox" | "live";

const BASE_URL: Record<PayPalEnv, string> = {
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com",
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set — packages/paypal needs it to reach PayPal`);
  }
  return value;
}

export function paypalEnv(): PayPalEnv {
  const value = process.env.PAYPAL_ENV ?? "sandbox";
  if (value !== "sandbox" && value !== "live") {
    throw new Error(`PAYPAL_ENV must be "sandbox" or "live", got "${value}"`);
  }
  return value;
}

export class PayPalError extends Error {
  /** PayPal's machine-readable reason, e.g. "ORDER_ALREADY_CAPTURED", "invalid_client", or "TIMEOUT". */
  readonly issue?: string;
  /** PayPal's debug_id, quote it when contacting PayPal support. */
  readonly debugId?: string;

  constructor(
    readonly operation: string,
    readonly status: number,
    readonly body: string,
    parsed?: { issue?: string; debugId?: string },
  ) {
    const fields = parsed ?? parseErrorBody(body);
    const parts = [`PayPal ${operation} failed: HTTP ${status}`];
    if (fields.issue) parts.push(`issue=${fields.issue}`);
    if (fields.debugId) parts.push(`debug_id=${fields.debugId}`);
    parts.push(body.slice(0, 500));
    super(parts.join(" "));
    this.name = "PayPalError";
    this.issue = fields.issue;
    this.debugId = fields.debugId;
  }
}

/** Best-effort parse of Orders API ({name, details[].issue, debug_id}) and OAuth ({error}) error bodies. Never throws. */
function parseErrorBody(body: string): { issue?: string; debugId?: string } {
  try {
    const json: unknown = JSON.parse(body);
    if (!json || typeof json !== "object") return {};
    const j = json as { name?: unknown; error?: unknown; debug_id?: unknown; details?: unknown };
    const detailIssue = Array.isArray(j.details) ? (j.details[0] as { issue?: unknown } | undefined)?.issue : undefined;
    const issue = [detailIssue, j.name, j.error].find((v): v is string => typeof v === "string" && v.length > 0);
    return { issue, debugId: typeof j.debug_id === "string" ? j.debug_id : undefined };
  } catch {
    return {};
  }
}

const FETCH_TIMEOUT_MS = 15_000;

/** fetch with a hard timeout; a timeout or network failure surfaces as a PayPalError with operation context. */
async function timedFetch(operation: string, url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new PayPalError(operation, 0, `request timed out after ${FETCH_TIMEOUT_MS}ms`, { issue: "TIMEOUT" });
    }
    throw err;
  }
}

let cachedToken: { env: PayPalEnv; token: string; expiresAt: number } | undefined;

/** OAuth2 client-credentials token, cached until a minute before it expires. */
export async function getAccessToken(): Promise<string> {
  const env = paypalEnv();
  if (cachedToken && cachedToken.env === env && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }
  const basic = Buffer.from(`${requireEnv("PAYPAL_CLIENT_ID")}:${requireEnv("PAYPAL_CLIENT_SECRET")}`).toString(
    "base64",
  );
  const res = await timedFetch("getAccessToken", `${BASE_URL[env]}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const text = await res.text();
  if (!res.ok) throw new PayPalError("getAccessToken", res.status, text);
  const json = JSON.parse(text) as { access_token: string; expires_in: number };
  cachedToken = { env, token: json.access_token, expiresAt: Date.now() + (json.expires_in - 60) * 1000 };
  return json.access_token;
}

async function get<T>(operation: string, path: string): Promise<T> {
  const token = await getAccessToken();
  const res = await timedFetch(operation, `${BASE_URL[paypalEnv()]}${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const text = await res.text();
  if (!res.ok) throw new PayPalError(operation, res.status, text);
  return JSON.parse(text) as T;
}

async function post<T>(operation: string, path: string, options: { body?: unknown; requestId?: string } = {}): Promise<T> {
  const token = await getAccessToken();
  const res = await timedFetch(operation, `${BASE_URL[paypalEnv()]}${path}`, {
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
  if (!res.ok) throw new PayPalError(operation, res.status, text);
  return JSON.parse(text) as T;
}

export type CreateOrderInput = {
  /** Decimal string, e.g. "9.99". */
  amountUsd: string;
  /** Echoed back on capture (max 127 chars). */
  customId: string;
  /** Shown to the buyer (max 127 chars). */
  description: string;
};

/** Orders v2, intent CAPTURE, USD. Digital goods: no shipping address is collected. */
export async function createOrder({ amountUsd, customId, description }: CreateOrderInput): Promise<{ id: string }> {
  const order = await post<{ id: string }>("createOrder", "/v2/checkout/orders", {
    body: {
      intent: "CAPTURE",
      purchase_units: [{ amount: { currency_code: "USD", value: amountUsd }, custom_id: customId, description }],
      application_context: { shipping_preference: "NO_SHIPPING" },
    },
  });
  return { id: order.id };
}

export type OrderResponse = {
  id: string;
  status: string;
  purchase_units?: Array<{
    custom_id?: string;
    payments?: {
      captures?: Array<{
        id: string;
        status: string;
        custom_id?: string;
        amount?: { currency_code: string; value: string };
      }>;
    };
  }>;
};

export type CaptureResult = {
  orderId: string;
  captureId: string | null;
  /** The capture's own status ("COMPLETED" = money moved), or "NO_CAPTURE" if the response held no capture. */
  status: string;
  /** The order's status (informational only; never treat it as proof of payment). */
  orderStatus: string;
  amountUsd: string | null;
  currency: string | null;
  customId: string | null;
};

/**
 * Reads the capture out of an Orders v2 order (capture or GET response). The
 * capture's own status is what proves money moved; no capture → "NO_CAPTURE".
 */
export function parseOrder(order: OrderResponse): CaptureResult {
  const unit = order.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];
  return {
    orderId: order.id,
    captureId: capture?.id ?? null,
    status: capture?.status ?? "NO_CAPTURE",
    orderStatus: order.status,
    amountUsd: capture?.amount?.value ?? null,
    currency: capture?.amount?.currency_code ?? null,
    customId: capture?.custom_id ?? unit?.custom_id ?? null,
  };
}

/** Captures an approved order. Repeating it for the same order replays PayPal's original response. */
export async function captureOrder(orderId: string): Promise<CaptureResult> {
  const order = await post<OrderResponse>("captureOrder", `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    requestId: `capture-${orderId}`,
  });
  return parseOrder(order);
}

/** Reads an order's current state — used to settle a capture whose outcome is unknown (timeout, 5xx). */
export async function getOrder(orderId: string): Promise<CaptureResult> {
  return parseOrder(await get<OrderResponse>("getOrder", `/v2/checkout/orders/${encodeURIComponent(orderId)}`));
}
