export type NowPaymentsEnv = "sandbox" | "live";
/** Settlement coin for the cars checkout: USDT on Tron only. */
export declare const NOWPAYMENTS_PAY_CURRENCY = "usdttrc20";
export declare function nowPaymentsEnv(): NowPaymentsEnv;
export declare class NowPaymentsError extends Error {
    readonly operation: string;
    readonly status: number;
    /** NOWPayments' error `code`, or "TIMEOUT" / "NETWORK" / "BAD_RESPONSE". */
    readonly code?: string;
    /** Response body excerpt (max 500 chars). */
    readonly body: string;
    constructor(operation: string, status: number, body: string, parsed?: {
        code?: string;
        message?: string;
    });
}
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
export declare function createInvoice(input: CreateInvoiceInput): Promise<NowInvoice>;
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
export declare function getPayment(paymentId: string): Promise<NowPayment>;
/**
 * Decimal amount (number or numeric string, e.g. 14, "14", "14.00") to integer cents.
 * Returns null if it isn't a plain non-negative decimal with at most 2 fractional digits.
 */
export declare function toCents(value: number | string | null | undefined): number | null;
export interface MinAmount {
    currencyFrom: string;
    currencyTo: string;
    minAmount: number | string | undefined;
    fiatEquivalent: number | string | undefined;
}
/** Setup / go-live check only (spec §2 crypto minimums). */
export declare function getMinAmount(from: string, to: string, fiatEquivalent?: string): Promise<MinAmount>;
/** Lowercase hex HMAC-SHA512 of the recursively key-sorted JSON — for local IPN replay tests. */
export declare function signIpn(payload: unknown, secret: string): string;
/**
 * Which signature form matched: "recursive" (all keys sorted at every depth), "top-level" (NOWPayments'
 * documented `JSON.stringify(params, Object.keys(params).sort())`), or null. Never throws.
 */
export declare function matchIpnSignature(rawBody: string, header: string | null | undefined, secret: string): "recursive" | "top-level" | null;
/** True if `header` (x-nowpayments-sig) is a valid signature of `rawBody` under either accepted form. Never throws. */
export declare function verifyIpnSignature(rawBody: string, header: string | null | undefined, secret: string): boolean;
