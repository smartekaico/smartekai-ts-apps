import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { retrieveChunks, buildContextBlock } from "@/lib/kb/retrieve";
import { detectRetrievalIntent } from "@/lib/ai/intent-detector";
import { auth } from "@/lib/auth";

export const maxDuration = 60;

const openrouter = createOpenAI({
	apiKey: process.env.OPENROUTER_API_KEY,
	baseURL: "https://openrouter.ai/api/v1",
});

export async function POST(req: Request) {
	try {
		// 0. Defense-in-depth: Verify session and ADMIN role
		const session = await auth.api.getSession({
			headers: req.headers,
		});

		if (!session) {
			console.error("KB Test API: No session found");
			return new Response(
				JSON.stringify({ error: "Unauthorized: No session" }),
				{ status: 401 },
			);
		}

		if (session.user.industryRole !== "ADMIN") {
			console.error(
				`KB Test API: Unauthorized role - ${session.user.industryRole}`,
			);
			return new Response(
				JSON.stringify({ error: "Unauthorized: Admin role required" }),
				{ status: 401 },
			);
		}

		const { messages } = await req.json();
		const lastMessage = messages[messages.length - 1];
		const query = lastMessage.content;

		// 1. Detect intent to intelligently filter by law, procedure, etc.
		const intent = await detectRetrievalIntent(query);

		// 2. Retrieve relevant law/precedents
		const chunks = await retrieveChunks(intent.expandedQuery, {
			jurisdiction: "kuwait",
			topK: 15, // High quality retrieval
			docType: intent.docType === "all" ? undefined : intent.docType,
			useHybrid: true,
		});

		const context = buildContextBlock(chunks);

		const systemPrompt = `أنت باحث قانوني كويتي متفوق وخبير في القضاء الكويتي.
مهمتك استخراج النصوص القانونية أو مسارات الإجراءات والمبادئ القانونية ذات الصلة بالواقعة المعروضة من السياق المرفق فقط.

استخدم السياق المرفق أدناه حصراً للبحث:
${context}

**هيكلية الإجابة المطلوبة (يجب الالتزام بها):**
${
	intent.docType === "procedure"
		? `
1. **الاختصاص والمحكمة:** المحكمة والدائرة المختصة بنظر الدعوى.
2. **الإجراءات العملية والخطوات:** الخطوات العملية المتبعة لرفع الدعوى وفقاً لدليل المحاكم والتشريعات.
3. **المتطلبات والشروط الشكلية:** النماذج أو الإنذارات السابقة للتقاضي.
`
		: `
1. **النصوص القانونية (Statutory Law):** سرد مواد القانون ذات الصلة.
2. **المبادئ القانونية (Legal Principles):** المبادئ العامة المستخلصة من المقررات أو أحكام التمييز.
3. **السوابق القضائية (Case Precedents):** ذكر أرقام الطعون والسنوات.
`
}
4. **الخلاصة والتوجيه:** تكييف قانوني أو توجيه عملي مبدئي بناءً على ما سبق.

**تعليمات حاسمة:**
- كن دقيقاً جداً وتسلسل بوضوح.
- الإجابة باللغة العربية الفصحى فقط.
- إذا لم تجد معلومة في السياق، قل بوضوح أن المعلومات غير متوفرة في المكتبة الحالية. ولا تخترع سوابق إذا كان السياق عن إجراءات المحاكم.
- دائماً اذكر المصدر في نهاية كل فقرة.`;

		const result = streamText({
			model: openrouter.chat("qwen/qwen3-235b-a22b-2507"),
			system: systemPrompt,
			prompt: query,
			temperature: 0.1,
		});

		// Provide chunks (top 10) in a header for the frontend
		const sourcesJson = JSON.stringify(
			chunks.slice(0, 10).map((c) => ({
				title: c.docTitle,
				type: c.docType,
				path: c.headingPath,
				content: c.contentMd,
				score: c.similarity,
				label: c.citationLabel,
			})),
		);

		const sourcesBase64 = Buffer.from(sourcesJson).toString("base64");

		return result.toTextStreamResponse({
			headers: {
				"x-sources": sourcesBase64,
				"Content-Type": "text/plain; charset=utf-8",
			},
		});
	} catch (error) {
		console.error("Admin KB Test API error:", error);
		return new Response(JSON.stringify({ error: "Internal Server Error" }), {
			status: 500,
		});
	}
}
