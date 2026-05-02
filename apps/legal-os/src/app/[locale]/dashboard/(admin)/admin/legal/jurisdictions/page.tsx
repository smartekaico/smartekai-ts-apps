import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { jurisdictions } from "@/db/schema";
import { JurisdictionsManager } from "@/components/admin/JurisdictionsManager";

export const dynamic = "force-dynamic";

export default async function JurisdictionsPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	// Security Check: Only ADMIN role can access this page
	if (!session || session.user.industryRole !== "ADMIN") {
		redirect("/dashboard");
	}

	const jurisdictionsData = await db.select().from(jurisdictions);

	return (
		<div className="container mx-auto p-4 md:p-8">
			<JurisdictionsManager initialJurisdictions={jurisdictionsData} />
		</div>
	);
}
