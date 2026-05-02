import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { models, products } from "@/db/schema";
import { getAuthenticatedSession, handleRawAuthError } from "@/lib/auth-utils";
import { desc, eq } from "drizzle-orm";

export async function GET() {
	try {
		const session = await getAuthenticatedSession({ requiredRole: ["ADMIN"] });

		const allModels = await db
			.select()
			.from(models)
			.orderBy(desc(models.createdAt));

		return NextResponse.json(allModels);
	} catch (error) {
		return handleRawAuthError(error);
	}
}

export async function POST(req: NextRequest) {
	try {
		const session = await getAuthenticatedSession({ requiredRole: ["ADMIN"] });
		const { id, name, provider } = await req.json();

		if (!id || !name) {
			return NextResponse.json(
				{ error: "ID and Name are required" },
				{ status: 400 },
			);
		}

		await db
			.insert(models)
			.values({
				id,
				name,
				provider: provider || "OpenRouter",
				isActive: true,
			})
			.onConflictDoUpdate({
				target: models.id,
				set: { name, provider: provider || "OpenRouter" },
			});

		return NextResponse.json({ success: true });
	} catch (error) {
		return handleRawAuthError(error);
	}
}
export async function DELETE(req: NextRequest) {
	try {
		const session = await getAuthenticatedSession({ requiredRole: ["ADMIN"] });
		const { searchParams } = new URL(req.url);
		const modelId = searchParams.get("id");

		if (!modelId) {
			return NextResponse.json(
				{ error: "Model ID is required" },
				{ status: 400 },
			);
		}

		// Safety Check: Is this model currently active for ANY product?
		const activeProducts = await db
			.select()
			.from(products)
			.where(eq(products.activeLlmModelId, modelId))
			.limit(1);

		if (activeProducts.length > 0) {
			return NextResponse.json(
				{
					error:
						"Cannot delete an active model. Please switch the product to another model first.",
				},
				{ status: 400 },
			);
		}

		await db.delete(models).where(eq(models.id, modelId));

		return NextResponse.json({ success: true });
	} catch (error) {
		return handleRawAuthError(error);
	}
}
