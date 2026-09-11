import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

function requireEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  throw new Error(`None of [${names.join(", ")}] is set`);
}

// Support separate databases per application
const legalSql = neon(requireEnv("DATABASE_LEGAL_URL", "DATABASE_URL"));
const medicalSql = neon(requireEnv("DATABASE_MEDICAL_URL", "DATABASE_URL"));
const carsSql = neon(requireEnv("DATABASE_NEONDB_SMARTEKAI"));

// Default database (uses DATABASE_URL or DATABASE_LEGAL_URL for backward compatibility)
const sql = neon(requireEnv("DATABASE_URL", "DATABASE_LEGAL_URL"));

export const db = drizzle({ client: sql, schema });

// Dedicated database connections
export const dbLegal = drizzle({ client: legalSql, schema });
export const dbMedical = drizzle({ client: medicalSql, schema });
export const dbCars = drizzle({ client: carsSql, schema });

export type Database = typeof db;
