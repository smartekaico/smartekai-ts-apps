// lib/audit.ts
// Centralized audit logging for administrative and user actions

import { db } from "./db";
import { nanoid } from "nanoid";

export type AuditAction =
	| "DRAFTING"
	| "ANALYSIS"
	| "RESEARCH"
	| "BILLING"
	| "TEAM_INVITE"
	| "ADMIN_CATEGORY_CREATE"
	| "ADMIN_JURISDICTION_CREATE"
	| "ADMIN_DOCUMENT_UPLOAD";

export interface AuditLogOptions {
	userId: string;
	organizationId?: string | null;
	action: AuditAction;
	details?: unknown;
}

/**
 * Logs an administrative or user action to the audit_logs table.
 */
export async function createAuditLog({
	userId,
	organizationId,
	action,
	details,
}: AuditLogOptions): Promise<void> {
	const id = nanoid();
	const detailsJson = details ? JSON.stringify(details) : null;

	try {
		await db.query(
			`INSERT INTO audit_logs (id, user_id, organization_id, action, details, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
			[id, userId, organizationId || null, action, detailsJson],
		);
	} catch (error) {
		// Fail silently in production to avoid blocking the main operation,
		// but log to console in development.
		console.error("[AUDIT ERROR]", error);
	}
}
