"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Search,
	Loader2,
	AlertTriangle,
	Edit3,
	Eraser,
	SendHorizontal,
	Upload,
	FileText,
	X,
	Bot,
	Wand2,
	Scale,
	Check,
	Database,
	Hash,
	Zap,
} from "lucide-react";
import TipTapEditor from "@/components/global/TipTapEditor";
import LegalMarkdownRenderer from "@/components/legal/LegalMarkdownRenderer";
import { marked } from "marked";
import { useScrollToRef } from "@/hooks/useScrollToRef";
import { cn } from "@/lib/utils";
import { SaveDocumentModal } from "@/components/global/SaveDocumentModal";
import posthog from "posthog-js";

interface Source {
	title: string;
	type: string;
	path: string;
	content: string;
	score: number;
	label?: string;
}

interface LegalResearchToolProps {
	caseId?: string;
	embedded?: boolean;
	mode?: "user" | "admin";
}

export function LegalResearchTool({
	caseId,
	embedded = false,
	mode = "user",
}: LegalResearchToolProps) {
	const [documentText, setDocumentText] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [showOutput, setShowOutput] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [isExtracting, setIsExtracting] = useState(false);
	const [streamDone, setStreamDone] = useState(false);
	const [completion, setCompletion] = useState("");
	const [showEditor, setShowEditor] = useState(false);
	const [activeFile, setActiveFile] = useState<File | null>(null);
	const [showSaveModal, setShowSaveModal] = useState(false);
	const [pendingHtml, setPendingHtml] = useState<string | null>(null);
	const [currentSources, setCurrentSources] = useState<Source[]>([]);

	const fileInputRef = useRef<HTMLInputElement>(null);
	const outputRef = useRef<HTMLDivElement>(null);
	const { targetRef: outputCardRef } = useScrollToRef<HTMLDivElement>();

	const isAdmin = mode === "admin";

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

	const handleResearch = async () => {
		if (!documentText.trim()) return;
		setError(null);
		setCompletion("");
		setShowOutput(true);
		setStreamDone(false);
		setShowEditor(false);
		setIsLoading(true);
		setCurrentSources([]);

		posthog.capture("legal_research_started", {
			caseId: caseId,
			isAdmin: isAdmin,
			contentLength: documentText.length,
		});

		try {
			const apiUrl = isAdmin ? "/api/admin/kb/test" : "/api/legal/research";
			const payload = isAdmin
				? { messages: [{ role: "user", content: documentText }] }
				: { prompt: documentText, caseId };

			const res = await fetch(apiUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				if (res.status === 402)
					throw new Error("رصيدك غير كافٍ. (Insufficient credits)");
				const errData = await res
					.json()
					.catch(() => ({ error: "Unknown error" }));
				throw new Error(errData.error || `HTTP ${res.status}`);
			}

			// Extract sources metadata from headers
			const sourcesHeader = res.headers.get("x-sources");
			if (sourcesHeader) {
				try {
					// UTF-8 aware decoding for Arabic characters
					const binaryString = atob(sourcesHeader);
					const bytes = new Uint8Array(binaryString.length);
					for (let i = 0; i < binaryString.length; i++) {
						bytes[i] = binaryString.charCodeAt(i);
					}
					const decodedJson = new TextDecoder().decode(bytes);
					const parsedSources = JSON.parse(decodedJson);
					setCurrentSources(parsedSources);
				} catch (e) {
					console.error("Failed to parse sources header", e);
				}
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

				if (outputRef.current) {
					outputRef.current.scrollTop = outputRef.current.scrollHeight;
				}
			}

			setStreamDone(true);
			posthog.capture("legal_research_completed", {
				caseId: caseId,
				isAdmin: isAdmin,
				success: true,
				sourcesCount: currentSources.length,
			});
		} catch (err) {
			console.error("Research error:", err);
			setError((err instanceof Error ? err.message : null) || "حدث خطأ غير متوقع");
			setStreamDone(true);
			posthog.capture("legal_research_completed", {
				caseId: caseId,
				isAdmin: isAdmin,
				success: false,
				error: err instanceof Error ? err.message : "Unknown error",
			});
		} finally {
			setIsLoading(false);
		}
	};

	const handleSaveDoc = async (html: string) => {
		if (caseId) {
			await performSave(html, caseId);
			return;
		}
		setPendingHtml(html);
		setShowSaveModal(true);
	};

	const performSave = async (html: string, projectId: string | null) => {
		try {
			const apiUrl = projectId
				? "/api/legal/documents/save"
				: "/api/legal/documents";
			const projectPayload = projectId ? { caseProjectId: projectId } : {};

			const res = await fetch(apiUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: `بحث قانوني — ${new Date().toLocaleDateString("ar-KW")}`,
					content: html,
					docType: "Research",
					sourceText: documentText.substring(0, 500),
					...projectPayload,
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "فشل الحفظ");

			toast.success(
				projectId
					? "تم حفظ البحث في ملف القضية"
					: "تم حفظ البحث في قائمة المستندات العامة",
			);
			setShowSaveModal(false);
		} catch (err) {
			toast.error(`فشل الحفظ: ${err instanceof Error ? err.message : "Unknown error"}`);
			throw err;
		}
	};

	return (
		<div className="space-y-8 rtl text-right" dir="rtl">
			{/* Output Section (Moved to top like Chatbot) */}
			{showOutput && (
				<div
					className={cn(
						"grid grid-cols-1 animate-in fade-in slide-in-from-bottom-8 duration-700",
						isAdmin ? "lg:grid-cols-12 gap-8" : "gap-4",
					)}
				>
					{/* Main Result Card */}
					<Card
						ref={isAdmin ? null : outputCardRef}
						className={cn(
							"border-indigo-100 shadow-xl overflow-hidden rounded-3xl bg-white h-fit",
							isAdmin ? "lg:col-span-8" : "w-full flex flex-col",
						)}
					>
						<CardHeader className="bg-slate-900 border-b flex flex-row items-center justify-between p-4 py-3 sticky top-0 z-10 text-white leading-none">
							<CardTitle className="text-lg flex items-center gap-2 m-0 p-0 text-white leading-none tracking-tight">
								<Search className="h-5 w-5 text-indigo-400" />
								نتيجة البحث القانوني
							</CardTitle>
							<div className="flex items-center gap-2">
								{isLoading && (
									<Loader2 className="h-5 w-5 animate-spin text-indigo-400 font-bold" />
								)}
								{streamDone && (
									<Button
										variant="secondary"
										size="sm"
										className="bg-white/10 hover:bg-white/20 border-white/20 text-white gap-1.5 h-8 rounded-lg text-[10px] font-bold"
										onClick={() => setShowEditor(!showEditor)}
									>
										<Edit3 className="h-3 w-3" />
										{showEditor ? "عرض القراءة" : "تحرير وحفظ"}
									</Button>
								)}
							</div>
						</CardHeader>
						<CardContent className="p-0 bg-white">
							{!showEditor ? (
								<div
									ref={outputRef}
									className="p-6 md:p-8 max-h-[75vh] overflow-y-auto"
								>
									{!completion && isLoading ? (
										<div className="flex flex-col items-center justify-center py-12 gap-3 opacity-60">
											<Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
											<p className="text-xs font-black text-slate-500 italic">
												جاري استرجاع القوانين والمبادئ القضائية...
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
										<Check className="h-4 w-4" />
										<span className="font-bold">
											اكتمل البحث — يمكنك الآن تحرير النتيجة لدمجها في مذكرتك
											وحفظها
										</span>
									</div>
									<TipTapEditor
										content={marked.parse(completion) as string}
										caseId={caseId || "new-research"}
										onSave={handleSaveDoc}
									/>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Retrieval Sidebar (Admin Mode Only) */}
					{isAdmin && (
						<div className="lg:col-span-4 space-y-4">
							<div className="flex items-center justify-between px-2">
								<div className="flex items-center gap-2">
									<Scale className="h-4 w-4 text-indigo-600" />
									<p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
										الأدلة المباشرة المسترجعة
									</p>
								</div>
								{currentSources.length > 0 && (
									<Badge
										variant="outline"
										className="bg-indigo-50 text-indigo-700 border-indigo-100 font-bold"
									>
										{currentSources.length} نتائج
									</Badge>
								)}
							</div>

							<div className="space-y-3 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
								{isLoading && currentSources.length === 0
									? Array.from({ length: 3 }).map((_, i) => (
											<div
												key={i}
												className="h-32 bg-slate-100 rounded-[2rem] animate-pulse"
											/>
										))
									: currentSources.map((source, i) => (
											<Card
												key={i}
												className="rounded-[2rem] border-slate-100 shadow-sm hover:border-indigo-200 transition-all group overflow-hidden"
											>
												<CardContent className="p-4 space-y-3">
													<div className="flex items-start justify-between gap-2">
														<div className="min-w-0">
															<p className="text-[11px] font-black text-slate-900 line-clamp-1">
																{source.title}
															</p>
															<div className="flex items-center gap-1.5 mt-0.5">
																<Badge
																	className={cn(
																		"text-[8px] px-1.5 py-0 rounded-md font-black uppercase",
																		source.type.toLowerCase().includes("law")
																			? "bg-amber-100 text-amber-700 border-amber-200"
																			: "bg-indigo-100 text-indigo-700 border-indigo-200",
																	)}
																>
																	{source.type.toLowerCase().includes("law")
																		? "قانون"
																		: "سابقة"}
																</Badge>
																<span className="text-[9px] text-slate-400 font-bold truncate">
																	{source.path?.split(">").pop()}
																</span>
															</div>
														</div>
														<div className="text-right shrink-0">
															<p className="text-[10px] font-black text-indigo-600">
																{Math.round((source.score || 0) * 100)}%
															</p>
															<p className="text-[8px] text-slate-300 font-bold uppercase tracking-tighter">
																تطابق
															</p>
														</div>
													</div>

													<div className="bg-slate-50/50 rounded-2xl p-3 border border-slate-100 group-hover:bg-white transition-colors">
														<p className="text-[10px] text-slate-600 leading-relaxed font-medium italic">
															"...
															{source.content.length > 200
																? `${source.content.substring(0, 200)}...`
																: source.content}
															..."
														</p>
													</div>

													{source.label && (
														<div className="flex items-center gap-1.5 text-indigo-500">
															<Hash className="w-3 h-3" />
															<span className="text-[9px] font-black tracking-tight">
																{source.label}
															</span>
														</div>
													)}
												</CardContent>
											</Card>
										))}
							</div>
						</div>
					)}
				</div>
			)}

			{/* Input Section */}
			<Card
				className={cn(
					"border-indigo-50 shadow-sm transition-all rounded-3xl",
					embedded
						? "border shadow-none bg-slate-50/30"
						: "animate-in slide-in-from-bottom-4 fade-in duration-700",
				)}
			>
				{!embedded && (
					<CardHeader className="bg-slate-50/50 border-b">
						<CardTitle className="flex items-center gap-2 text-xl font-black">
							{isAdmin ? (
								<Database className="h-5 w-5 text-indigo-600" />
							) : (
								<Search className="h-5 w-5 text-indigo-600" />
							)}
							{isAdmin ? "اختبار البحث القانوني" : "البحث عن القوانين والسوابق"}
						</CardTitle>
						<CardDescription className="text-sm font-medium">
							{isAdmin
								? "أدخل تساؤلاً قانونياً لاختبار دقة استرجاع البيانات من المكتبة. سيقوم النظام باستخراج القوانين والمبادئ ذات الصلة."
								: "أدخل ملخص الواقعة أو الموضوع القانوني، وسيقوم النظام باستخراج نصوص القوانين الكويتية وأحكام التمييز ذات الصلة."}
						</CardDescription>
					</CardHeader>
				)}
				<CardContent
					className={cn("space-y-4 pt-6 p-6", embedded ? "p-4 md:p-6" : "p-6")}
				>
					<div className="space-y-2">
						<label className="text-indigo-900 font-bold text-sm flex items-center gap-2">
							<Zap className="h-4 w-4 text-indigo-600" />
							{isAdmin
								? "موضوع البحث أو الواقعة"
								: "موضوع البحث أو ملخص الواقعة"}
						</label>
						<Textarea
							placeholder={
								isAdmin
									? "اكتب التساؤل القانوني هنا لاختبار دقة استرجاع البيانات..."
									: "اكتب ملخص الواقعة أو الموضوع القانوني للبحث عن القوانين والأحكام ذات الصلة..."
							}
							className="min-h-[160px] resize-y text-base leading-relaxed p-4 bg-white border-slate-200 focus:ring-indigo-500 rounded-2xl font-bold"
							value={documentText}
							onChange={(e) => setDocumentText(e.target.value)}
							disabled={isLoading}
						/>
					</div>

					<div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-100">
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								setDocumentText("");
								setCompletion("");
								setShowOutput(false);
								setError(null);
								setCurrentSources([]);
							}}
							className="text-slate-500 hover:text-rose-400 rounded-xl border-slate-200 gap-2 h-10 px-6 transition-colors"
							disabled={isLoading}
						>
							<Eraser className="h-4 w-4" />
							مسح البيانات
						</Button>

						<Button
							size="lg"
							className={cn(
								"px-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all active:scale-95 gap-2 h-10",
								embedded ? "w-full sm:w-auto" : "",
							)}
							onClick={handleResearch}
							disabled={isLoading || !documentText.trim()}
						>
							{isLoading ? (
								<Loader2 className="h-5 w-5 animate-spin" />
							) : (
								<Search className="h-5 w-5" />
							)}
							{isLoading
								? "جاري البحث واسترداد الأحكام..."
								: isAdmin
									? "بدء اختبار الاسترجاع"
									: "ابدأ البحث الاستراتيجي (2 نقطة)"}
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Error Display */}
			{error && (
				<div className="p-4 bg-red-50 text-red-800 rounded-2xl border border-red-200 flex items-start gap-3 animate-in fade-in duration-300">
					<AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
					<div>
						<p className="font-bold text-sm">تنبيه أثناء البحث</p>
						<p className="text-xs mt-1 leading-relaxed">{error}</p>
					</div>
				</div>
			)}

			{/* Context-Aware Save Modal */}
			<SaveDocumentModal
				isOpen={showSaveModal}
				onClose={() => setShowSaveModal(false)}
				title={`بحث قانوني — ${new Date().toLocaleDateString("ar-KW")}`}
				onSave={(projectId) => performSave(pendingHtml || "", projectId)}
			/>
		</div>
	);
}
