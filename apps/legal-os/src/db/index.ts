import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

// We switch from neon-http to neon-serverless to support full PostgreSQL transactions.
// This is critical for ACID-compliant credit management and AI operations.
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const db = drizzle(pool, { schema });
