import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { eq } from "drizzle-orm";
import dotenv from "dotenv";
import path from "node:path";

// Fix path for env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
	console.log("Adding 'Procedures' category...");

	// Get Kuwait jurisdiction ID
	const juris = await db
		.select()
		.from(schema.jurisdictions)
		.where(eq(schema.jurisdictions.code, "KW"))
		.limit(1);
	const jurisId = juris[0]?.id || "juris_kw_01";

	await db
		.insert(schema.caseCategories)
		.values({
			id: "case_procedure_01",
			slug: "procedures",
			nameAr: "اجراءات",
			nameEn: "Procedures",
			descriptionAr: "نصوص الإجراءات القانونية والمواعيد والمساطر القضائية.",
			jurisdictionId: jurisId,
			workspaceSlug: "kuwait-workspace",
			creditsCost: 2,
			icon: "⚖️",
			legalDomain: "Procedures",
			isActive: true,
		})
		.onConflictDoUpdate({
			target: schema.caseCategories.slug,
			set: {
				nameAr: "اجراءات",
				nameEn: "Procedures",
				legalDomain: "Procedures",
			},
		});

	console.log("Category 'Procedures' added successfully!");
}

main().catch((err) => {
	console.error("Failed to add category:");
	console.error(err);
	process.exit(1);
});
