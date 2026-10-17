/**
 * Thin PayPal REST client (OAuth2 + Orders v2) — plain fetch, no SDK.
 * Server-side only: it holds the client secret. PAYPAL_ENV picks the API host
 * ("sandbox" by default, "live" for real money). Apps never call PayPal's REST
 * API directly (AGENTS.md: providers stay behind a package).
 */
export type PayPalEnv = "sandbox" | "live";
export declare function paypalEnv(): PayPalEnv;
export declare class PayPalError extends Error {
    readonly operation: string;
    readonly status: number;
    readonly body: string;
    /** PayPal's machine-readable reason, e.g. "ORDER_ALREADY_CAPTURED", "invalid_client", or "TIMEOUT". */
    readonly issue?: string;
    /** PayPal's debug_id, quote it when contacting PayPal support. */
    readonly debugId?: string;
    constructor(operation: string, status: number, body: string, parsed?: {
        issue?: string;
        debugId?: string;
    });
}
/** OAuth2 client-credentials token, cached until a minute before it expires. */
export declare function getAccessToken(): Promise<string>;
export type CreateOrderInput = {
    /** Decimal string, e.g. "9.99". */
    amountUsd: string;
    /** Echoed back on capture (max 127 chars). */
    customId: string;
    /** Shown to the buyer (max 127 chars). */
    description: string;
};
/** Orders v2, intent CAPTURE, USD. Digital goods: no shipping address is collected. */
export declare function createOrder({ amountUsd, customId, description }: CreateOrderInput): Promise<{
    id: string;
}>;
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
/** Captures an approved order. Repeating it for the same order replays PayPal's original response. */
export declare function captureOrder(orderId: string): Promise<CaptureResult>;
