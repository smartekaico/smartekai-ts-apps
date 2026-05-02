/**
 * Adds credits to an organization by creating a new credit bucket.
 * Credits no longer expire per SOP.
 */
export declare function addCreditsToOrg(orgId: string, amount: number): Promise<void>;
/**
 * Consumes credits from an organization using First-In-First-Out (FIFO) logic across buckets.
 * Credits no longer expire.
 *
 * Returns true if successful, false if insufficient credits.
 */
export declare function consumeCredits(orgId: string, amountToConsume: number, toolName?: string): Promise<{
    success: boolean;
    error?: string;
}>;
/**
 * Gets the current credit balance for an organization
 */
export declare function getCreditBalance(orgId: string): Promise<number>;
/**
 * Checks if an organization has enough credits
 */
export declare function hasEnoughCredits(orgId: string, amount: number): Promise<boolean>;
/**
 * Calculates the credit cost for analyzing a document based on its size.
 * Uses shared rules from credit-utils.ts
 */
export declare function calculateWeightedCredits(text: string): {
    cost: number;
    processedText: string;
};
