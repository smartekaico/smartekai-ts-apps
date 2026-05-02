"use client";

import type * as React from "react";
import { useChat } from "@ai-sdk/react";
import { useState, useRef, useEffect } from "react";
import posthog from "posthog-js";
import {
	SendHorizontal,
	Bot,
	User,
	Loader2,
	Eraser,
	Scale,
	Search,
	FileText,
	Zap,
	Sparkles,
	Paperclip,
	Languages,
	Mic,
	ThumbsUp,
	ThumbsDown,
	Copy,
	BookmarkPlus,
	Check,
	Square,
	AlertCircle,
	Info,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { cn, stripMarkdown } from "@/lib/utils";
import LegalMarkdownRenderer from "@/components/legal/LegalMarkdownRenderer";
import { toast } from "sonner";
import { UIMessage, DefaultChatTransport } from "ai";
import { SaveDocumentModal } from "@/components/global/SaveDocumentModal";
import { useDocumentUpload } from "@/hooks/useDocumentUpload";
import { SafetyDisclaimer } from "@/components/global/SafetyDisclaimer";
import { calculateWeight } from "@/lib/credits/credit-utils";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { marked } from "marked";

interface ChatWorkspaceProps {
	user: { id: string };
	organizationId: string;
	sessionId?: string;
	onRefresh?: () => void;
}

export function ChatWorkspace({
	user,
	organizationId,
	sessionId,
	onRefresh,
}: ChatWorkspaceProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const t = useTranslations("Dashboard");
	const locale = useLocale();
	const formatAbortControllerRef = useRef<AbortController | null>(null);

	const [input, setInput] = useState("");

	// State from Hook
	const {
		isUploading,
		progress: uploadProgress,
		extractedText: uploadedContext,
		fileName: activeFileName,
		handleUpload,
		handleFileInputChange,
		reset: resetUpload,
	} = useDocumentUpload({
		onSuccess: (text, name) => {
			toast.success(`تم استخراج النص من ${name} بنجاح!`);
			setShowDocPreview(true);
		},
	});

	// UI / Feedback States
	const [likedMessages, setLikedMessages] = useState<Set<string>>(new Set());
	const [dislikedMessages, setDislikedMessages] = useState<Set<string>>(
		new Set(),
	);
	const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
	const [showSaveModal, setShowSaveModal] = useState(false);
	const [showDocPreview, setShowDocPreview] = useState(false);
	const [pendingSaveContent, setPendingSaveContent] = useState<string | null>(
		null,
	);
	const [isCopiedPreview, setIsCopiedPreview] = useState(false);
	const [currentWeight, setCurrentWeight] = useState(1);
	const [showCreditWarning, setShowCreditWarning] = useState(false);
	const [pendingTextToSend, setPendingTextToSend] = useState<string | null>(
		null,
	);
	const [localExtractedText, setLocalExtractedText] = useState<string | null>(
		null,
	);
	const [isFormatting, setIsFormatting] = useState(false);
	const [isListening, setIsListening] = useState(false);
	const [showCreditInfo, setShowCreditInfo] = useState(false);
	const recognitionRef = useRef<any>(null); // Browser-native SpeechRecognition type check happens in useEffect

	// Initialize Speech Recognition
	useEffect(() => {
		if (typeof window !== "undefined") {
			const SpeechRecognition =
				(window as any).SpeechRecognition ||
				(window as any).webkitSpeechRecognition;
			if (SpeechRecognition) {
				recognitionRef.current = new SpeechRecognition();
				recognitionRef.current.continuous = true;
				recognitionRef.current.interimResults = true;
				recognitionRef.current.lang = "ar-SA"; // Default to Arabic (Saudi/General)

				recognitionRef.current.onresult = (event: any) => {
					let interimTranscript = "";
					for (let i = event.resultIndex; i < event.results.length; ++i) {
						if (event.results[i].isFinal) {
							setInput((prev) => prev + event.results[i][0].transcript);
						} else {
							interimTranscript += event.results[i][0].transcript;
						}
					}
				};

				recognitionRef.current.onend = () => {
					setIsListening(false);
				};

				recognitionRef.current.onerror = (event: any) => {
					console.error("Speech Recognition Error", event.error);
					setIsListening(false);
					toast.error(`فشل التعرف على الصوت: ${event.error}`);
				};
			}
		}
	}, []);

	const toggleListening = () => {
		if (!recognitionRef.current) {
			toast.error("متصفحك لا يدعم خاصية التعرف على الصوت.");
			return;
		}

		if (isListening) {
			recognitionRef.current.stop();
			setIsListening(false);
		} else {
			try {
				recognitionRef.current.start();
				setIsListening(true);
				toast.info("جاري الاستماع... يمكنك التحدث الآن");
			} catch (err) {
				console.error("Failed to start recognition", err);
			}
		}
	};

	// Sync local text with uploaded context
	useEffect(() => {
		if (uploadedContext) {
			setLocalExtractedText(uploadedContext);
		} else {
			setLocalExtractedText(null);
		}
	}, [uploadedContext]);

	useEffect(() => {
		setCurrentWeight(calculateWeight(localExtractedText));
	}, [localExtractedText]);

	const { messages, status, sendMessage, setMessages, stop } = useChat({
		transport: new DefaultChatTransport({
			api: "/api/legal/chat",
		}),
		onFinish: () => {
			// Show credit usage notification
			const label = currentWeight === 1 ? "رصيد" : "أرصدة";
			toast.info(
				`تم استهلاك ${currentWeight} ${label} للتحليل الذكي (Lex Intelligence)`,
				{
					description: "يمكنك مراجعة سجل الاستهلاك في إعدادات المؤسسة.",
					icon: <Zap className="h-4 w-4 text-amber-500" />,
				},
			);
		},
		onError: (error: Error) => {
			try {
				// AI SDK sometimes prefixes with "Error: "
				const cleanMessage = (error instanceof Error ? error.message : "").replace(/^Error:\s*/, "");
				const parsed = JSON.parse(cleanMessage);
				if (parsed.error) {
					toast.error(parsed.error);
					// Fast exit to prevent console.error dumping which triggers Next.js overlay
					return;
				}
			} catch (e) {
				// Not a JSON error string
			}

			console.error("Chat error:", error);

			// Fallback to generic message or the error string if it is not JSON
			if (error instanceof Error && error.message && !error.message.includes("JSON")) {
				toast.error(error instanceof Error ? error.message : "An error occurred");
			} else {
				toast.error("حدث خطأ في الاتصال بالذكاء الاصطناعي.");
			}
		},
	});

	// Inject welcome message for Talking Copilot onboarding
	useEffect(() => {
		if (messages.length === 0) {
			setMessages([
				{
					id: "welcome",
					role: "assistant",
					parts: [
						{
							type: "text",
							text:
								locale === "ar"
									? "مرحباً بك! أنا مساعدك الذكي. كيف يمكنني مساعدتك اليوم؟\n\nيمكنك البدء برفع ملف للتحليل، أو سؤالي عن أي قضية قانونية. إذا كنت جديداً هنا، أنصحك بالضغط على **'دليل البدء السريع'** في القائمة الجانبية."
									: "Welcome! I'm your AI assistant. How can I help you today?\n\nYou can start by uploading a file for analysis, or asking me about any legal issue. If you're new here, I recommend clicking the **'Quick Start Guide'** in the sidebar.",
						},
					],
				},
			]);
		}
	}, [messages.length, setMessages, locale]);

	const isLoading = status === "submitted" || status === "streaming";

	const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setInput(e.target.value);
	};

	const onFormSubmit = async (e?: React.FormEvent, customText?: string) => {
		e?.preventDefault();
		const textToSend = customText || input;
		if (!textToSend.trim() || isLoading) return;

		if (currentWeight > 1) {
			setPendingTextToSend(textToSend);
			setShowCreditWarning(true);
			return;
		}

		await proceedWithSubmit(textToSend);
	};

	const proceedWithSubmit = async (textToSend: string) => {
		setShowCreditWarning(false);
		setPendingTextToSend(null);
		setInput("");

		try {
			posthog.capture("session_chat_sent", {
				sessionId: sessionId,
				messageLength: textToSend.trim().length,
			});

			await sendMessage(
				{
					text: textToSend.trim(),
				},
				{
					body: {
						userId: user.id,
						organizationId: organizationId,
						uploadedContext: localExtractedText,
						locale: locale,
					},
				},
			);
		} catch (error) {
			try {
				const cleanMessage = (error instanceof Error ? error.message : "") || "";
				const parsed = JSON.parse(cleanMessage);
				if (parsed.error) {
					toast.error(parsed.error);
				}
			} catch (e) {
				if ((error instanceof Error && error.message) && !error.message.includes("JSON")) {
					toast.error(error instanceof Error ? error.message : "An error occurred");
				} else {
					toast.error("حدث خطأ في إرسال الرسالة.");
					console.error("Failed to send message:", error);
				}
			}
			setInput(textToSend); // Restore input on failure
		}
	};

	const handleAbortFormat = () => {
		if (formatAbortControllerRef.current) {
			formatAbortControllerRef.current.abort();
			formatAbortControllerRef.current = null;
			setIsFormatting(false);
		}
	};

	const handleSmartFormat = async () => {
		if (!localExtractedText) return;

		// If already formatting, clicking again will act as "Stop"
		if (isFormatting) {
			handleAbortFormat();
			return;
		}

		setIsFormatting(true);

		// Create new abort controller
		formatAbortControllerRef.current = new AbortController();

		try {
			const res = await fetch("/api/legal/format-text", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text: localExtractedText }),
				signal: formatAbortControllerRef.current.signal,
			});

			if (res.status === 402) {
				toast.error(t("insufficientCredits") || "رصيد غير كافٍ للاستخدام");
				return;
			}

			if (!res.ok) throw new Error("Format failed");

			const data = await res.json();
			if (data.text) {
				setLocalExtractedText(data.text);
				toast.success(
					t("formatSuccess") || "تم تنسيق النص بنجاح (استهلاك 1 رصيد)",
				);

				posthog.capture("document_smart_formatted", {
					sessionId,
					fileName: activeFileName,
				});
			}
		} catch (err) {
			if (err instanceof Error && err.name === "AbortError") {
				console.log("Smart format aborted by user");
				// Toast is already handled in handleAbortFormat
			} else {
				console.error("Smart format error:", err);
				toast.error(t("formatError") || "فشل التنسيق الذكي");
			}
		} finally {
			setIsFormatting(false);
			formatAbortControllerRef.current = null;
		}
	};

	// Auto-scroll to bottom
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messages, isLoading]);

	// Sync Input Height
	useEffect(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
			if (input) {
				textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
			}
		}
	}, [input]);

	const quickActions =
		locale === "ar"
			? [
				{
					label: "تحليل ثغرات",
					icon: Scale,
					prompt:
						"قم بتحليل هذا المحتوى وابحث عن أي ثغرات قانونية أو مخاطر محتملة.",
				},
				{
					label: "بحث قانوني",
					icon: Search,
					prompt: "ابحث في القوانين والمبادئ القضائية المتعلقة بـ: ",
				},
				{
					label: "إعادة صياغة",
					icon: Languages,
					prompt:
						"قم بإعادة صياغة هذا المحتوى بأسلوب قانوني بليغ وأكثر دقة: ",
				},
				{
					label: "تلخيص",
					icon: Sparkles,
					prompt: "قدم ملخصاً وافياً وشاملاً لهذا المحتوى:",
				},
			]
			: [
				{
					label: "Gap Analysis",
					icon: Scale,
					prompt:
						"Analyze this content and find any legal gaps or potential risks.",
				},
				{
					label: "Law Research",
					icon: Search,
					prompt: "Research laws and judicial principles related to: ",
				},
				{
					label: "Rephrase",
					icon: Languages,
					prompt:
						"Rephrase this content in a precise and eloquent legal style: ",
				},
				{
					label: "Summarize",
					icon: Sparkles,
					prompt: "Provide a comprehensive summary of this content:",
				},
			];

	const handleQuickAction = (actionPrompt: string) => {
		if (isLoading) return;

		// Only proceed if we have some context
		if (input.trim() || localExtractedText) {
			const textToPrompt = input.trim();
			const combined = textToPrompt
				? `${actionPrompt}\n\n${textToPrompt}`
				: actionPrompt;
			onFormSubmit(undefined, combined);
		} else {
			// Fallback: just set input and focus (though buttons should be disabled now)
			setInput(actionPrompt);
			textareaRef.current?.focus();
		}
	};

	const clearChat = () => {
		setMessages([]);
		setInput("");
		resetUpload();
		toast.info("تم البدء بمحادثة جديدة ممسوحة الذاكرة.");
	};

	// Interaction Handlers
	const handleLike = (id: string) => {
		setLikedMessages((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else {
				next.add(id);
				setDislikedMessages((d) => {
					const dn = new Set(d);
					dn.delete(id);
					return dn;
				});
			}
			return next;
		});
	};

	const handleDislike = (id: string) => {
		setDislikedMessages((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else {
				next.add(id);
				setLikedMessages((l) => {
					const ln = new Set(l);
					ln.delete(id);
					return ln;
				});
			}
			return next;
		});
	};

	const getFullMessageContent = (message: any) => {
		// Priority 1: Check parts array (standard in Vercel AI SDK v6 stream)
		if (message.parts && message.parts.length > 0) {
			return message.parts
				.map((p: any) => (p.type === "text" ? p.text : ""))
				.filter(Boolean)
				.join("\n\n");
		}

		// Priority 2: Check content property (deprecated but still used in some states)
		if (typeof message.content === "string" && message.content.length > 0) {
			return message.content;
		}

		return "";
	};

	const handleCopy = async (id: string, message: any) => {
		try {
			const rawText = getFullMessageContent(message);
			const cleanText = stripMarkdown(rawText);
			await navigator.clipboard.writeText(cleanText);
			setCopiedMessageId(id);
			toast.success("تم نسخ النص (بدون تنسيق)");
			setTimeout(() => setCopiedMessageId(null), 2000);
		} catch (err) {
			toast.error("فشل نسخ النص");
		}
	};

	const handleSaveToSession = async (message: any) => {
		const text = getFullMessageContent(message);
		if (!text) return toast.error("لا يوجد نص لحفظه");

		// Extract title from message content
		const cleanTitle =
			stripMarkdown(text).substring(0, 40).trim() || "Lex Insight";

		const toastId = toast.loading("جاري حفظ الاقتباس في الجلسة...");
		try {
			// Convert markdown to HTML for TipTap compatibility
			const htmlContent = marked.parse(text);

			const res = await fetch("/api/legal/documents", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: `Lex Insight: ${cleanTitle}`,
					content: htmlContent,
					docType: "Research",
					caseProjectId: sessionId,
				}),
			});

			if (!res.ok) throw new Error("Failed to save");

			const newDoc = await res.json();
			posthog.capture("session_doc_saved", {
				sessionId: sessionId,
				docId: newDoc.id,
				docType: "Research",
				title: cleanTitle,
			});

			toast.success("تم حفظ الاقتباس بنجاح", { id: toastId });
			onRefresh?.();
			window.dispatchEvent(new CustomEvent("refresh-workspace"));
		} catch (err) {
			toast.error("فشل حفظ الاقتباس", { id: toastId });
		}
	};

	const handleSaveFullChat = async () => {
		if (messages.length === 0) return toast.error("لا توجد محادثة لحفظها");

		// Format messages into a readable Markdown string
		const formattedContent = messages
			.map((m) => {
				const roleName = m.role === "user" ? "المستخدم" : "Lex (المساعد الذكي)";
				const text = getFullMessageContent(m);
				return `### ${roleName}\n\n${text}\n\n---`;
			})
			.join("\n\n");

		// Extract title from first user message
		const firstUserMsg = messages.find((m) => m.role === "user");
		const rawTitle = firstUserMsg
			? getFullMessageContent(firstUserMsg)
			: "محادثة Lex";
		const cleanTitle = stripMarkdown(rawTitle).substring(0, 40).trim();

		const toastId = toast.loading("جاري تحويل المحادثة لمستند...");
		try {
			const res = await fetch("/api/legal/documents", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: `ملخص: ${cleanTitle}`,
					content: formattedContent,
					docType: "Research", // Save as readable research doc
					caseProjectId: sessionId,
				}),
			});

			if (!res.ok) throw new Error("Failed to save chat");

			toast.success("تم حفظ المحادثة كمستند بنجاح", { id: toastId });
			onRefresh?.();
		} catch (err) {
			toast.error("فشل حفظ المحادثة", { id: toastId });
		}
	};

	const performSave = async (projectId: string | null) => {
		if (!pendingSaveContent) return;

		const toastId = toast.loading("جاري حفظ المستند...");
		try {
			const payload: any = {
				title: `Lex Research — ${new Date().toLocaleDateString("ar-KW")}`,
				content: pendingSaveContent,
				docType: "Research",
			};

			if (projectId) {
				payload.caseProjectId = projectId;
			}

			const res = await fetch("/api/legal/documents", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "فشل الحفظ");

			toast.success(
				projectId
					? "تم حفظ المستند في جلسة العمل"
					: "تم حفظ المستند في قاعدة المعرفة",
				{ id: toastId },
			);
			setShowSaveModal(false);
			setPendingSaveContent(null);
		} catch (err) {
			console.error("Save error:", err);
			toast.error(`فشل الحفظ: ${err instanceof Error ? err.message : "Unknown error"}`, { id: toastId });
		}
	};

	function handleSaveDocument(message: any): void {
		throw new Error("Function not implemented.");
	}

	return (
		<div className="flex flex-col h-full w-full max-w-none relative overflow-hidden bg-slate-50/10 rounded-3xl border border-slate-100/50 shadow-sm animate-in fade-in duration-700 mb-0">
			{/* SECTION: Message Stream (Reliable Flex Scroll) */}
			<div
				ref={scrollRef}
				className="flex-1 w-full overflow-y-auto px-4 md:px-8 scroll-smooth no-scrollbar"
			>
				<div className="max-w-none w-full mx-auto pt-4 pb-6 space-y-6">
					<SafetyDisclaimer className="mb-6 shadow-sm border-amber-100/50" />

					{messages.length === 0 && (
						<div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
							<div className="h-20 w-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 animate-bounce duration-[3000ms]">
								<Sparkles className="h-10 w-10" />
							</div>
							<div className="max-w-sm">
								<h3 className="text-xl font-black text-slate-900">
									مرحباً بك في Lex
								</h3>
								<p className="text-sm font-medium text-slate-500 mt-2">
									ابدأ بطرح أي تساؤل قانوني، أو ارفع مستنداً للتحليل الفوري
									واستخراج الثغرات القانونية.
								</p>
							</div>
						</div>
					)}
					{messages.map((message: any, idx: number) => (
						<div
							key={message.id || idx}
							className={cn(
								"flex w-full gap-5 animate-in slide-in-from-bottom-6 duration-700 fill-mode-both",
								message.role === "user" ? "flex-row-reverse" : "flex-row",
							)}
						>
							{/* Avatar Column */}
							<div
								className={cn(
									"h-10 w-10 rounded-xl shrink-0 flex items-center justify-center shadow-lg transition-transform hover:scale-110",
									message.role === "user"
										? "bg-slate-950 text-white"
										: "bg-indigo-600 text-white ring-4 ring-indigo-50",
								)}
							>
								{message.role === "user" ? (
									<User className="h-5 w-5" />
								) : (
									<Bot className="h-5 w-5" />
								)}
							</div>

							{/* Content Column */}
							<div
								className={cn(
									"flex-1 max-w-[95%] space-y-4",
									message.role === "user" ? "text-left" : "text-right",
								)}
							>
								<div
									className={cn(
										"px-6 py-4 rounded-[24px] shadow-sm transition-all border group relative",
										message.role === "user"
											? "bg-slate-900 text-white border-slate-800 rounded-tr-none ml-auto text-right"
											: "bg-white border-slate-100 text-slate-800 rounded-tl-none prose prose-slate max-w-none text-right font-medium leading-[1.8]",
									)}
								>
									{/* Render Message Parts (AI SDK v6) */}
									{message.parts && message.parts.length > 0 ? (
										message.parts.map((part: any, pIdx: number) => {
											switch (part.type) {
												case "text":
													return message.role === "user" ? (
														<p key={pIdx} className="whitespace-pre-wrap">
															{part.text}
														</p>
													) : (
														<LegalMarkdownRenderer
															key={pIdx}
															content={part.text || ""}
															isStreaming={
																isLoading &&
																idx === messages.length - 1 &&
																pIdx === message.parts.length - 1
															}
														/>
													);

												case "reasoning":
													return (
														<div
															key={pIdx}
															className="text-slate-400 text-[10px] font-bold italic mb-4 border-r-2 border-indigo-100 pr-4 py-2 bg-slate-50/50 rounded-lg"
														>
															<span className="flex items-center gap-2 uppercase tracking-widest mb-1 opacity-50">
																<Zap className="h-3 w-3" />
																التفكير المنطقي لكس (Lex Reasoning)
															</span>
															{part.text || "..."}
														</div>
													);

												case "tool-call":
													return (
														<div
															key={pIdx}
															className="flex items-center gap-3 text-indigo-600 text-[10px] font-black mb-4 bg-indigo-50/30 p-3 rounded-xl border border-indigo-100/30 animate-pulse"
														>
															<Search className="h-3 w-3" />
															{part.toolName === "searchKnowledgeBase"
																? "استقصاء البيانات من قاعدة المعرفة..."
																: "معالجة الأنظمة الذكية..."}
														</div>
													);

												default:
													return null;
											}
										})
									) : isLoading &&
										idx === messages.length - 1 &&
										message.role === "assistant" ? (
										<div className="flex items-center gap-2 text-indigo-400 animate-pulse py-2">
											<Loader2 className="h-3 w-3 animate-spin" />
											<span className="text-[10px] font-black uppercase tracking-widest">
												Lex is starting...
											</span>
										</div>
									) : null}

									{(!message.parts || message.parts.length === 0) &&
										message.content &&
										(message.role === "user" ? (
											<p className="whitespace-pre-wrap">{message.content}</p>
										) : (
											<LegalMarkdownRenderer
												content={message.content}
												isStreaming={isLoading && idx === messages.length - 1}
											/>
										))}
								</div>

								{message.role === "assistant" && !isLoading && (
									<div className="flex items-center gap-1 mt-2 mr-2 justify-end animate-in fade-in slide-in-from-top-2 duration-300">
										<Button
											variant="ghost"
											size="icon"
											title={locale === "ar" ? "إعجاب" : "Like"}
											onClick={() => handleLike(message.id)}
											className={cn(
												"h-8 w-8 rounded-lg transition-colors",
												likedMessages.has(message.id)
													? "text-emerald-600 bg-emerald-50"
													: "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50",
											)}
										>
											<ThumbsUp className="h-3.5 w-3.5" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											title={locale === "ar" ? "لم يعجبني" : "Dislike"}
											onClick={() => handleDislike(message.id)}
											className={cn(
												"h-8 w-8 rounded-lg transition-colors",
												dislikedMessages.has(message.id)
													? "text-rose-600 bg-rose-50"
													: "text-slate-400 hover:text-rose-600 hover:bg-rose-50",
											)}
										>
											<ThumbsDown className="h-3.5 w-3.5" />
										</Button>
										<div className="w-px h-3 bg-slate-200 mx-1" />
										<Button
											variant="ghost"
											size="icon"
											title={locale === "ar" ? "نسخ" : "Copy"}
											onClick={() => handleCopy(message.id, message)}
											className={cn(
												"h-8 w-8 rounded-lg transition-colors",
												copiedMessageId === message.id
													? "text-indigo-600 bg-indigo-50"
													: "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50",
											)}
										>
											{copiedMessageId === message.id ? (
												<Check className="h-3.5 w-3.5 animate-in zoom-in" />
											) : (
												<Copy className="h-3.5 w-3.5" />
											)}
										</Button>
										<div className="w-px h-3 bg-slate-200 mx-1" />
										<Button
											variant="ghost"
											size="icon"
											title={locale === "ar" ? "حفظ كمستند" : "Save Document"}
											onClick={() => handleSaveToSession(message)}
											className="h-8 w-8 rounded-lg transition-colors text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
										>
											<BookmarkPlus className="h-3.5 w-3.5" />
										</Button>
									</div>
								)}

								{/* SECTION: Source Cards (Retrieved Knowledge) */}
								{message.role === "assistant" &&
									message.annotations &&
									message.annotations.length > 0 && (
										<div className="mt-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
											<div className="flex items-center gap-2 px-2">
												<div className="h-px flex-1 bg-slate-100" />
												<span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
													المصادر والمراجع المستندة
												</span>
												<div className="h-px flex-1 bg-slate-100" />
											</div>

											<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-2">
												{message.annotations.map((ann: any, annIdx: number) =>
													ann.sources?.map((source: any, srcIdx: number) => {
														const IconComponent =
															source.docType === "law"
																? Scale
																: source.docType === "precedent"
																	? Search
																	: FileText;
														const typeLabel =
															t(`Workspace.home.docTypes.${source.docType}`) ||
															source.docType;

														return (
															<div
																key={`src-${annIdx}-${srcIdx}`}
																className="flex items-start gap-3 p-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl transition-all group/card cursor-default"
															>
																<div className="h-10 w-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm group-hover/card:scale-110 transition-transform shrink-0">
																	<IconComponent className="h-5 w-5" />
																</div>
																<div className="flex-1 min-w-0 text-right">
																	<div className="flex items-center gap-2 mb-1">
																		<span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100/50">
																			{typeLabel}
																		</span>
																		{source.jurisdiction && (
																			<span className="text-[9px] font-bold text-slate-400">
																				•{" "}
																				{source.jurisdiction === "kuwait"
																					? "الكويت"
																					: source.jurisdiction}
																			</span>
																		)}
																	</div>
																	<h4 className="text-xs font-bold text-slate-800 truncate leading-tight">
																		{source.title}
																	</h4>
																	<p className="text-[10px] text-slate-500 truncate mt-1 opactiy-80">
																		{source.heading || "محتوى عام"}
																	</p>
																</div>
															</div>
														);
													}),
												)}
											</div>
										</div>
									)}
							</div>
						</div>
					))}

					{isLoading && messages[messages.length - 1]?.role === "user" && (
						<div className="flex gap-5 animate-in slide-in-from-bottom-6 duration-700">
							<div className="h-10 w-10 rounded-xl bg-indigo-600 text-white shrink-0 flex items-center justify-center shadow-lg ring-4 ring-indigo-50">
								<Bot className="h-5 w-5" />
							</div>
							<div className="bg-white border border-indigo-100 px-6 py-4 rounded-[24px] rounded-tl-none flex items-center gap-4 shadow-sm">
								<Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
								<div className="flex flex-col">
									<span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
										Lex is searching...
									</span>
									<span className="text-sm font-bold text-slate-600">
										جاري مسح قاعدة المعرفة وتحليل السياق...
									</span>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* SECTION: Integrated Bottom Console */}
			<div className="w-full z-30 pb-0 px-4 border-t bg-white/30 backdrop-blur-xl shrink-0">
				<div className="max-w-none w-full mx-auto space-y-1 pt-0">
					<div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 px-1">
						{quickActions.map((action, idx) => (
							<Button
								key={idx}
								variant="outline"
								size="sm"
								disabled={isLoading || (!input.trim() && !localExtractedText)}
								onClick={() => handleQuickAction(action.prompt)}
								className="whitespace-nowrap rounded-full bg-white/80 backdrop-blur-md border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/50 font-bold text-[11px] lg:text-[13px] gap-2 shadow-sm transition-all active:scale-95 shrink-0 px-4 lg:px-6 lg:py-5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/80"
							>
								<action.icon className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
								{action.label}
							</Button>
						))}

						<div className="w-px h-6 bg-slate-200 mx-2 shrink-0" />
					</div>

					{localExtractedText && (
						<div className="flex flex-col items-end animate-in slide-in-from-bottom-4 mb-2 mr-2">
							<div
								onClick={() => setShowDocPreview(true)}
								title={
									locale === "ar"
										? "النقر لعرض محتوى المستند"
										: "Click to view document content"
								}
								className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md border border-emerald-100 py-1.5 px-2.5 rounded-full shadow-sm w-fit cursor-pointer hover:bg-emerald-50 hover:border-emerald-200 transition-all group max-w-full overflow-hidden"
							>
								<div className="h-5 w-5 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 transition-colors shrink-0">
									<FileText className="h-3 w-3" />
								</div>
								<span className="text-[11px] font-bold text-emerald-700 truncate max-w-[150px] leading-none pt-[1px]">
									{activeFileName || "المستند المرفق"}
								</span>
								<div className="w-px h-3 bg-emerald-200 mx-0.5 shrink-0" />
								<Button
									variant="ghost"
									size="icon"
									title={locale === "ar" ? "إزالة المستند" : "Remove document"}
									onClick={(e) => {
										e.stopPropagation();
										resetUpload();
									}}
									className="h-5 w-5 rounded-full hover:bg-rose-100 hover:text-rose-600 text-slate-400 shrink-0 p-0"
								>
									<Eraser className="h-2.5 w-2.5" />
								</Button>
							</div>
						</div>
					)}

					<div
						className={cn(
							"bg-white rounded-[28px] border border-slate-200 shadow-2xl p-3 transition-all duration-300 focus-within:border-indigo-500/50 focus-within:ring-8 focus-within:ring-indigo-500/5 group",
							isLoading && "opacity-80",
						)}
					>
						<div className="flex flex-col gap-2">
							<textarea
								ref={textareaRef}
								id="chat-textarea"
								value={input}
								onChange={handleInputChange}
								onKeyDown={(e) => {
									if (e.key === "Enter" && !e.shiftKey) {
										e.preventDefault();
										onFormSubmit(e);
									}
								}}
								placeholder="اسأل Lex عن القانون، المبادئ القضائية، أو حلل مستندك..."
								className="w-full min-h-[48px] max-h-[250px] py-1 px-3 bg-transparent border-none focus:ring-0 text-slate-800 font-bold text-sm resize-none text-right leading-relaxed placeholder:text-slate-400 outline-none"
								dir="rtl"
							/>

							<div className="flex items-center justify-between border-t border-slate-50 pt-2 px-1">
								<div className="flex items-center gap-1">
									<Button
										variant="ghost"
										size="icon"
										disabled={isLoading || isUploading}
										onClick={() => fileInputRef.current?.click()}
										className="h-9 w-9 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all shrink-0"
									>
										{isUploading ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<Paperclip className="h-4 w-5" />
										)}
									</Button>
									<input
										type="file"
										ref={fileInputRef}
										onChange={handleFileInputChange}
										className="hidden"
										accept=".pdf,.docx,.doc,.txt,.md"
									/>

									<Button
										variant="ghost"
										size="icon"
										onClick={toggleListening}
										className={cn(
											"h-9 w-9 rounded-xl transition-all shrink-0 group/mic",
											isListening
												? "bg-rose-50 text-rose-600 animate-pulse ring-2 ring-rose-200"
												: "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50",
										)}
										title={isListening ? "إيقاف التسجيل" : "بدء التسجيل الصوتي"}
									>
										<Mic
											className={cn("h-4 w-4", isListening && "fill-current")}
										/>
									</Button>

									<Button
										variant="ghost"
										size="icon"
										onClick={() => setShowCreditInfo(true)}
										className={cn(
											"h-9 w-9 rounded-xl transition-all shrink-0 group/cost",
											currentWeight > 1
												? "bg-amber-50 text-amber-600 shadow-inner"
												: "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50",
										)}
										title={locale === "ar" ? "تكلفة الرسالة" : "Message Cost"}
									>
										{currentWeight > 1 ? (
											<AlertCircle className="h-4 w-4 animate-pulse" />
										) : (
											<Info className="h-4 w-4" />
										)}
									</Button>
								</div>

								<Button
									onClick={(e) => (isLoading ? stop() : onFormSubmit(e))}
									disabled={!input.trim() && !isLoading}
									className={cn(
										"h-9 px-5 rounded-full shadow-lg transition-all active:scale-95 shrink-0 flex items-center gap-2 font-black text-[11px] uppercase tracking-tight",
										isLoading
											? "bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600"
											: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200",
									)}
								>
									{isLoading ? (
										<>
											<div className="h-2 w-2 bg-current rounded-sm animate-pulse" />
											إيقاف
										</>
									) : (
										<>
											<SendHorizontal className="h-4 w-4" />
											إرسال
										</>
									)}
								</Button>
							</div>
						</div>
					</div>

					<p className="text-[10px] text-center text-slate-400 font-bold opacity-0 group-focus-within:opacity-100 transition-opacity uppercase tracking-widest">
						Shift + Enter لسطر جديد • Lex قد تخطئ في بعض التواريخ، يرجى التحقق
						من النسخ الرسمية
					</p>
				</div>
			</div>

			{/* SECTION: Document Preview Modal */}
			<Dialog open={showDocPreview} onOpenChange={setShowDocPreview}>
				<DialogContent className="sm:max-w-6xl w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-[2.5rem] border border-slate-200 shadow-2xl z-[100]">
					<DialogHeader className="p-8 bg-slate-900 text-white shrink-0">
						<div className="flex items-center gap-5">
							<div className="h-14 w-14 bg-white/10 rounded-2xl flex items-center justify-center ring-1 ring-white/20">
								<FileText className="h-7 w-7 text-indigo-400" />
							</div>
							<div className="text-right">
								<DialogTitle className="text-2xl font-black tracking-tight">
									{activeFileName}
								</DialogTitle>
								<DialogDescription className="text-slate-400 font-medium text-sm mt-1">
									النص المستخرج للتحليل القانوني بواسطة الذكاء الاصطناعي
								</DialogDescription>
							</div>
						</div>
					</DialogHeader>
					<ScrollArea
						className="flex-1 p-10 bg-slate-50/50 leading-[1.8] text-slate-700 text-right overflow-y-auto"
						dir="rtl"
					>
						<LegalMarkdownRenderer content={localExtractedText || ""} />
					</ScrollArea>
					<div className="p-6 bg-white border-t flex items-center justify-between gap-4">
						<Button
							variant="outline"
							onClick={async () => {
								if (!localExtractedText) return;
								try {
									await navigator.clipboard.writeText(localExtractedText);
									setIsCopiedPreview(true);
									toast.success("تم نسخ محتوى المستند");
									setTimeout(() => setIsCopiedPreview(false), 2000);
								} catch (err) {
									toast.error("فشل النسخ");
								}
							}}
							className="rounded-xl px-6 border-slate-200 text-slate-600 font-bold gap-2 hover:bg-slate-50 transition-all"
						>
							{isCopiedPreview ? (
								<Check className="h-4 w-4 text-emerald-600" />
							) : (
								<Copy className="h-4 w-4" />
							)}
							{isCopiedPreview ? "تم النسخ" : "نسخ النص"}
						</Button>

						<div className="flex items-center gap-2">
							<Button
								onClick={handleSmartFormat}
								disabled={!localExtractedText}
								variant={isFormatting ? "destructive" : "outline"}
								className={cn(
									"rounded-xl px-6 font-bold gap-2 transition-all",
									isFormatting
										? "bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100"
										: "border-indigo-100 text-indigo-600 hover:bg-indigo-50",
									isFormatting && "animate-pulse",
								)}
							>
								{isFormatting ? (
									<Square className="h-4 w-4 fill-current" />
								) : (
									<Sparkles className="h-4 w-4" />
								)}
								{isFormatting
									? t("stopFormat")
									: t("smartFormat") || "تنسيق ذكي (1 رصيد)"}
							</Button>
							<Button
								onClick={() => setShowDocPreview(false)}
								className="rounded-xl px-10 bg-slate-900 text-white hover:bg-slate-800 font-black shadow-lg shadow-slate-200 h-11"
							>
								إغلاق
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			<SaveDocumentModal
				isOpen={showSaveModal}
				onClose={() => {
					setShowSaveModal(false);
					setPendingSaveContent(null);
				}}
				title={`Lex Research — ${new Date().toLocaleDateString("ar-KW")}`}
				onSave={performSave}
			/>

			<ConfirmModal
				isOpen={showCreditWarning}
				onClose={() => {
					setShowCreditWarning(false);
					setPendingTextToSend(null);
				}}
				onConfirm={() => {
					if (pendingTextToSend) {
						proceedWithSubmit(pendingTextToSend);
					}
				}}
				title="تأكيد استهلاك الأرصدة"
				description={`هذا المستند طويل جداً ويحتاج لمعالجة متقدمة. سيتم خصم ${currentWeight} أرصدة من حساب المؤسسة للمتابعة. هل أنت متأكد من رغبتك بالاستمرار؟`}
				confirmText="موافق، استمر"
				cancelText="إلغاء"
				variant="default"
			/>

			{/* Credits Info Modal */}
			<Dialog open={showCreditInfo} onOpenChange={setShowCreditInfo}>
				<DialogContent className="sm:max-w-md rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
					<div className="p-8 text-right">
						<div className="flex items-center justify-end gap-3 mb-6">
							<div className="text-right">
								<DialogTitle className="text-xl font-black text-slate-900">
									نظام استهلاك الأرصدة
								</DialogTitle>
								<DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
									Lex Credits System
								</DialogDescription>
							</div>
							<div className="h-12 w-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shadow-inner">
								<Zap className="h-6 w-6" />
							</div>
						</div>

						<div className="space-y-4">
							<div className="bg-slate-50 rounded-[1.5rem] p-5 border border-slate-100 transition-all hover:border-indigo-100">
								<div className="flex items-center justify-between mb-3">
									<span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md uppercase border border-indigo-100">
										المحادثة العادية
									</span>
									<span className="text-lg font-black text-slate-900">1 رصيد</span>
								</div>
								<p className="text-xs font-medium text-slate-500 leading-relaxed">
									يتم خصم رصيد واحد لكل رسالة في المحادثات العادية والأسئلة القانونية المباشرة.
								</p>
							</div>

							<div className="bg-amber-50/50 rounded-[1.5rem] p-5 border border-amber-100 transition-all hover:border-amber-200">
								<div className="flex items-center justify-between mb-3">
									<span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-md uppercase border border-amber-200">
										تحليل المستندات الطويلة
									</span>
									<span className="text-lg font-black text-slate-900">
										{currentWeight > 1 ? currentWeight : "2-5"} أرصدة
									</span>
								</div>
								<p className="text-xs font-medium text-slate-500 leading-relaxed">
									عند رفع مستندات ضخمة، يتم احتساب التكلفة بناءً على طول النص (Tokens). سيتم تنبيهك دائماً قبل الخصم إذا كانت التكلفة تزيد عن رصيد واحد.
								</p>
							</div>
						</div>

						<div className="mt-8 flex justify-end">
							<Button
								onClick={() => setShowCreditInfo(false)}
								className="w-full h-12 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all"
							>
								فهمت ذلك
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
