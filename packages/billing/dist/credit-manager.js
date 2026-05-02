"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addCreditsToOrg = addCreditsToOrg;
exports.consumeCredits = consumeCredits;
exports.getCreditBalance = getCreditBalance;
exports.hasEnoughCredits = hasEnoughCredits;
exports.calculateWeightedCredits = calculateWeightedCredits;
const db_1 = require("@smartekai/db");
const drizzle_orm_1 = require("drizzle-orm");
const nanoid_1 = require("nanoid");
const credit_utils_1 = require("./credit-utils");
/**
 * Adds credits to an organization by creating a new credit bucket.
 * Credits no longer expire per SOP.
 */
async function addCreditsToOrg(orgId, amount) {
    await db_1.db.transaction(async (tx) => {
        // 1. Create a new bucket
        await tx.insert(db_1.creditBuckets).values({
            id: `bucket_${(0, nanoid_1.nanoid)(10)}`,
            organizationId: orgId,
            amount: amount,
            initialAmount: amount,
            expiryDate: null, // No expiry
            noticeSent: false,
            createdAt: new Date(),
        });
        // 2. Update the organization's cached total balance
        await tx
            .update(db_1.organizations)
            .set({
            creditBalance: (0, drizzle_orm_1.sql) `${db_1.organizations.creditBalance} + ${amount}`,
        })
            .where((0, drizzle_orm_1.eq)(db_1.organizations.id, orgId));
    });
}
/**
 * Consumes credits from an organization using First-In-First-Out (FIFO) logic across buckets.
 * Credits no longer expire.
 *
 * Returns true if successful, false if insufficient credits.
 */
async function consumeCredits(orgId, amountToConsume, toolName) {
    return await db_1.db.transaction(async (tx) => {
        // 1. Check total available balance first (quick check)
        const [org] = await tx
            .select()
            .from(db_1.organizations)
            .where((0, drizzle_orm_1.eq)(db_1.organizations.id, orgId))
            .limit(1);
        if (!org) {
            return { success: false, error: "Organization not found" };
        }
        if (org.creditBalance < amountToConsume) {
            return {
                success: false,
                error: "Insufficient credits. Please upgrade your plan.",
            };
        }
        // 2. Get all active buckets for this org, sorted by createdAt (FIFO)
        const activeBuckets = await tx
            .select()
            .from(db_1.creditBuckets)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(db_1.creditBuckets.organizationId, orgId), (0, drizzle_orm_1.gt)(db_1.creditBuckets.amount, 0)))
            .orderBy((0, drizzle_orm_1.asc)(db_1.creditBuckets.createdAt));
        // 3. Verify total across active buckets
        const totalActive = activeBuckets.reduce((sum, b) => sum + b.amount, 0);
        if (totalActive < amountToConsume) {
            return {
                success: false,
                error: "Insufficient available credits in buckets",
            };
        }
        // 4. Consume from buckets
        let remainingToConsume = amountToConsume;
        for (const bucket of activeBuckets) {
            if (remainingToConsume <= 0)
                break;
            const take = Math.min(bucket.amount, remainingToConsume);
            await tx
                .update(db_1.creditBuckets)
                .set({ amount: bucket.amount - take })
                .where((0, drizzle_orm_1.eq)(db_1.creditBuckets.id, bucket.id));
            remainingToConsume -= take;
        }
        // 5. Update cached total
        await tx
            .update(db_1.organizations)
            .set({ creditBalance: org.creditBalance - amountToConsume })
            .where((0, drizzle_orm_1.eq)(db_1.organizations.id, orgId));
        // 6. Log the credit consumption
        await tx.insert(db_1.auditLogs).values({
            id: (0, nanoid_1.nanoid)(),
            organizationId: orgId,
            action: "CREDITS_CONSUMED",
            details: toolName
                ? `Credits consumed for ${toolName}`
                : "Credits consumed",
            creditsSpent: amountToConsume,
            createdAt: new Date(),
        });
        return { success: true };
    });
}
/**
 * Gets the current credit balance for an organization
 */
async function getCreditBalance(orgId) {
    const [org] = await db_1.db
        .select({ creditBalance: db_1.organizations.creditBalance })
        .from(db_1.organizations)
        .where((0, drizzle_orm_1.eq)(db_1.organizations.id, orgId))
        .limit(1);
    return org?.creditBalance ?? 0;
}
/**
 * Checks if an organization has enough credits
 */
async function hasEnoughCredits(orgId, amount) {
    const balance = await getCreditBalance(orgId);
    return balance >= amount;
}
/**
 * Calculates the credit cost for analyzing a document based on its size.
 * Uses shared rules from credit-utils.ts
 */
function calculateWeightedCredits(text) {
    const cost = (0, credit_utils_1.calculateWeight)(text);
    const processedText = (0, credit_utils_1.truncateContext)(text);
    return { cost, processedText };
}
