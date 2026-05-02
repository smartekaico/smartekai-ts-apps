/**
 * Shared utility for calculating credit costs based on document size.
 * Used by both Frontend (for UI transparency) and Backend (for enforcement).
 */

export const CREDIT_TIERS = {
	BASE_WORDS: 5000,
	MID_WORDS: 25000,
	HARD_LIMIT_WORDS: 50000,
};

export const CREDIT_COSTS = {
	BASE: 1,
	MID: 3,
	MAX: 5,
};

/**
 * Calculates the credit cost for a given text.
 */
export function calculateWeight(text: string | null | undefined): number {
	if (!text || text.trim().length === 0) return CREDIT_COSTS.BASE;

	// Rough word count estimation (split by whitespace)
	const words = text.trim().split(/\s+/);
	const wordCount = words.length;

	if (wordCount > CREDIT_TIERS.MID_WORDS) {
		return CREDIT_COSTS.MAX;
	}if (wordCount > CREDIT_TIERS.BASE_WORDS) {
		return CREDIT_COSTS.MID;
	}

	return CREDIT_COSTS.BASE;
}

/**
 * Truncates text to prevent API abuse and cost runaway.
 */
export function truncateContext(text: string): string {
	const words = text.trim().split(/\s+/);
	if (words.length > CREDIT_TIERS.HARD_LIMIT_WORDS) {
		return (
			`${words.slice(0, CREDIT_TIERS.HARD_LIMIT_WORDS).join(" ")}\n\n[... تم قص النص لتجاوزه الحد الأقصى المسموح به (50,000 كلمة) ...]`
		);
	}
	return text;
}
