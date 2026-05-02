import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { models, products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ModelManagementClient } from "./ModelManagementClient";

export const dynamic = "force-dynamic";

export default async function ModelsPage() {
	let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
	try {
		session = await auth.api.getSession({
			headers: await headers(),
		});
	} catch (error) {
		console.error("Failed to fetch session in ModelsPage:", error);
		redirect("/login");
	}

	// Security Check: Only ADMIN role can access this page
	if (!session || session.user.industryRole !== "ADMIN") {
		redirect("/dashboard");
	}

	const [allModels, allProducts] = await Promise.all([
		db.select().from(models),
		db.select().from(products),
	]);

	return (
		<div className="container mx-auto p-4 md:p-8">
			<ModelManagementClient
				initialModels={allModels.map((m) => ({
					...m,
					createdAt: m.createdAt.toISOString(),
				}))}
				initialProducts={allProducts}
			/>
		</div>
	);
}
