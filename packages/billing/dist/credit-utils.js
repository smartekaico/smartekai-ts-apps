"use strict";
/**
 * Shared utility for calculating credit costs based on document size.
 * Used by both Frontend (for UI transparency) and Backend (for enforcement).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CREDIT_COSTS = exports.CREDIT_TIERS = void 0;
exports.calculateWeight = calculateWeight;
exports.truncateContext = truncateContext;
exports.CREDIT_TIERS = {
    BASE_WORDS: 5000,
    MID_WORDS: 25000,
    HARD_LIMIT_WORDS: 50000,
};
exports.CREDIT_COSTS = {
    BASE: 1,
    MID: 3,
    MAX: 5,
};
/**
 * Calculates the credit cost for a given text.
 */
function calculateWeight(text) {
    if (!text || text.trim().length === 0)
        return exports.CREDIT_COSTS.BASE;
    // Rough word count estimation (split by whitespace)
    const words = text.trim().split(/\s+/);
    const wordCount = words.length;
    if (wordCount > exports.CREDIT_TIERS.MID_WORDS) {
        return exports.CREDIT_COSTS.MAX;
    }
    if (wordCount > exports.CREDIT_TIERS.BASE_WORDS) {
        return exports.CREDIT_COSTS.MID;
    }
    return exports.CREDIT_COSTS.BASE;
}
/**
 * Truncates text to prevent API abuse and cost runaway.
 */
function truncateContext(text) {
    const words = text.trim().split(/\s+/);
    if (words.length > exports.CREDIT_TIERS.HARD_LIMIT_WORDS) {
        return (`${words.slice(0, exports.CREDIT_TIERS.HARD_LIMIT_WORDS).join(" ")}\n\n[... تم قص النص لتجاوزه الحد الأقصى المسموح به (50,000 كلمة) ...]`);
    }
    return text;
}
