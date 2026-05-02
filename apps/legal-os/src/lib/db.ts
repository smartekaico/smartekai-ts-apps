// lib/db.ts
// Database connection for Neon Postgres

import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Required for Neon serverless driver in Node.js
if (typeof WebSocket === "undefined") {
	neonConfig.webSocketConstructor = ws;
}

// Connection pool (reused across requests in serverless)
let pool: Pool | null = null;

export function getPool(): Pool {
	if (!pool) {
		pool = new Pool({
			connectionString: process.env.DATABASE_URL,
			max: 10,
		});
	}
	return pool;
}

// Convenience wrapper
export const db = {
	async query(text: string, params?: unknown[]) {
		const pool = getPool();
		const start = Date.now();
		const result = await pool.query(text, params);
		const duration = Date.now() - start;

		if (process.env.NODE_ENV === "development") {
			console.log(
				`[DB] ${duration}ms | rows: ${result.rowCount} | ${text.substring(0, 80)}...`,
			);
		}

		return result;
	},
};
