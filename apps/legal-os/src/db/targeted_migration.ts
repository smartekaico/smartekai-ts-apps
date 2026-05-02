import { config } from "dotenv";
config({ path: ".env.local" });
import { db } from "./index";
import { sql } from "drizzle-orm";

async function runMigration() {
	console.log("Running targeted migration...");

	try {
		// 1. Create models table
		await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "models" (
        "id" text PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "provider" text DEFAULT 'OpenRouter' NOT NULL,
        "is_active" boolean DEFAULT true NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);
		console.log("models table verified.");

		// 2. Create products table
		await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "products" (
        "id" text PRIMARY KEY NOT NULL,
        "active_llm_model_id" text NOT NULL REFERENCES "models"("id"),
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);
		console.log("products table verified.");

		// 3. Add organization_id to kb_documents
		await db.execute(sql`
      ALTER TABLE "kb_documents" 
      ADD COLUMN IF NOT EXISTS "organization_id" text REFERENCES "organization"("id");
    `);

		// 4. Create index kb_org_idx on kb_documents(organization_id)
		await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "kb_org_idx" ON "kb_documents"("organization_id");
    `);
		console.log("kb_documents updated with organization_id and index.");

		console.log("Migration successful!");
		process.exit(0);
	} catch (error) {
		console.error("Migration failed:", error);
		process.exit(1);
	}
}

runMigration();
