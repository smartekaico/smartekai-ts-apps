"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	FileText,
	Wand2,
	Loader2,
	Edit3,
	Eraser,
	SendHorizontal,
	Zap,
} from "lucide-react";
import TipTapEditor from "@/components/global/TipTapEditor";
import LegalMarkdownRenderer from "@/components/legal/LegalMarkdownRenderer";
import { marked } from "marked";
import { useScrollToRef } from "@/hooks/useScrollToRef";
import { cn } from "@/lib/utils";
import { SaveDocumentModal } from "@/components/global/SaveDocumentModal";
import { DocumentHub } from "@/components/legal/DocumentHub";
import posthog from "posthog-js";
import { calculateWeight } from "@/lib/credits/credit-utils";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

// ── Label Maps ──────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
	pleading: "صحف دعاوى ومذكرات",
	contract: "عقود واتفاقيات",
};

const PLEADING_LABELS: Record<string, string> = {
	statement_of_claim: "صحيفة دعوى",
	defense_memo: "مذكرة دفاع",
	official_warning: "إنذار رسمي",
};

const CONTRACT_LABELS: Record<string, string> = {
	consultation: "عقد تقديم استشارات قانونية",
	employment: "عقد عمل",
	lease: "عقد إيجار",
	service: "عقد تقديم خدمات",
	partnership: "عقد شراكة",
};

const CASE_TAG_LABELS: Record<string, string> = {
	civil: "مدني",
	commercial: "تجاري",
	labor: "عمالي",
	personal_status: "أحوال شخصية",
	real_estate: "عقاري",
	traffic: "مرور",
	penal_persons: "جنح ضد الأشخاص",
	bounced_checks: "جرائم مالية (شيكات)",
	cybercrime: "جرائم إلكترونية",
	narcotics: "مخدرات ومؤثرات عقلية",
	penal_property_trust: "إتلاف ممتلكات وخيانة أمانة",
	other: "أخرى",
};

interface LegalDraftingToolProps {
	caseId?: string;
	embedded?: boolean;
}

export function LegalDraftingTool({
	caseId,
	embedded = false,
}: LegalDraftingToolProps) {
	const [docCategory, setDocCategory] = useState<"contract" | "pleading">(
		"pleading",
	);

	// Contract specific state
	const [template, setTemplate] = useState("consultation");
	const [partyA, setPartyA] = useState("");
	const [partyB, setPartyB] = useState("");
	const [fees, setFees] = useState("");

	// Pleading specific state
	const [pleadingType, setPleadingType] = useState("statement_of_claim");
	const [caseCategory, setCaseCategory] = useState("civil");
	const [plaintiff, setPlaintiff] = useState("");
	const [defendant, setDefendant] = useState("");
	const [facts, setFacts] = useState("");

	// Streaming state
	const [showOutput, setShowOutput] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [streamDone, setStreamDone] = useState(false);
	const [completion, setCompletion] = useState("");
	const [showEditor, setShowEditor] = useState(false);
	const [showSaveModal, setShowSaveModal] = useState(false);
	const [pendingHtml, setPendingHtml] = useState<string | null>(null);

	const [showCreditWarning, setShowCreditWarning] = useState(false);
	const [currentWeight, setCurrentWeight] = useState(1);

	useEffect(() => {
		if (docCategory === "pleading") {
			setCurrentWeight(calculateWeight(facts));
		} else {
			setCurrentWeight(1);
		}
	}, [facts, docCategory]);

	const outputScrollRef = useRef<HTMLDivElement>(null);
	const { targetRef: outputCardRef, scrollToTarget: scrollToOutput } =
		useScrollToRef<HTMLDivElement>();

	// Auto-scroll to output area when it appears
	useEffect(() => {
		if (showOutput && isLoading) {
			const timer = setTimeout(() => {
				outputCardRef.current?.scrollIntoView({
					behavior: "smooth",
					block: "start",
				});
			}, 300);
			return () => clearTimeout(timer);
		}
	}, [showOutput, isLoading]);

	// Preserve scroll position when switching from streaming to TipTap
	useLayoutEffect(() => {
		if (streamDone && completion) {
			const y = window.scrollY;
			requestAnimationFrame(() => {
				window.scrollTo({ top: y });
			});
		}
	}, [streamDone]);

	const handleDraft = async () => {
		if (docCategory === "contract") {
			if (!partyA || !partyB) return;
		} else {
			if (!plaintiff || !defendant || !facts) return;
		}

		if (currentWeight > 1) {
			setShowCreditWarning(true);
			return;
		}

		await proceedWithDraft();
	};

	const proceedWithDraft = async () => {
		setShowCreditWarning(false);
		setCompletion("");
		setShowOutput(true);
		setStreamDone(false);
		setShowEditor(false);
		setIsLoading(true);

		posthog.capture("legal_drafting_started", {
			category: docCategory,
			type: docCategory === "contract" ? template : pleadingType,
			caseId: caseId,
		});

		try {
			let body;
			let apiUrl;

			if (docCategory === "contract") {
				apiUrl = "/api/legal/contracts/generate";
				body = {
					contractType: template,
					subject: fees || CONTRACT_LABELS[template] || "عقد جديد",
					parties: { partyA, partyB },
					caseId: caseId,
				};
			} else {
				apiUrl = "/api/legal/draft";
				body = {
					pleadingType,
					caseCategory,
					plaintiff,
					defendant,
					facts,
					caseId,
				};
			}

			const res = await fetch(apiUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ prompt: JSON.stringify(body) }),
			});

			if (!res.ok) {
				const errData = await res
					.json()
					.catch(() => ({ error: "Unknown error" }));
				throw new Error(errData.error || `HTTP ${res.status}`);
			}

			const reader = res.body?.getReader();
			if (!reader) throw new Error("No response stream");

			const decoder = new TextDecoder();
			let accumulated = "";

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value, { stream: true });
				accumulated += chunk;
				setCompletion(accumulated);

				// Auto-scroll within the output container
				if (outputScrollRef.current) {
					outputScrollRef.current.scrollTop =
						outputScrollRef.current.scrollHeight;
				}
			}

			setStreamDone(true);
			setShowEditor(true);

			// Auto-sync party names to Case if provided (useful metadata update, not a doc save)
			if (caseId && accumulated) {
				if (docCategory === "pleading" && (plaintiff || defendant)) {
					try {
						await fetch(`/api/legal/cases/${caseId}`, {
							method: "PATCH",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								plaintiff: plaintiff.trim(),
								defendant: defendant.trim(),
							}),
						});
					} catch (syncErr) {
						console.error("Failed to sync party names:", syncErr);
					}
				}
			}

			// Show credit usage notification (consistent with chat)
			toast.info("تم استهلاك 1 رصيد لأعمال الصياغة (Lex Drafting)", {
				description: "يمكنك مراجعة سجل الاستهلاك في إعدادات المؤسسة.",
				icon: <Zap className="h-4 w-4 text-amber-500" />,
			});

			posthog.capture("legal_drafting_completed", {
				category: docCategory,
				type: docCategory === "contract" ? template : pleadingType,
				success: true,
				caseId: caseId,
			});
		} catch (err) {
			console.error("Draft error:", err);
			const errorMessage = err instanceof Error ? err.message : "حدث خطأ أثناء الصياغة";
			toast.error(errorMessage);
			setStreamDone(true);
			posthog.capture("legal_drafting_completed", {
				category: docCategory,
				type: docCategory === "contract" ? template : pleadingType,
				success: false,
				error: errorMessage,
				caseId: caseId,
			});
		} finally {
			setIsLoading(false);
		}
	};

	const handleSaveDoc = async (html: string) => {
		// If we have a caseId, it's already auto-saved or should only be saved here
		if (caseId) {
			await performSave(html, caseId);
			return;
		}

		// Fallback for global drafting tool (outside sessions)
		setPendingHtml(html);
		setShowSaveModal(true);
	};

	const performSave = async (
		html: string,
		projectId: string | null,
		categoryId?: string,
	) => {
		try {
			const apiUrl = projectId
				? "/api/legal/documents/save"
				: "/api/legal/documents";
			const projectPayload = projectId ? { caseProjectId: projectId } : {};

			const res = await fetch(apiUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title:
						docCategory === "pleading"
							? `${PLEADING_LABELS[pleadingType] || "مذكرة"} — ${new Date().toLocaleDateString("ar-KW")}`
							: `${CONTRACT_LABELS[template] || "عقد"} — ${new Date().toLocaleDateString("ar-KW")}`,
					content: html,
					docType: docCategory === "pleading" ? "Pleading" : "Contract",
					sourceText:
						docCategory === "pleading"
							? facts?.substring(0, 500) || ""
							: `عقد ${CONTRACT_LABELS[template]} بين ${partyA} و ${partyB}`,
					categoryId: categoryId,
					...projectPayload,
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "فشل الحفظ");

			toast.success(
				projectId
					? "تم حفظ المسودة في ملف الجلسة"
					: "تم حفظ المسودة في المستندات العامة",
			);
			setShowSaveModal(false);

			// Reactive update
			window.dispatchEvent(new CustomEvent("refresh-workspace"));
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "فشل الحفظ";
			toast.error(`فشل الحفظ: ${errorMessage}`);
			throw err;
		}
	};

	return (
		<div className="space-y-8 rtl text-right" dir="rtl">
			<Card
				className={cn(
					"border-indigo-50 shadow-sm transition-all",
					embedded
						? "rounded-3xl border shadow-none bg-slate-50/30"
						: "animate-in slide-in-from-bottom-2 fade-in duration-300 will-change-transform will-change-opacity",
				)}
			>
				{!embedded && (
					<CardHeader className="bg-slate-50/50 border-b">
						<CardTitle>تفاصيل المستند المراد صياغته</CardTitle>
						<CardDescription className="flex items-center gap-2">
							<span>
								اختر نوع المستند وقم بتعبئة البيانات الأساسية ليقوم الذكاء
								الاصطناعي بصياغة المسودة القانونية.
							</span>
							<span className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-black border border-indigo-100 uppercase tracking-tight shrink-0">
								<Zap className="h-2.5 w-2.5 fill-indigo-600" />
								تبدأ من 1 رصيد
							</span>
						</CardDescription>
					</CardHeader>
				)}
				<CardContent className={cn("space-y-6 pt-6", embedded && "p-4 md:p-6")}>
					<div className="space-y-2">
						<label className="text-sm font-bold text-indigo-900">
							1. الوسم الرئيسي (Document Tag)
						</label>
						<Select
							onValueChange={(value) => { if (value) setDocCategory(value as "pleading" | "contract"); }}
							value={docCategory}
						>
							<SelectTrigger className="w-full border-indigo-200 focus:ring-indigo-500 bg-white">
								<SelectValue placeholder="اختر الوسم">
									{CATEGORY_LABELS[docCategory]}
								</SelectValue>
							</SelectTrigger>
							<SelectContent className="font-sans">
								<SelectItem value="pleading">
									صحف دعاوى ومذكرات (Pleadings & Memos)
								</SelectItem>
								<SelectItem value="contract">
									عقود واتفاقيات (Contracts & Agreements)
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="h-px w-full bg-slate-100 my-4" />

					{docCategory === "pleading" ? (
						<div className="space-y-6 animate-in fade-in duration-200">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<label className="text-sm font-medium">
										نوع الصحيفة أو المذكرة (Document Type)
									</label>
									<Select
										onValueChange={(value) =>
											setPleadingType(value || "statement_of_claim")
										}
										value={pleadingType}
									>
										<SelectTrigger className="w-full bg-white">
											<SelectValue placeholder="اختر نوع المذكرة">
												{PLEADING_LABELS[pleadingType]}
											</SelectValue>
										</SelectTrigger>
										<SelectContent className="font-sans">
											<SelectItem value="statement_of_claim">
												صحيفة دعوى
											</SelectItem>
											<SelectItem value="defense_memo">مذكرة دفاع</SelectItem>
											<SelectItem value="official_warning">
												إنذار رسمي
											</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<label className="text-sm font-medium">
										وسم القضية (Case Tag)
									</label>
									<Select
										onValueChange={(value) => setCaseCategory(value || "civil")}
										value={caseCategory}
									>
										<SelectTrigger className="w-full bg-white">
											<SelectValue placeholder="اختر وسم القضية">
												{CASE_TAG_LABELS[caseCategory]}
											</SelectValue>
										</SelectTrigger>
										<SelectContent className="font-sans">
											{Object.entries(CASE_TAG_LABELS).map(([val, label]) => (
												<SelectItem key={val} value={val}>
													{label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<label className="text-sm font-medium">
										المدعي / المنذر (Plaintiff / Sender)
									</label>
									<Input
										value={plaintiff}
										onChange={(e) => setPlaintiff(e.target.value)}
										placeholder="اسم المدعي أو المنذر..."
										className="bg-white"
									/>
								</div>
								<div className="space-y-2">
									<label className="text-sm font-medium">
										المدعى عليه / المنذر إليه (Defendant / Receiver)
									</label>
									<Input
										value={defendant}
										onChange={(e) => setDefendant(e.target.value)}
										placeholder="اسم المدعى عليه أو المنذر إليه..."
										className="bg-white"
									/>
								</div>
							</div>

							<div className="space-y-2">
								<label className="text-sm font-bold text-indigo-900 flex items-center gap-2">
									<FileText className="h-4 w-4" />
									الوقائع والطلبات (Facts & Demands)
								</label>
								<DocumentHub
									onContentDecided={setFacts}
									isLoading={isLoading}
								/>
								<div className="p-3 bg-indigo-50 text-indigo-800 rounded-xl text-[11px] flex items-start gap-2 border border-indigo-100/50 mt-2">
									<Zap className="h-4 w-4 mt-0.5 shrink-0 text-indigo-600" />
									<span>
										<strong>دعم الـ OCR:</strong> يمكنك رفع مذكرة الخصم أو صحيفة
										الدعوى الممسوحة ضوئياً ليتم استخراج "الوقائع" منها مباشرة
										وصياغة الرد.
									</span>
								</div>
							</div>
						</div>
					) : (
						<div className="space-y-6 animate-in fade-in duration-200">
							<div className="space-y-2">
								<label className="text-sm font-medium">
									نوع العقد (Contract Template)
								</label>
								<Select
									onValueChange={(value) =>
										setTemplate(value || "consultation")
									}
									value={template}
								>
									<SelectTrigger className="w-full bg-white">
										<SelectValue placeholder="اختر العقد">
											{CONTRACT_LABELS[template]}
										</SelectValue>
									</SelectTrigger>
									<SelectContent className="font-sans">
										{Object.entries(CONTRACT_LABELS).map(([val, label]) => (
											<SelectItem key={val} value={val}>
												{label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<label className="text-sm font-medium">
										الطرف الأول (Party A)
									</label>
									<Input
										value={partyA}
										onChange={(e) => setPartyA(e.target.value)}
										placeholder="اسم الطرف الأول..."
										className="bg-white"
									/>
								</div>
								<div className="space-y-2">
									<label className="text-sm font-medium">
										الطرف الثاني (Party B)
									</label>
									<Input
										value={partyB}
										onChange={(e) => setPartyB(e.target.value)}
										placeholder="اسم الطرف الثاني..."
										className="bg-white"
									/>
								</div>
							</div>

							<div className="space-y-2">
								<label className="text-sm font-medium">
									الأتعاب أو القيمة (Fees / Value)
								</label>
								<Input
									value={fees}
									onChange={(e) => setFees(e.target.value)}
									placeholder="مثال: 500 دينار كويتي"
									className="bg-white"
								/>
							</div>
						</div>
					)}

					<div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-100">
						<div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
							<div
								className={cn(
									"flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-300 group/cost overflow-hidden",
									currentWeight > 1
										? "bg-amber-50 border-amber-200 text-amber-700 shadow-sm"
										: "bg-slate-50 border-slate-100 text-slate-500",
								)}
							>
								<Zap
									className={cn(
										"h-3 w-3",
										currentWeight > 1
											? "text-amber-600"
											: "text-amber-500 animate-pulse",
									)}
								/>
								<span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
									التكلفة:
									<span
										className={cn(
											"font-bold",
											currentWeight > 1 ? "text-amber-700" : "text-amber-600",
										)}
									>
										{currentWeight} {currentWeight === 1 ? "رصيد" : "أرصدة"}
									</span>
								</span>
							</div>
							<Button
								variant="outline"
								size="lg"
								onClick={() => {
									setPartyA("");
									setPartyB("");
									setFees("");
									setPlaintiff("");
									setDefendant("");
									setFacts("");
									setCompletion("");
									setShowOutput(false);
								}}
								className="w-full sm:w-auto text-slate-500 hover:text-rose-500 rounded-xl border-slate-200 gap-2 h-10 px-6"
							>
								<Eraser className="h-5 w-5" />
								مسح البيانات
							</Button>
						</div>
						<Button
							size="lg"
							className={cn(
								"px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all active:scale-95 h-10",
								embedded ? "w-full sm:w-auto" : "",
							)}
							onClick={handleDraft}
							disabled={
								isLoading ||
								(docCategory === "contract" && (!partyA || !partyB)) ||
								(docCategory === "pleading" &&
									(!plaintiff || !defendant || !facts))
							}
						>
							{isLoading ? (
								<>
									<Loader2 className="ml-2 h-5 w-5 animate-spin" />
									جاري الصياغة...
								</>
							) : (
								<>
									<Wand2 className="ml-2 h-5 w-5" />
									{embedded
										? "ابدأ الصياغة الذكية"
										: "إنشاء مسودة بالذكاء الاصطناعي"}
								</>
							)}
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Output Section */}
			{showOutput && (
				<Card
					ref={outputCardRef}
					className="border-indigo-100 shadow-xl overflow-hidden rounded-3xl animate-in fade-in slide-in-from-bottom-4 duration-300 will-change-transform"
				>
					<CardHeader className="bg-slate-900 border-b flex flex-row items-center justify-between p-4 py-3 sticky top-0 z-10 text-white leading-none">
						<CardTitle className="text-lg flex items-center gap-2 m-0 p-0 text-white">
							<FileText className="h-5 w-5 text-indigo-400" />
							المسودة الناتجة (AI Draft Result)
						</CardTitle>
						<div className="flex items-center gap-2">
							{isLoading && (
								<Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
							)}
							{streamDone && (
								<Button
									variant="secondary"
									size="xs"
									className="bg-white/10 hover:bg-white/20 border-white/20 text-white gap-1.5"
									onClick={() => setShowEditor(!showEditor)}
								>
									<Edit3 className="h-3 w-3" />
									{showEditor ? "عرض القراءة" : "تحويل للمحرر (Edit)"}
								</Button>
							)}
						</div>
					</CardHeader>
					<CardContent className="p-0 bg-white">
						{!showEditor ? (
							<div
								ref={outputScrollRef}
								className="p-6 md:p-8 max-h-[85vh] overflow-y-auto"
							>
								{!completion && isLoading ? (
									<div className="flex flex-col items-center justify-center py-12 gap-3">
										<Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
										<p className="text-slate-500">
											جاري استرجاع القوانين والسوابق وصياغة المسودة...
										</p>
									</div>
								) : (
									<LegalMarkdownRenderer
										content={completion}
										isStreaming={isLoading}
									/>
								)}
							</div>
						) : (
							<div className="p-6 md:p-8 max-w-none">
								<div className="flex items-center gap-2 text-sm text-indigo-600 mb-4 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
									<Edit3 className="h-4 w-4" />
									<span className="font-bold">
										اكتملت الصياغة — يمكنك الآن تحرير المسودة وحفظها أو تصديرها
									</span>
								</div>
								<TipTapEditor
									content={marked.parse(completion) as string}
									caseId={caseId || "new-doc"}
									onSave={handleSaveDoc}
								/>
							</div>
						)}
					</CardContent>
				</Card>
			)}
			<SaveDocumentModal
				isOpen={showSaveModal}
				onClose={() => setShowSaveModal(false)}
				title={`${PLEADING_LABELS[pleadingType] || CONTRACT_LABELS[template] || "مسودة"} — ${new Date().toLocaleDateString("ar-KW")}`}
				onSave={(projectId) => performSave(pendingHtml || "", projectId)}
			/>

			<ConfirmModal
				isOpen={showCreditWarning}
				onClose={() => setShowCreditWarning(false)}
				onConfirm={proceedWithDraft}
				title="تأكيد استهلاك الأرصدة"
				description={`هذه الوقائع تفصيلية جداً وتحتاج لمعالجة متقدمة. سيتم خصم ${currentWeight} أرصدة من حساب المؤسسة للمتابعة. هل أنت متأكد من رغبتك بالاستمرار؟`}
				confirmText="موافق، استمر"
				cancelText="إلغاء"
				variant="default"
			/>
		</div>
	);
}
