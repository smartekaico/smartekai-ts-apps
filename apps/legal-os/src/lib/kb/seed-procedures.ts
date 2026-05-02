import { db } from "@/db";
import { caseCategories } from "@/db/schema";
import { randomUUID } from "node:crypto";

async function seed() {
	console.log("Seeding Procedures category...");
	try {
		const id = randomUUID();
		await db
			.insert(caseCategories)
			.values({
				id,
				slug: "procedures",
				nameAr: "إجراءات",
				nameEn: "Procedures",
				descriptionAr: "إجراءات قانونية وقضائية",
				jurisdictionId: "kuwait",
				workspaceSlug: "legal",
				legalDomain: "PROCEDURAL",
				isActive: true,
			})
			.onConflictDoNothing();
		console.log("Seeded successfully.");
	} catch (err) {
		console.error("Seed failed:", err);
	}
}

seed();
