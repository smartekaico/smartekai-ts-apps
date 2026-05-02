import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { KnowledgeBaseManager } from "@/components/admin/KnowledgeBaseManager";

export const dynamic = "force-dynamic";

export default async function KnowledgeBasePage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	// Security Check: Only ADMIN role can access this page
	if (!session || session.user.industryRole !== "ADMIN") {
		redirect("/dashboard");
	}

	return (
		<div className="container mx-auto p-4 md:p-8">
			<KnowledgeBaseManager />
		</div>
	);
}
