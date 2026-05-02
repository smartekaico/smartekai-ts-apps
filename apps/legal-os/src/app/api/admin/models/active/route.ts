import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, auditLogs } from "@/db/schema";
import { getAuthenticatedSession, handleRawAuthError } from "@/lib/auth-utils";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
	try {
		const session = await getAuthenticatedSession({ requiredRole: ["ADMIN"] });
		const { modelId, productId = "legal-assistant-os" } = await req.json();

		if (!modelId) {
			return NextResponse.json(
				{ error: "Model ID is required" },
				{ status: 400 },
			);
		}

		// 1. Update the active model for the specific product
		await db
			.update(products)
			.set({ activeLlmModelId: modelId, updatedAt: new Date() })
			.where(eq(products.id, productId));

		// 2. Audit Log
		await db.insert(auditLogs).values({
			id: nanoid(),
			userId: session.user.id,
			organizationId:
				(session.session as { activeOrganizationId?: string }).activeOrganizationId ||
				(session.user as { activeOrganizationId?: string }).activeOrganizationId,
			action: "ADMIN_MODEL_UPDATE",
			details: JSON.stringify({ activeLlmModelId: modelId, productId }),
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		return handleRawAuthError(error);
	}
}
