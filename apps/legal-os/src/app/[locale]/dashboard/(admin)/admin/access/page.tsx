import { db } from "@/db";
import {
	demoRequests,
	platformInvites,
	jurisdictions,
	caseCategories,
	knowledgeBase,
	auditLogs,
	users,
} from "@/db/schema";
import { AccessManagementView } from "@/components/admin/AccessManagementView";
import { eq, sql, and } from "drizzle-orm";

export default async function AccessManagementPage() {
	const demoRequestsData = await db
		.select()
		.from(demoRequests)
		.where(
			and(
				eq(demoRequests.status, "pending"),
				sql`NOT EXISTS (SELECT 1 FROM ${users} WHERE ${users.email} = ${demoRequests.email})`,
			),
		)
		.orderBy(sql`${demoRequests.createdAt} DESC`);

	const invitesData = await db.query.platformInvites.findMany({
		orderBy: (platformInvites, { desc }) => [desc(platformInvites.createdAt)],
	});

	return (
		<div className="container mx-auto p-4 md:p-8">
			<AccessManagementView
				initialDemoRequests={demoRequestsData.map((r) => ({
					...r,
					createdAt: r.createdAt.toISOString(),
				}))}
				initialInvites={invitesData.map((i) => ({
					...i,
					createdAt: i.createdAt.toISOString(),
				}))}
			/>
		</div>
	);
}
