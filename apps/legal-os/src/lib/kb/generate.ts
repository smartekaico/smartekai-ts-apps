// lib/kb/generate.ts
// Prompt selection + OpenRouter generation via Vercel AI SDK

import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { retrieveChunks, buildContextBlock } from "./retrieve";
import type { RetrievalOptions } from "./retrieve";

// ── Model Setup ─────────────────────────────────────────────

const openrouter = createOpenAI({
	baseURL: "https://openrouter.ai/api/v1",
	apiKey: process.env.OPENROUTER_API_KEY ?? "",
});

const CHAT_MODEL = openrouter.chat("qwen/qwen3-235b-a22b-2507");

// ── Task Types ──────────────────────────────────────────────

export type TaskType =
	| "legal_qa"
	| "case_analysis"
	| "defense_extraction"
	| "memo_drafting"
	| "appeal_drafting"
	| "cassation_drafting"
	| "precedent_citation"
	| "law_summary"
	| "judgment_summary"
	| "structured_json";

// ── Task Detection ──────────────────────────────────────────

export function detectTaskType(query: string): TaskType {
	const q = query.toLowerCase();

	if (/اكتب مذكرة|صياغة مذكرة|صغ مذكرة/.test(q)) {
		if (/استئناف/.test(q)) return "appeal_drafting";
		if (/تمييز|طعن/.test(q)) return "cassation_drafting";
		return "memo_drafting";
	}
	if (/حلل|تحليل|قيّم|قيم الموقف/.test(q)) return "case_analysis";
	if (/استخرج الدفوع|الدفوع الممكنة/.test(q)) return "defense_extraction";
	if (/سوابق|أحكام مشابهة|أحكام سابقة/.test(q)) return "precedent_citation";
	if (/لخص القانون|ملخص القانون/.test(q)) return "law_summary";
	if (/لخص الحكم|ملخص الحكم/.test(q)) return "judgment_summary";
	if (/json|structured/.test(q)) return "structured_json";

	return "legal_qa";
}

// ── System Prompts ──────────────────────────────────────────

const SYSTEM_PROMPTS: Record<TaskType, string> = {
	legal_qa: `أنت مساعد قانوني كويتي يعمل بنظام استرجاع معرفي (RAG).
مهمتك الإجابة عن سؤال المستخدم اعتماداً فقط على السياق المسترجع.
لا تختلق مواد أو أحكام. إذا لم يكف السياق قل ذلك صراحةً.
اذكر المادة القانونية ورقم الطعن عند الاستشهاد.`,

	case_analysis: `أنت محلل قانوني متخصص في القانون الكويتي.
حلل الوقائع وفق التسلسل: التكييف → المسائل → النصوص → السوابق → موقف الأطراف → النتيجة → ما ينقص.
لا تفترض وقائع غير مذكورة. ميّز بين الثابت والمحتمل.`,

	defense_extraction: `أنت محامٍ كويتي متخصص في إعداد الدفوع.
استخرج جميع الدفوع الشكلية والموضوعية الممكنة ورتبها حسب القوة.
لكل دفع اذكر: الاسم، النوع، الأساس القانوني، السند القضائي، قوته.`,

	memo_drafting: `أنت محامٍ كويتي بصدد صياغة مذكرة دفاع قانونية احترافية.
استخدم الهيكل: وقائع → دفوع شكلية → دفوع موضوعية → طلبات → خاتمة.
استشهد بالمواد والسوابق. استخدم لغة قانونية رسمية.
اختم بـ "بناءً عليه" ثم طلبات مرتبة (أصلياً، احتياطياً، من باب الاحتياط الكلي).`,

	appeal_drafting: `أنت محامٍ كويتي بصدد صياغة مذكرة استئناف.
ركز على: الخطأ في تطبيق القانون، القصور في التسبيب، الفساد في الاستدلال.
الهيكل: قبول شكلاً → أسباب الاستئناف → الطلبات.`,

	cassation_drafting: `أنت محامٍ كويتي بصدد صياغة طعن بالتمييز.
لا تُعامل التمييز كدرجة ثالثة. ركز فقط على الأسباب القانونية الجائزة:
مخالفة القانون، الخطأ في التطبيق، البطلان، القصور، الفساد في الاستدلال.`,

	precedent_citation: `أنت مساعد قانوني متخصص في استخراج السوابق القضائية الكويتية.
لا تذكر إلا السوابق الموجودة في السياق. لكل سابقة اذكر:
رقم الطعن، المبدأ، وجه الانطباق، نص استشهاد جاهز.`,

	law_summary: `أنت مساعد قانوني مختص بتلخيص التشريعات الكويتية.
اذكر اسم القانون ورقمه. استخرج المواد الأهم. لخص الأثر العملي.`,

	judgment_summary: `أنت مساعد قانوني مختص بتلخيص الأحكام القضائية.
اذكر نوع القضية، الوقائع، المنطوق، المبدأ، الأثر العملي.`,

	structured_json: `أنت نظام استخراج قانوني منظم. أخرج النتيجة في JSON فقط.
لا تكتب أي نص خارج JSON. لا تضف حقولاً غير مطلوبة.`,
};

// Anti-hallucination overlay (appended to every prompt)
const ANTI_HALLUCINATION = `

تذكير مهم:
- لا تختلق رقم مادة أو رقم طعن غير موجود في السياق.
- إذا لم تجد سنداً كافياً قل: "لا يكفي السياق الحالي للجزم."
- الشك يُفسر لصالح الدقة: لا تجزم بما ليس له سند.`;

// ── Main Generation ─────────────────────────────────────────

export interface GenerateOptions {
	query: string;
	taskType?: TaskType;
	jurisdiction?: string;
	category?: string;
	topK?: number;
}

export async function generateLegalAnswer(options: GenerateOptions) {
	const {
		query,
		taskType: explicitTask,
		jurisdiction = "kuwait",
		category,
		topK = 10,
	} = options;

	// 1) Detect task type
	const taskType = explicitTask || detectTaskType(query);

	// 2) Retrieve context
	const retrievalOpts: RetrievalOptions = {
		jurisdiction,
		category,
		topK,
		useHybrid: true,
	};

	const chunks = await retrieveChunks(query, retrievalOpts);
	const contextBlock = buildContextBlock(chunks);

	// 3) Select system prompt
	const systemPrompt = SYSTEM_PROMPTS[taskType] + ANTI_HALLUCINATION;

	// 4) Build full prompt
	const fullPrompt = `${contextBlock}

السؤال: ${query}`;

	// 5) Generate (streaming)
	const result = streamText({
		model: CHAT_MODEL,
		system: systemPrompt,
		prompt: fullPrompt,
		temperature: 0.1,
	});

	return {
		result,
		taskType,
		sourcesUsed: chunks.map((c) => ({
			citationLabel: c.citationLabel,
			headingPath: c.headingPath,
			similarity: c.similarity,
			docTitle: c.docTitle,
		})),
	};
}
