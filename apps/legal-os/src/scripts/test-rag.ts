import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function test() {
	console.log("🔍 Testing RAG Retrieval with filters...");

	// Dynamic import to ensure dotenv.config() has run before retrieveChunks (which depends on env vars) is evaluated
	const { retrieveChunks } = await import("../lib/kb/retrieve");

	// Test 1: General search
	console.log("\n1. Searching for 'محكمة' (general)...");
	const chunks1 = await retrieveChunks("محكمة", { topK: 3 });
	console.log(`Found ${chunks1.length} chunks.`);
	chunks1.forEach((c) => console.log(` - [${c.docType}] ${c.docTitle}`));

	// Test 2: Procedural search
	console.log("\n2. Searching for 'إجراءات رفع دعوى' (procedural filter)...");
	const chunks2 = await retrieveChunks("إجراءات رفع دعوى", {
		topK: 3,
		docType: "procedure",
	});
	console.log(`Found ${chunks2.length} chunks.`);
	chunks2.forEach((c) => console.log(` - [${c.docType}] ${c.docTitle}`));

	process.exit(0);
}

test().catch((err) => {
	console.error(err);
	process.exit(1);
});
