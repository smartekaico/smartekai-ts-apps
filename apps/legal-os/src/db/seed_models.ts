import { config } from "dotenv";
config({ path: ".env.local" });
import { db } from "./index";
import { models, products } from "./schema";

const initialModels = [
	{
		id: "qwen/qwen3-235b-a22b-2507",
		name: "Qwen 3 (235B) - Flagship",
		provider: "OpenRouter",
		isActive: true,
	},
	{
		id: "qwen/qwen-2.5-72b-instruct",
		name: "Qwen 2.5 (72B) Instruct",
		provider: "OpenRouter",
		isActive: true,
	},
	{
		id: "openai/gpt-4o",
		name: "GPT-4o (Omni)",
		provider: "OpenRouter",
		isActive: true,
	},
];

async function seedModels() {
	console.log("Seeding initial models...");
	for (const model of initialModels) {
		await db
			.insert(models)
			.values(model)
			.onConflictDoUpdate({
				target: models.id,
				set: { name: model.name, provider: model.provider },
			});
	}

	console.log("Setting default active models for products...");
	// Legal Product
	await db
		.insert(products)
		.values({
			id: "legal-assistant-os",
			activeLlmModelId: "qwen/qwen3-235b-a22b-2507",
		})
		.onConflictDoUpdate({
			target: products.id,
			set: { activeLlmModelId: "qwen/qwen3-235b-a22b-2507" },
		});

	// Medical Product
	await db
		.insert(products)
		.values({
			id: "medical-scribe-os",
			activeLlmModelId: "openai/gpt-4o",
		})
		.onConflictDoUpdate({
			target: products.id,
			set: { activeLlmModelId: "openai/gpt-4o" },
		});

	console.log("Seed complete!");
	process.exit(0);
}

seedModels().catch(console.error);
