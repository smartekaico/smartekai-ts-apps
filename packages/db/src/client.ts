import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// Support separate databases per application
const legalSql = neon(
  process.env.DATABASE_LEGAL_URL ?? process.env.DATABASE_URL!,
);
const medicalSql = neon(
  process.env.DATABASE_MEDICAL_URL ?? process.env.DATABASE_URL!,
);
const carsSql = neon(process.env.DATABASE_NEONDB_SMARTEKAI!);

// Default database (uses DATABASE_URL or DATABASE_LEGAL_URL for backward compatibility)
const sql = neon(process.env.DATABASE_URL ?? process.env.DATABASE_LEGAL_URL!);

export const db = drizzle({ client: sql, schema });

// Dedicated database connections
export const dbLegal = drizzle({ client: legalSql, schema });
export const dbMedical = drizzle({ client: medicalSql, schema });
export const dbCars = drizzle({ client: carsSql, schema });

export type Database = typeof db;
