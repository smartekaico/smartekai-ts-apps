import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { db } from "../lib/db";

async function fixKbSearch() {
	console.log("🚀 Starting Knowledge Base Search Fix...");

	try {
		// 1. Add content_tsv column if it doesn't exist
		console.log("📝 Adding content_tsv column...");
		await db.query(`
      ALTER TABLE kb_chunks 
      ADD COLUMN IF NOT EXISTS content_tsv tsvector 
      GENERATED ALWAYS AS (to_tsvector('simple', coalesce(content_text, ''))) STORED;
    `);

		// 2. Create GIN index on content_tsv
		console.log("⚡ Creating GIN index on content_tsv...");
		await db.query(`
      CREATE INDEX IF NOT EXISTS kb_chunks_tsv_idx ON kb_chunks USING gin(content_tsv);
    `);

		// 3. Verify hybrid_search function (it should already be there but let's ensure it works)
		console.log("🔍 Verifying hybrid_search function...");
		const result = await db.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_name = 'hybrid_search';
    `);

		if (result.rowCount === 0) {
			console.log(
				"⚠️ Warning: hybrid_search function not found in information_schema.",
			);
			console.log(
				"Please ensure you have run the src/db/kb-schema.sql file in your Neon console.",
			);
		} else {
			console.log("✅ hybrid_search function found.");
		}

		console.log("🎉 Knowledge Base Search Fix completed successfully!");
	} catch (error) {
		console.error("❌ Error fixing KB search:", error);
		process.exit(1);
	} finally {
		process.exit(0);
	}
}

fixKbSearch();
