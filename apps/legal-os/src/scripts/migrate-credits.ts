import fs from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";

// 1. Manual ENV parsing to avoid any loading issues
const envPath = path.resolve(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const dbUrlMatch = envContent.match(/DATABASE_URL=(.+)/);
const dbUrl = dbUrlMatch
	? dbUrlMatch[1].trim().replace(/^'|^"|'$|"$/g, "")
	: null;

if (!dbUrl) {
	console.error("❌ Could not find DATABASE_URL in .env.local");
	process.exit(1);
}

console.log("🚀 Starting Credit Bucket Migration...");

const db_sql = neon(dbUrl);
const db = drizzle(db_sql);

async function runMigration() {
	try {
		// 1. Create the table manually via SQL
		console.log("Creating credit_buckets table...");
		await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "credit_buckets" (
        "id" text PRIMARY KEY NOT NULL,
        "organization_id" text NOT NULL,
        "amount" integer NOT NULL,
        "initial_amount" integer NOT NULL,
        "expiry_date" timestamp NOT NULL,
        "notice_sent" boolean DEFAULT false NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);

		// 2. Identify organizations with legacy credits
		console.log("Checking for organizations with credits...");
		const orgs = await db.execute(
			sql`SELECT id, name, credit_balance FROM "organization"`,
		);

		for (const org of orgs.rows as unknown as Record<string, unknown>[]) {
			const creditBalance = Number(org.credit_balance);
			if (creditBalance > 0) {
				// Check if bucket exists
				const existing = await db.execute(
					sql`SELECT id FROM "credit_buckets" WHERE organization_id = ${org.id} LIMIT 1`,
				);

				if (existing.rows.length === 0) {
					console.log(`Migrating ${creditBalance} credits for ${org.name}...`);

					const expiryDate = new Date();
					expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 12 months

					const bucketId = `bucket_${Math.random().toString(36).substring(2, 12)}`;

					await db.execute(sql`
            INSERT INTO "credit_buckets" (id, organization_id, amount, initial_amount, expiry_date, notice_sent)
            VALUES (${bucketId}, ${org.id}, ${org.credit_balance}, ${org.credit_balance}, ${expiryDate.toISOString()}, false)
          `);
				}
			}
		}

		console.log("✅ Migration completed successfully!");
	} catch (error) {
		console.error("❌ Migration failed:", error);
	}
}

runMigration().then(() => process.exit(0));
