import { db } from "@/db";
import { organizations, creditBuckets } from "@/db/schema";
import { eq, asc, and, gt, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Adds credits to an organization by creating a new credit bucket.
 * Credits no longer expire per SOP.
 */
export async function addCreditsToOrg(orgId: string, amount: number) {
	await db.transaction(async (tx) => {
		// 1. Create a new bucket
		await tx.insert(creditBuckets).values({
			id: `bucket_${nanoid(10)}`,
			organizationId: orgId,
			amount: amount,
			initialAmount: amount,
			expiryDate: null, // No expiry
			noticeSent: false,
		});

		// 2. Update the organization's cached total balance
		await tx
			.update(organizations)
			.set({
				creditBalance: sql`${organizations.creditBalance} + ${amount}`,
			})
			.where(eq(organizations.id, orgId));
	});
}

/**
 * Consumes credits from an organization using First-In-First-Out (FIFO) logic across buckets.
 * Credits no longer expire.
 *
 * Returns true if successful, false if insufficient credits.
 */
export async function consumeCredits(
	orgId: string,
	amountToConsume: number,
): Promise<{ success: boolean; error?: string }> {
	return await db.transaction(async (tx) => {
		// 1. Check total available balance first (quick check)
		const [org] = await tx
			.select()
			.from(organizations)
			.where(eq(organizations.id, orgId))
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
			.from(creditBuckets)
			.where(
				and(
					eq(creditBuckets.organizationId, orgId),
					gt(creditBuckets.amount, 0),
				),
			)
			.orderBy(asc(creditBuckets.createdAt));

		// 3. Verify total across active buckets
		const totalActive = activeBuckets.reduce((sum, b) => sum + b.amount, 0);
		if (totalActive < amountToConsume) {
			// This should theoretically not happen if creditBalance is in sync
			return {
				success: false,
				error: "Insufficient available credits in buckets",
			};
		}

		// 4. Consume from buckets
		let remainingToConsume = amountToConsume;
		for (const bucket of activeBuckets) {
			if (remainingToConsume <= 0) break;

			const take = Math.min(bucket.amount, remainingToConsume);
			await tx
				.update(creditBuckets)
				.set({ amount: bucket.amount - take })
				.where(eq(creditBuckets.id, bucket.id));

			remainingToConsume -= take;
		}

		// 5. Update cached total
		await tx
			.update(organizations)
			.set({ creditBalance: org.creditBalance - amountToConsume })
			.where(eq(organizations.id, orgId));

		return { success: true };
	});
}

import { calculateWeight, truncateContext } from "./credit-utils";

/**
 * Calculates the credit cost for analyzing a document based on its size.
 * Uses shared rules from credit-utils.ts
 */
export function calculateWeightedCredits(text: string): {
	cost: number;
	processedText: string;
} {
	const cost = calculateWeight(text);
	const processedText = truncateContext(text);
	return { cost, processedText };
}
