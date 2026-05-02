/**
 * Shared utility for calculating credit costs based on document size.
 * Used by both Frontend (for UI transparency) and Backend (for enforcement).
 */
export declare const CREDIT_TIERS: {
    BASE_WORDS: number;
    MID_WORDS: number;
    HARD_LIMIT_WORDS: number;
};
export declare const CREDIT_COSTS: {
    BASE: number;
    MID: number;
    MAX: number;
};
/**
 * Calculates the credit cost for a given text.
 */
export declare function calculateWeight(text: string | null | undefined): number;
/**
 * Truncates text to prevent API abuse and cost runaway.
 */
export declare function truncateContext(text: string): string;
