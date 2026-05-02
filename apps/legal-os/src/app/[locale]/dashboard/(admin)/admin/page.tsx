import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
	demoRequests,
	platformInvites,
	jurisdictions,
	caseCategories,
	knowledgeBase,
	auditLogs,
} from "@/db/schema";
import { desc, count, sql, gt } from "drizzle-orm";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
	let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
	try {
		session = await auth.api.getSession({
			headers: await headers(),
		});
	} catch (error) {
		console.error("Failed to fetch session in AdminPage:", error);
		redirect("/login");
	}

	// Security Check: Only ADMIN role can access this page
	if (!session || session.user.industryRole !== "ADMIN") {
		redirect("/dashboard");
	}

	// Fetch initial data for the dashboard
	const [
		demoRequestsData,
		invitesData,
		juriCount,
		catCount,
		docCount,
		creditStats,
	] = await Promise.all([
		db
			.select()
			.from(demoRequests)
			.orderBy(desc(demoRequests.createdAt))
			.limit(50),
		db
			.select()
			.from(platformInvites)
			.orderBy(desc(platformInvites.createdAt))
			.limit(50),
		db.select({ value: count() }).from(jurisdictions),
		db.select({ value: count() }).from(caseCategories),
		db.select({ value: count() }).from(knowledgeBase),
		db
			.select({
				action: auditLogs.action,
				totalCredits: sql<number>`CAST(sum(${auditLogs.creditsSpent}) AS INTEGER)`,
			})
			.from(auditLogs)
			.where(gt(auditLogs.creditsSpent, 0))
			.groupBy(auditLogs.action),
	]);

	const kbStats = {
		jurisdictions: Number(juriCount[0].value),
		categories: Number(catCount[0].value),
		documents: Number(docCount[0].value),
	};

	return (
		<div className="container mx-auto p-4 md:p-8">
			<AdminDashboard
				initialDemoRequests={demoRequestsData.map((r) => ({
					...r,
					createdAt: r.createdAt.toISOString(),
				}))}
				kbStats={kbStats}
				creditStats={creditStats}
			/>
		</div>
	);
}
