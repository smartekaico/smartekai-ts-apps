import { getAuthenticatedSession } from "@/lib/auth-utils";
import { OrganizationKBManager } from "@/components/legal/OrganizationKBManager";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Firm Knowledge Base | SmarTekAI Legal OS",
	description: "Manage your firm's private legal precedents and templates.",
};

export const dynamic = "force-dynamic";

export default async function OrganizationKBPage() {
	// Ensure user is logged in
	await getAuthenticatedSession({ requiredRole: ["LEGAL", "ADMIN"] });

	return (
		<div className="container mx-auto p-4 md:p-8">
			<OrganizationKBManager />
		</div>
	);
}
