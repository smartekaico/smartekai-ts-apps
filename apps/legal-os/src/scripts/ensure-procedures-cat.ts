import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { db } from "../lib/db";

async function main() {
	console.log("Checking for 'procedures' category (Raw SQL)...");

	const result = await db.query(
		"SELECT id FROM kb_categories WHERE id = $1 LIMIT 1",
		["procedures"],
	);

	if (result.rows.length > 0) {
		console.log("✅ 'procedures' category already exists.");
	} else {
		console.log("📝 Creating 'procedures' category (Raw SQL)...");
		await db.query(
			`INSERT INTO kb_categories 
       (id, slug, name_ar, name_en, description_ar, jurisdiction_id, workspace_slug, credits_cost, legal_domain, industry, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
			[
				"procedures",
				"procedures",
				"إجراءات",
				"Procedures",
				"إجراءات التقاضي وتقديم الدعاوى والمواعيد القانونية",
				"kuwait",
				"legal",
				3,
				"PROCEDURAL",
				"LEGAL",
				true,
				new Date(),
			],
		);
		console.log("✅ 'procedures' category created successfully.");
	}
	process.exit(0);
}

main().catch((err) => {
	console.error("❌ Error:", err);
	process.exit(1);
});
