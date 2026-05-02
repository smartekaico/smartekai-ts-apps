import { NextResponse } from "next/server";
import { db } from "@/db";
import { caseAnalyses, generatedContracts, members, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, sum, count, desc } from "drizzle-orm";

export async function GET() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const activeOrgId =
		session.session.activeOrganizationId || session.user.activeOrganizationId;

	if (!activeOrgId) {
		return NextResponse.json(
			{ error: "No active organization" },
			{ status: 403 },
		);
	}

	try {
		// 1. Get all members of the organization
		const orgMembers = await db
			.select({
				id: members.id,
				userId: members.userId,
				role: members.role,
				userName: users.name,
				userEmail: users.email,
				userImage: users.image,
			})
			.from(members)
			.innerJoin(users, eq(members.userId, users.id))
			.where(eq(members.organizationId, activeOrgId));

		// 2. Aggregate Analysis Usage
		const analysisUsage = await db
			.select({
				userId: caseAnalyses.userId,
				totalCredits: sum(caseAnalyses.creditsConsumed).mapWith(Number),
				totalCount: count(caseAnalyses.id),
			})
			.from(caseAnalyses)
			.where(eq(caseAnalyses.organizationId, activeOrgId))
			.groupBy(caseAnalyses.userId);

		// 3. Aggregate Contract Usage
		const contractUsage = await db
			.select({
				userId: generatedContracts.userId,
				totalCredits: sum(generatedContracts.creditsConsumed).mapWith(Number),
				totalCount: count(generatedContracts.id),
			})
			.from(generatedContracts)
			.where(eq(generatedContracts.organizationId, activeOrgId))
			.groupBy(generatedContracts.userId);

		// 4. Combine data
		const memberUsage = orgMembers
			.map((member) => {
				const au = analysisUsage.find((u) => u.userId === member.userId) || {
					totalCredits: 0,
					totalCount: 0,
				};
				const cu = contractUsage.find((u) => u.userId === member.userId) || {
					totalCredits: 0,
					totalCount: 0,
				};

				return {
					...member,
					usage: {
						credits: au.totalCredits + cu.totalCredits,
						analyses: au.totalCount,
						contracts: cu.totalCount,
						totalActions: au.totalCount + cu.totalCount,
					},
				};
			})
			.sort((a, b) => b.usage.credits - a.usage.credits);

		return NextResponse.json(memberUsage);
	} catch (error) {
		console.error("TEAM USAGE API ERROR:", error);
		return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
	}
}
