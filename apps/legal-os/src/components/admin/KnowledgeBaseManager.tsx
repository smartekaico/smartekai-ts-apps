"use client";

import { getJurisdictions } from "@/app/[locale]/actions/admin-jurisdictions";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
	AlertCircle,
	CheckCircle2,
	Clock,
	Database,
	FileText,
	Info,
	Layers,
	Loader2,
	MessageSquare,
	MoreVertical,
	RefreshCw,
	Search,
	Terminal,
	Trash2,
	Upload,
	Zap,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import TurndownService from "turndown";
import { KnowledgeBaseTester } from "./KnowledgeBaseTester";

interface DocRecord {
	id: number;
	title: string;
	docType: string;
	jurisdiction: string;
	industry: string;
	categoryId: string | null;
	status: string;
	createdAt: string;
	chunksCount: number;
}

export function KnowledgeBaseManager() {
	const t = useTranslations("Workspace.home.docTypes");
	const currentLocale = useLocale();
	// Tabs
	const [activeTab, setActiveTab] = useState<
		"library" | "add" | "system" | "tester" | "scraper"
	>("library");

	// Library State
	const [docs, setDocs] = useState<DocRecord[]>([]);
	const [isLoadingDocs, setIsLoadingDocs] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");

	// Upload State
	const [isUploading, setIsUploading] = useState(false);
	const [uploadFiles, setUploadFiles] = useState<File[]>([]);
	const [fileStatuses, setFileStatuses] = useState<
		Record<string, "pending" | "uploading" | "success" | "error">
	>({});
	const [uploadProgress, setUploadProgress] = useState(0);
	const [jurisdiction, setJurisdiction] = useState("kuwait"); // Code (lower-case)
	const [categoryId, setCategoryId] = useState<string>("");
	const [docType, setDocType] = useState("law");
	const [industry, setIndustry] = useState("LEGAL");
	const [manualTitle, setManualTitle] = useState("");
	const [manualContent, setManualContent] = useState("");
	const [scrapeUrl, setScrapeUrl] = useState("");
	const [isScraping, setIsScraping] = useState(false);

	// External Data for Upload Form
	const [jurisdictions, setJurisdictions] = useState<any[]>([]);
	const [categories, setCategories] = useState<{ id: string; slug: string; nameAr: string; legalDomain: string }[]>([]);
	const [isLoadingMeta, setIsLoadingMeta] = useState(false);
	const [tags, setTags] = useState<string[]>([]);

	useEffect(() => {
		if (categoryId) {
			const cat = categories.find((c) => c.id === categoryId);
			if (cat?.legalDomain) {
				setTags([cat.legalDomain]);
			}
		} else {
			setTags([]);
		}
	}, [categoryId, categories]);

	// Deletion State
	const [itemToDelete, setItemToDelete] = useState<number | null>(null);
	const [showConfirm, setShowConfirm] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	// Bulk Ingest State
	const [isIngesting, setIsIngesting] = useState(false);
	const [ingestLog, setIngestLog] = useState<any>(null);

	// Formatting State
	const [isFormatting, setIsFormatting] = useState(false);

	const loadDocs = useCallback(async () => {
		setIsLoadingDocs(true);
		try {
			const res = await fetch("/api/admin/kb/documents");
			if (res.ok) {
				const data = await res.json();
				setDocs(data.documents);
			}
		} catch (err) {
			toast.error("فشل في تحميل المكتبة");
		} finally {
			setIsLoadingDocs(false);
		}
	}, []);

	const loadMetadata = useCallback(async () => {
		setIsLoadingMeta(true);
		try {
			const jRes = await getJurisdictions();
			if (jRes.success) setJurisdictions(jRes.data || []);
		} finally {
			setIsLoadingMeta(false);
		}
	}, []);

	const loadCategories = useCallback(
		async (jCode: string) => {
			// Find the jurisdiction ID from code
			const juriId = jurisdictions.find(
				(j) => j.id === jCode || j.code.toLowerCase() === jCode,
			)?.id;
			if (!juriId) return;

			try {
				const res = await fetch(
					`/api/admin/kb/categories?jurisdictionId=${juriId}`,
				);
				if (res.ok) {
					const data = await res.json();
					setCategories(data);
				}
			} catch (err) {}
		},
		[jurisdictions],
	);

	const SYSTEM_TAGS = [
		"CIVIL",
		"CRIMINAL",
		"PENAL",
		"PENAL_CODE",
		"PENAL CODE",
		"COMMERCIAL",
		"LABOR",
		"FAMILY",
		"ADMINISTRATIVE",
		"GENERAL",
		"PERSONAL_STATUS",
		"REAL_ESTATE",
		"COMPANIES",
	];

	const getLocalizedCategory = (catId: string) => {
		const mapping: Record<string, string> = {
			CIVIL: "مدني",
			CRIMINAL: "جنائي",
			PENAL: "جنائي",
			PENAL_CODE: "جنائي",
			"PENAL CODE": "جنائي",
			COMMERCIAL: "تجاري",
			LABOR: "عمالي",
			FAMILY: "أحوال شخصية",
			ADMINISTRATIVE: "إداري",
			GENERAL: "عام",
			PERSONAL_STATUS: "أحوال شخصية",
			REAL_ESTATE: "عقاري",
			COMPANIES: "شركات",
		};

		// 1. Check explicit mapping first (handles system IDs/slugs)
		const mapped = mapping[catId.toUpperCase()];
		if (mapped) return mapped;

		// 2. Check database record
		const cat = categories.find((c) => c.id === catId || c.slug === catId);
		if (cat?.nameAr && cat.nameAr !== cat.id) {
			// Even if it has a nameAr, if it matches a known English term, localize it
			const subMapped = mapping[cat.nameAr.toUpperCase()];
			if (subMapped) return subMapped;
			return cat.nameAr;
		}

		return catId;
	};

	const getLocalizedDocType = (type: string) => {
		const mapping: Record<string, string> = {
			law: "قانون",
			court_judgment: "سابقة / حكم قضائي",
			precedent: "سابقة / حكم قضائي",
			legal_template: "نموذج قانوني",
			template: "نموذج قانوني",
			research_paper: "بحث قانوني",
			internal_memo: "مذكرة داخلية",
			legal_principle: "مبدأ قانوني",
			principle: "مبدأ قانوني",
			procedure: "إجراء قانوني",
			administrative_decision: "قرار إداري",
			firm_precedent: "سابقة مكتب",
		};
		return mapping[type] || type;
	};

	useEffect(() => {
		loadMetadata();
	}, [loadMetadata]);

	useEffect(() => {
		if (jurisdiction) {
			loadCategories(jurisdiction);
			setCategoryId(""); // Reset category when jurisdiction changes
		}
	}, [jurisdiction, loadCategories]);

	useEffect(() => {
		if (activeTab === "library") loadDocs();
	}, [activeTab, loadDocs]);

	const handleDelete = (id: number) => {
		setItemToDelete(id);
		setShowConfirm(true);
	};

	const confirmDelete = async () => {
		if (!itemToDelete) return;
		setIsDeleting(true);
		try {
			const res = await fetch(`/api/admin/kb/documents?id=${itemToDelete}`, {
				method: "DELETE",
			});
			if (res.ok) {
				toast.success("تم الحذف بنجاح");
				setDocs((prev) => prev.filter((d) => d.id !== itemToDelete));
				setShowConfirm(false);
			}
		} catch (err) {
			toast.error("فشل الحذف");
		} finally {
			setIsDeleting(false);
			setItemToDelete(null);
		}
	};

	const handleUpload = async () => {
		if (
			activeTab === "add" &&
			uploadFiles.length === 0 &&
			(!manualTitle || !manualContent)
		) {
			return toast.error("يرجى اختيار ملفات أو إدخال نص يدوي");
		}

		setIsUploading(true);
		setUploadProgress(0);

		let contentSuccess = false;
		let failCount = 0;
		let successCount = 0;

		// 1. Process Manual Text if present
		if (manualTitle && manualContent) {
			const formData = new FormData();
			formData.append("title", manualTitle);
			formData.append("content", manualContent);
			formData.append("jurisdiction", jurisdiction);
			formData.append("categoryId", categoryId);
			formData.append("docType", docType);
			formData.append("industry", industry);
			if (tags.length > 0) {
				formData.append("tags", JSON.stringify(tags));
			}

			try {
				setUploadProgress(20);
				const res = await fetch("/api/admin/kb/upload", {
					method: "POST",
					body: formData,
				});
				if (res.ok) {
					contentSuccess = true;
					setManualTitle("");
					setManualContent("");
				} else {
					const data = await res.json();
					toast.error(data.error || "فشل حفظ النص اليدوي");
					failCount++;
				}
			} catch (err) {
				toast.error("حدث خطأ أثناء الحفظ اليدوي");
				failCount++;
			}
		}

		// 2. Process Files if present
		if (uploadFiles.length > 0) {
			for (let i = 0; i < uploadFiles.length; i++) {
				const file = uploadFiles[i];
				setFileStatuses((prev) => ({ ...prev, [file.name]: "uploading" }));

				const formData = new FormData();
				formData.append("file", file);
				formData.append("jurisdiction", jurisdiction);
				formData.append("categoryId", categoryId);
				formData.append("docType", docType);
				formData.append("industry", industry);
				if (tags.length > 0) {
					formData.append("tags", JSON.stringify(tags));
				}

				try {
					const res = await fetch("/api/admin/kb/upload", {
						method: "POST",
						body: formData,
					});
					if (res.ok) {
						successCount++;
						setFileStatuses((prev) => ({ ...prev, [file.name]: "success" }));
					} else {
						failCount++;
						setFileStatuses((prev) => ({ ...prev, [file.name]: "error" }));
					}
				} catch (err) {
					failCount++;
					setFileStatuses((prev) => ({ ...prev, [file.name]: "error" }));
				}

				setUploadProgress(20 + Math.round(((i + 1) / uploadFiles.length) * 80));
			}
		}

		// 3. Finalize and report
		if (contentSuccess || successCount > 0) {
			const msg = [];
			if (contentSuccess) msg.push("النص اليدوي");
			if (successCount > 0) msg.push(`${successCount} مستندات`);
			toast.success(`تم حفظ ${msg.join(" و ")} بنجاح`);
			loadDocs();
		}

		if (failCount > 0 && uploadFiles.length > 0) {
			toast.error("فشل معالجة بعض المستندات. المرجو مراجعة القائمة.");
		} else if (failCount === 0 && uploadFiles.length > 0) {
			setUploadFiles([]);
			setFileStatuses({});
			setActiveTab("library");
		} else if (failCount === 0 && contentSuccess) {
			setActiveTab("library");
		}

		setIsUploading(false);
		setUploadProgress(0);
	};

	const handleFormatAI = async () => {
		if (!manualContent || manualContent.length < 50)
			return toast.error("النص قصير جداً للتنسيق");

		setIsFormatting(true);
		const toastId = toast.loading("جاري إعادة تنسيق النص بالذكاء الاصطناعي...");

		try {
			const res = await fetch("/api/legal/format-text", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text: manualContent }),
			});

			if (res.ok) {
				const data = await res.json();
				setManualContent(data.text);
				toast.success("تم تنسيق النص بنجاح", { id: toastId });
			} else {
				toast.error("فشل التنسيق التلقائي", { id: toastId });
			}
		} catch (err) {
			toast.error("حدث خطأ أثناء الاتصال بالخادم", { id: toastId });
		} finally {
			setIsFormatting(false);
		}
	};

	const handleScrape = async () => {
		if (!scrapeUrl || !manualTitle) {
			return toast.error("يرجى إدخال الرابط والعنوان");
		}

		try {
			new URL(scrapeUrl);
		} catch (e) {
			return toast.error("الرابط المدخل غير صالح");
		}

		setIsScraping(true);
		const toastId = toast.loading("جاري سحب القوانين وتحليلها...");

		try {
			const res = await fetch("/api/admin/scrape", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					url: scrapeUrl,
					title: manualTitle,
					jurisdiction,
					categoryId,
					docType,
					industry,
				}),
			});

			const data = await res.json();

			if (res.ok) {
				toast.success(data.message || "تم السحب والتحليل بنجاح", {
					id: toastId,
				});
				setScrapeUrl("");
				setManualTitle("");
				setActiveTab("library");
				loadDocs();
			} else {
				toast.error(data.error || "فشل عملية السحب", { id: toastId });
			}
		} catch (error) {
			toast.error("حدث خطأ غير متوقع أثناء السحب", { id: toastId });
		} finally {
			setIsScraping(false);
		}
	};

	return (
		<div className="space-y-6 animate-in fade-in duration-700 rtl" dir="rtl">
			<div className="space-y-0.5">
				<h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
					<Database className="h-7 w-7 text-indigo-600" />
					مستودع المعرفة (Knowledge Base)
				</h1>
				<p className="text-[13px] text-slate-500 font-medium">
					إدارة المستندات القانونية، رفع الملفات، وتتبع المتجهات الذكية.
				</p>
			</div>

			{/* TABS */}
			<div className="flex bg-slate-100/50 backdrop-blur-sm p-1 rounded-2xl w-fit border border-slate-200/50 shadow-sm">
				<button
					onClick={() => setActiveTab("library")}
					className={cn(
						"px-5 py-1.5 rounded-xl text-[13px] font-bold transition-all",
						activeTab === "library"
							? "bg-white text-indigo-600 shadow-sm"
							: "text-slate-500 hover:text-slate-700",
					)}
				>
					مكتبة المستندات
				</button>
				<button
					onClick={() => setActiveTab("add")}
					className={cn(
						"px-5 py-1.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2",
						activeTab === "add"
							? "bg-white text-indigo-600 shadow-sm"
							: "text-slate-500 hover:text-slate-700",
					)}
				>
					<Upload className="w-3.5 h-3.5" />
					إضافة محتوى
				</button>
				<button
					onClick={() => setActiveTab("scraper")}
					className={cn(
						"px-5 py-1.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2",
						activeTab === "scraper"
							? "bg-white text-indigo-600 shadow-sm"
							: "text-slate-500 hover:text-slate-700",
					)}
				>
					<Search className="w-3.5 h-3.5" />
					سحب من ويب
				</button>
				<button
					onClick={() => setActiveTab("system")}
					className={cn(
						"px-5 py-1.5 rounded-xl text-[13px] font-bold transition-all",
						activeTab === "system"
							? "bg-white text-indigo-600 shadow-sm"
							: "text-slate-500 hover:text-slate-700",
					)}
				>
					مزامنة النظام
				</button>
				<button
					onClick={() => setActiveTab("tester")}
					className={cn(
						"px-5 py-1.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-2",
						activeTab === "tester"
							? "bg-indigo-600 text-white shadow-md"
							: "text-slate-500 hover:text-slate-700",
					)}
				>
					<MessageSquare className="w-3.5 h-3.5" />
					اختبار المحادثة
				</button>
			</div>

			{/* ADD CONTENT TAB (Unified Upload & Text) */}
			{activeTab === "add" && (
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="lg:col-span-2 space-y-6">
						{/* FILE UPLOAD SECTION */}
						<Card className="rounded-[2rem] border-slate-200/50 bg-white/70 backdrop-blur-md shadow-sm border-dashed">
							<CardContent className="p-8">
								<div className="flex flex-col items-center justify-center text-center space-y-4">
									<div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
										<Upload className="w-8 h-8" />
									</div>
									<div>
										<h3 className="text-xl font-black text-slate-900">
											سحب وإفلات الملفات (Batch Upload)
										</h3>
										<p className="text-[13px] text-slate-500 font-medium mt-1">
											يدعم PDF, Word, PPTX, Excel, والصور. تقنية OCR مدمجة.
										</p>
									</div>
									<input
										type="file"
										id="file-upload"
										className="hidden"
										multiple
										accept=".md,.pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.png,.jpg,.jpeg"
										onChange={(e) => {
											if (e.target.files) {
												const newFiles = Array.from(e.target.files);
												setUploadFiles((prev) => [...prev, ...newFiles]);

												const newStatuses: Record<string, "pending"> = {};
												for (const f of newFiles) {
													newStatuses[f.name] = "pending";
												}
												setFileStatuses((prev) => ({
													...prev,
													...newStatuses,
												}));

												if (newFiles.length === 1 && !manualTitle) {
													const baseName = newFiles[0].name
														.replace(/\.[^/.]+$/, "")
														.replace(/[_-]/g, " ");
													setManualTitle(baseName);
												}
											}
										}}
									/>
									<label
										htmlFor="file-upload"
										className="bg-white border border-slate-200 px-6 py-2.5 rounded-xl font-bold text-sm cursor-pointer hover:bg-slate-50 transition-colors shadow-sm"
									>
										اختيار ملفات
									</label>

									{uploadFiles.length > 0 && (
										<div className="w-full space-y-3 mt-4 text-right">
											{uploadFiles.map((file, idx) => {
												const status = fileStatuses[file.name] || "pending";
												return (
													<div
														key={`${file.name}-${idx}`}
														className={cn(
															"w-full bg-slate-50 p-3 rounded-xl border flex items-center justify-between transition-all",
															status === "success"
																? "border-emerald-100 bg-emerald-50/50"
																: status === "error"
																	? "border-red-100 bg-red-50/50"
																	: "border-slate-100",
														)}
													>
														<div className="flex items-center gap-3">
															<div
																className={cn(
																	"w-8 h-8 rounded-lg flex items-center justify-center",
																	status === "success"
																		? "bg-emerald-100 text-emerald-600"
																		: status === "error"
																			? "bg-red-100 text-red-600"
																			: "bg-indigo-100 text-indigo-600",
																)}
															>
																{status === "uploading" ? (
																	<Loader2 className="w-4 h-4 animate-spin" />
																) : status === "success" ? (
																	<CheckCircle2 className="w-4 h-4" />
																) : status === "error" ? (
																	<AlertCircle className="w-4 h-4" />
																) : (
																	<FileText className="w-4 h-4" />
																)}
															</div>
															<div>
																<p className="text-xs font-bold text-slate-700 line-clamp-1">
																	{file.name}
																</p>
																<p className="text-[10px] text-slate-400 font-medium">
																	{(file.size / 1024).toFixed(1)} KB
																</p>
															</div>
														</div>
														{!isUploading && status === "pending" && (
															<Button
																variant="ghost"
																size="icon"
																className="text-slate-400 hover:text-red-400 h-8 w-8"
																onClick={() => {
																	setUploadFiles((prev) =>
																		prev.filter((_, i) => i !== idx),
																	);
																	const newStatuses = { ...fileStatuses };
																	delete newStatuses[file.name];
																	setFileStatuses(newStatuses);
																}}
															>
																<Trash2 className="w-4 h-4" />
															</Button>
														)}
													</div>
												);
											})}
											{!isUploading && (
												<button
													onClick={() => {
														setUploadFiles([]);
														setFileStatuses({});
													}}
													className="text-xs font-bold text-red-500 hover:underline py-2"
												>
													مسح الملفات
												</button>
											)}
										</div>
									)}
								</div>
							</CardContent>
						</Card>

						{/* MANUAL TEXT SECTION */}
						<Card className="rounded-[2rem] border-slate-200/50 bg-white/70 backdrop-blur-md shadow-sm">
							<CardHeader>
								<CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
									<FileText className="w-5 h-5 text-indigo-600" />
									إضافة نص قانوني (لصق ذكي)
								</CardTitle>
								<CardDescription className="text-slate-500">
									أدخل محتوى المستند. سيتم تحويل النصوص المنسوخة من المواقع أو
									الوورد تلقائياً لـ Markdown.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-6">
								<div className="space-y-2">
									<div className="flex items-center justify-between mb-2">
										<label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
											محتوى النص (Markdown Content)
										</label>
										<Button
											variant="outline"
											size="xs"
											onClick={handleFormatAI}
											disabled={isFormatting || !manualContent}
											className="h-8 rounded-xl gap-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition-all font-bold group"
										>
											{isFormatting ? (
												<Loader2 className="w-3.5 h-3.5 animate-spin" />
											) : (
												<RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
											)}
											تنسيق ذكي (AI)
										</Button>
									</div>
									<textarea
										className="w-full h-[250px] bg-slate-50 rounded-2xl border border-slate-200 p-6 text-sm focus:ring-2 focus:ring-indigo-100 outline-none font-sans leading-relaxed resize-none"
										placeholder="ألصق النص القانوني هنا..."
										value={manualContent}
										onChange={(e) => setManualContent(e.target.value)}
										onPaste={(e) => {
											const html = e.clipboardData.getData("text/html");
											if (html) {
												e.preventDefault();
												try {
													const turndownService = new TurndownService({
														headingStyle: "atx",
													});
													const markdown = turndownService.turndown(html);

													// Insert at cursor
													const target = e.target as HTMLTextAreaElement;
													const start = target.selectionStart;
													const end = target.selectionEnd;
													const newText =
														manualContent.substring(0, start) +
														markdown +
														manualContent.substring(end);
													setManualContent(newText);

													toast.success(
														"تم تحويل النص المنسوخ إلى Markdown ذكياً",
													);
												} catch (err) {
													// Fallback if conversion fails
													const plain = e.clipboardData.getData("text/plain");
													const target = e.target as HTMLTextAreaElement;
													const start = target.selectionStart;
													const end = target.selectionEnd;
													setManualContent(
														manualContent.substring(0, start) +
															plain +
															manualContent.substring(end),
													);
												}
											}
										}}
									/>
								</div>
							</CardContent>
						</Card>

						{isUploading && (
							<div className="bg-indigo-600 rounded-3xl p-8 text-white space-y-4">
								<div className="flex items-center justify-between">
									<p className="font-bold">
										جاري المعالجة (Embedding & Chunking)...
									</p>
									<p className="font-black text-xl">{uploadProgress}%</p>
								</div>
								<div className="w-full bg-indigo-400/30 h-2 rounded-full overflow-hidden">
									<div
										className="bg-white h-full transition-all duration-500"
										style={{ width: `${uploadProgress}%` }}
									/>
								</div>
								<div className="space-y-2">
									<label className="text-xs font-bold text-white/70 uppercase">
										الوسوم التلقائية (Auto-mapped Tags)
									</label>
									<div className="flex flex-wrap gap-2">
										{tags.length > 0 ? (
											tags.map((tag, i) => (
												<Badge
													key={i}
													className="bg-indigo-800 text-white hover:bg-indigo-900 border-0 px-3 py-1"
												>
													{getLocalizedCategory(tag)}
												</Badge>
											))
										) : (
											<span className="text-[10px] text-white/50 font-bold italic">
												سيتم تحديد الوسوم آلياً عند اختيار التصنيف
											</span>
										)}
									</div>
								</div>
							</div>
						)}
					</div>

					<div className="space-y-6">
						<Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden h-fit">
							<CardHeader className="bg-slate-50/50 border-b">
								<CardTitle className="text-sm font-bold">
									إعدادات الحفظ
								</CardTitle>
							</CardHeader>
							<CardContent className="p-6 space-y-6">
								<div className="space-y-2">
									<label htmlFor="admin-doc-title" className="text-xs font-bold text-slate-500 uppercase">
										عنوان المستند (Title)
									</label>
									<Input
										id="admin-doc-title"
										placeholder="أدخل عنواناً للمستند..."
										value={manualTitle}
										onChange={(e) => setManualTitle(e.target.value)}
										className="rounded-xl border-slate-200 text-sm font-bold h-10"
									/>
								</div>
								<div className="space-y-2">
									<label htmlFor="admin-jurisdiction" className="text-xs font-bold text-slate-500 uppercase">
										الدولة (Jurisdiction)
									</label>
									<select
										id="admin-jurisdiction"
										className="w-full bg-slate-50 rounded-xl border border-slate-200 p-3 text-sm focus:ring-0 outline-none"
										value={jurisdiction}
										onChange={(e) => setJurisdiction(e.target.value)}
									>
										{jurisdictions.map((j) => (
											<option key={j.id} value={j.id}>
												{j.nameAr} ({j.code})
											</option>
										))}
										{jurisdictions.length === 0 && (
											<option value="kuwait">الكويت (Kuwait)</option>
										)}
									</select>
								</div>
								<div className="space-y-2">
									<label className="text-xs font-bold text-slate-500 uppercase">
										التصنيف (Category)
									</label>
									<select
										className="w-full bg-slate-50 rounded-xl border border-slate-200 p-3 text-sm focus:ring-0 outline-none"
										value={categoryId}
										onChange={(e) => setCategoryId(e.target.value)}
									>
										<option value="">عام (General)</option>
										{categories
											.filter(
												(c) =>
													!SYSTEM_TAGS.includes(c.id.toUpperCase()) &&
													!SYSTEM_TAGS.includes(c.slug.toUpperCase()),
											)
											.map((c) => (
												<option key={c.id} value={c.id}>
													{getLocalizedCategory(c.id)}
												</option>
											))}
									</select>
								</div>
								<div className="space-y-2">
									<label className="text-xs font-bold text-slate-500 uppercase">
										النوع (Doc Type)
									</label>
									<select
										className="w-full bg-slate-50 rounded-xl border border-slate-200 p-3 text-sm focus:ring-0 outline-none font-bold"
										value={docType}
										onChange={(e) => setDocType(e.target.value)}
									>
										<option value="court_judgment">سابقة / حكم قضائي</option>
										<option value="firm_precedent">سابقة مكتب</option>
										<option value="legal_template">نموذج قانوني</option>
										<option value="research_paper">بحث قانوني</option>
										<option value="internal_memo">مذكرة داخلية</option>
										<option value="law">قانون</option>
										<option value="legal_principle">مبدأ قانوني</option>
										<option value="administrative_decision">قرار إداري</option>
									</select>
								</div>
								<div className="space-y-2">
									<label className="text-xs font-bold text-slate-500 uppercase">
										المنتج / الصناعة (Industry)
									</label>
									<select
										className="w-full bg-slate-50 rounded-xl border border-slate-200 p-3 text-sm focus:ring-0 outline-none font-bold"
										value={industry}
										onChange={(e) => setIndustry(e.target.value)}
									>
										<option value="LEGAL">Legal OS (قانوني)</option>
										<option value="MEDICAL">Medical OS (طبي)</option>
										<option value="VOICE">Voice OS (صوتي)</option>
									</select>
								</div>
								<Button
									disabled={
										isUploading ||
										!manualTitle ||
										(!manualContent && uploadFiles.length === 0)
									}
									onClick={handleUpload}
									className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 rounded-2xl font-black gap-3"
								>
									{isUploading ? (
										<Loader2 className="w-5 h-5 animate-spin" />
									) : (
										<CheckCircle2 className="w-5 h-5" />
									)}
									حفظ ومعالجة النص
								</Button>
							</CardContent>
						</Card>

						<div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6 flex gap-4">
							<Info className="w-6 h-6 text-indigo-500 shrink-0" />
							<p className="text-[10px] font-bold text-indigo-800 leading-relaxed">
								سيتم معالجة النص يدوياً وتحويله إلى متجهات (Vectors) للبحث الذكي.
								تأكد من مراجعة النص قبل الحفظ.
							</p>
						</div>
					</div>
				</div>
			)}

			{/* SCRAPER TAB */}
			{activeTab === "scraper" && (
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-left-4">
					<div className="lg:col-span-2">
						<Card className="rounded-[3rem] border-slate-200/50 bg-white p-12 text-center space-y-8 shadow-xl shadow-slate-100">
							<div className="w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-indigo-50 group-hover:scale-110 transition-transform duration-500">
								<Search className="w-10 h-10 text-indigo-600" />
							</div>
							<div className="space-y-4">
								<h3 className="text-2xl font-black text-slate-900">
									سحب القوانين من المواقع الرسمية
								</h3>
								<p className="text-slate-500 max-w-sm mx-auto font-medium leading-relaxed">
									أدخل رابط الموقع الرسمي (مثلاً من وزارة العدل) ليقوم النظام
									بسحب النصوص، تحويلها إلى Markdown، وتقسيمها إلى مواد قانونية
									آلياً.
								</p>
							</div>

							<div className="max-w-xl mx-auto space-y-6">
								<div className="space-y-2 text-right">
									<label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mr-2">
										رابط الموقع المستهدف (URL)
									</label>
									<Input
										placeholder="https://example.com/law-article-123"
										className="rounded-2xl h-14 border-slate-200 bg-slate-50/50 px-6 text-sm font-bold focus:ring-4 focus:ring-indigo-50 transition-all ltr"
										dir="ltr"
										value={scrapeUrl}
										onChange={(e) => setScrapeUrl(e.target.value)}
									/>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
									<div className="space-y-2 text-right">
										<label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mr-2">
											عنوان الكتاب/القانون
										</label>
										<Input
											placeholder="مثلاً: قانون التجارة الكويتي"
											className="rounded-xl h-12 border-slate-200 bg-white px-4 text-sm font-bold focus:ring-4 focus:ring-indigo-50 transition-all"
											value={manualTitle}
											onChange={(e) => setManualTitle(e.target.value)}
										/>
									</div>
									<div className="space-y-2 text-right">
										<label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mr-2">
											النوع (Doc Type)
										</label>
										<select
											className="w-full h-12 bg-white rounded-xl border border-slate-200 px-4 text-sm font-bold focus:ring-4 focus:ring-indigo-50 transition-all outline-none"
											value={docType}
											onChange={(e) => setDocType(e.target.value)}
										>
											<option value="court_judgment">سابقة / حكم قضائي</option>
											<option value="firm_precedent">سابقة مكتب</option>
											<option value="legal_template">نموذج قانوني</option>
											<option value="research_paper">بحث قانوني</option>
											<option value="internal_memo">مذكرة داخلية</option>
											<option value="law">قانون</option>
											<option value="legal_principle">مبدأ قانوني</option>
											<option value="administrative_decision">
												قرار إداري
											</option>
										</select>
									</div>
									<div className="space-y-2 text-right">
										<label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mr-2">
											المنتج (Industry)
										</label>
										<select
											className="w-full h-12 bg-white rounded-xl border border-slate-200 px-4 text-sm font-bold focus:ring-4 focus:ring-indigo-50 transition-all outline-none"
											value={industry}
											onChange={(e) => setIndustry(e.target.value)}
										>
											<option value="LEGAL">Legal OS (قانوني)</option>
											<option value="MEDICAL">Medical OS (طبي)</option>
										</select>
									</div>
								</div>
							</div>

							<div className="pt-4 flex flex-col items-center gap-4">
								<Button
									onClick={handleScrape}
									disabled={isScraping || !scrapeUrl || !manualTitle}
									className="bg-indigo-600 text-white px-12 py-7 rounded-[2rem] font-black text-lg hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
								>
									{isScraping ? (
										<Loader2 className="w-6 h-6 animate-spin" />
									) : (
										"ابدأ عملية السحب والتحليل"
									)}
								</Button>
								<p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
									<Zap className="w-3 h-3 text-amber-500" /> سنقوم بتقسيم النص
									آلياً حسب المواد (مادة 1، مادة 2...)
								</p>
							</div>
						</Card>

						{isScraping && (
							<div className="mt-8 bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-100 animate-in fade-in zoom-in-95">
								<div className="flex items-center gap-4 mb-4">
									<div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
										<Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
									</div>
									<div className="text-right">
										<p className="font-black text-slate-900 tracking-tight">
											جاري التواصل مع الموقع وتحويل البيانات...
										</p>
										<p className="text-xs text-slate-500 font-bold">
											قد تستغرق هذه العملية ما يصل إلى دقيقة بناءً على حجم
											الموقع.
										</p>
									</div>
								</div>
							</div>
						)}
					</div>

					<div className="space-y-6">
						<Card className="rounded-[2.5rem] bg-indigo-600 text-white border-0 shadow-2xl shadow-indigo-200 overflow-hidden relative p-8">
							<div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
							<CardTitle className="text-xl font-black mb-6 flex items-center gap-3 relative">
								<Terminal className="w-6 h-6 text-indigo-200" /> إعدادات استهداف
								البيئة
							</CardTitle>

							<div className="space-y-6 relative">
								<div className="space-y-3 mr-2">
									<label className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">
										الدولة المستهدفة
									</label>
									<select
										className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-sm font-bold backdrop-blur-md focus:ring-0 outline-none"
										value={jurisdiction}
										onChange={(e) => setJurisdiction(e.target.value)}
									>
										{jurisdictions.map((j) => (
											<option
												key={j.id}
												value={j.id}
												className="text-slate-900"
											>
												{j.nameAr} ({j.code})
											</option>
										))}
										{jurisdictions.length === 0 && (
											<option value="kuwait" className="text-slate-900">
												الكويت (Kuwait)
											</option>
										)}
									</select>
								</div>

								<div className="space-y-3 mr-2">
									<label className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">
										تصنيف المكتبة
									</label>
									<select
										className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-sm font-bold backdrop-blur-md focus:ring-0 outline-none"
										value={categoryId}
										onChange={(e) => setCategoryId(e.target.value)}
									>
										<option value="" className="text-slate-900">
											عام (General)
										</option>
										{categories
											.filter(
												(c) =>
													!SYSTEM_TAGS.includes(c.id.toUpperCase()) &&
													!SYSTEM_TAGS.includes(c.slug.toUpperCase()),
											)
											.map((c) => (
												<option
													key={c.id}
													value={c.id}
													className="text-slate-900"
												>
													{getLocalizedCategory(c.id)}
												</option>
											))}
									</select>
								</div>

								<div className="pt-4 border-t border-white/10">
									<div className="flex items-center gap-3 bg-white/10 p-4 rounded-2xl">
										<Layers className="w-5 h-5 text-indigo-200" />
										<div className="text-right">
											<p className="text-[11px] font-bold">
												استراتيجية التقسيم (Chunking)
											</p>
											<p className="text-[9px] text-indigo-200 font-medium">
												Auto-Detection by Article Keywords
											</p>
										</div>
									</div>
								</div>
							</div>
						</Card>

						<div className="p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] space-y-4">
							<h4 className="font-black text-slate-800 text-sm">
								نصيحة الاستخدام:
							</h4>
							<p className="text-[11px] text-slate-500 leading-relaxed font-bold">
								لتحقيق أفضل النتائج، اختر الروابط التي تحتوي على نص القانون
								مباشرة. نظامنا سيتجاهل القوائم الجانبية والإعلانات ويركز فقط على
								المحتوى القانوني الصرف.
							</p>
						</div>
					</div>
				</div>
			)}

			{/* LIBRARY TAB */}
			{activeTab === "library" && (
				<Card className="rounded-[2rem] border-slate-200/50 bg-white/70 backdrop-blur-md shadow-sm overflow-hidden">
					<CardHeader className="border-b border-slate-100 bg-slate-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4 py-4">
						<div className="relative w-full md:w-80">
							<Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
							<Input
								placeholder="بحث في العناوين..."
								className="rounded-xl pr-9 h-9 border-slate-200 bg-white text-sm"
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
							/>
						</div>
						<Button
							onClick={loadDocs}
							disabled={isLoadingDocs}
							variant="outline"
							className="rounded-xl gap-2 h-10 w-full md:w-fit"
						>
							<RefreshCw
								className={cn("w-4 h-4", isLoadingDocs && "animate-spin")}
							/>
							تحديث
						</Button>
					</CardHeader>
					<CardContent className="p-0 overflow-x-auto">
						<table className="w-full text-right border-collapse">
							<thead>
								<tr className="bg-slate-50/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
									<th className="px-6 py-4 border-b">العنوان</th>
									<th className="px-6 py-4 border-b">النوع</th>
									<th className="px-6 py-4 border-b">المنتج</th>
									<th className="px-6 py-4 border-b">الاختصاص</th>
									<th className="px-6 py-4 border-b">المقاطع</th>
									<th className="px-6 py-4 border-b text-center">الإجراءات</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{docs
									.filter(
										(d) =>
											d.title
												.toLowerCase()
												.includes(searchTerm.toLowerCase()) ||
											d.docType
												.toLowerCase()
												.includes(searchTerm.toLowerCase()) ||
											d.jurisdiction
												.toLowerCase()
												.includes(searchTerm.toLowerCase()) ||
											(d.industry || "")
												.toLowerCase()
												.includes(searchTerm.toLowerCase()),
									)
									.map((doc) => (
										<tr
											key={doc.id}
											className="hover:bg-slate-50/50 transition-colors group"
										>
											<td className="px-6 py-4">
												<div className="flex items-center gap-3">
													<div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
														<FileText className="w-5 h-5" />
													</div>
													<div>
														<p className="font-bold text-slate-900 line-clamp-1">
															{doc.title}
														</p>
														<p className="text-[9px] text-slate-400 uppercase">
															{new Date(doc.createdAt).toLocaleDateString(
																"ar-EG",
															)}
														</p>
													</div>
												</div>
											</td>
											<td className="px-6 py-3">
												<Badge
													variant="secondary"
													className={cn(
														"rounded-md font-bold text-[9px] uppercase",
														doc.docType === "procedure"
															? "bg-rose-100 text-rose-700"
															: "bg-slate-100 text-slate-700",
													)}
												>
													{getLocalizedDocType(doc.docType)}
												</Badge>
											</td>
											<td className="px-6 py-3">
												<Badge
													variant="outline"
													className={cn(
														"rounded-md font-bold text-[9px] uppercase",
														doc.industry === "MEDICAL"
															? "border-emerald-200 text-emerald-600"
															: doc.industry === "VOICE"
																? "border-amber-200 text-amber-600"
																: "border-indigo-200 text-indigo-600",
													)}
												>
													{doc.industry || "LEGAL"}
												</Badge>
											</td>
											<td className="px-6 py-3">
												<span className="text-xs font-medium text-slate-600">
													{doc.jurisdiction}
												</span>
											</td>
											<td className="px-6 py-3">
												<div className="flex items-center gap-2">
													<Layers className="w-3 h-3 text-emerald-500" />
													<span className="text-xs font-black text-emerald-600">
														{doc.chunksCount}
													</span>
												</div>
											</td>
											<td className="px-6 py-3 text-center">
												<Button
													onClick={() => handleDelete(doc.id)}
													variant="ghost"
													size="icon"
													className="text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
												>
													<Trash2 className="w-4 h-4" />
												</Button>
											</td>
										</tr>
									))}
								{!isLoadingDocs &&
									docs.length > 0 &&
									docs.filter(
										(d) =>
											d.title
												.toLowerCase()
												.includes(searchTerm.toLowerCase()) ||
											d.docType
												.toLowerCase()
												.includes(searchTerm.toLowerCase()) ||
											d.jurisdiction
												.toLowerCase()
												.includes(searchTerm.toLowerCase()),
									).length === 0 && (
										<tr>
											<td
												colSpan={6}
												className="p-20 text-center text-slate-400 font-medium"
											>
												لا توجد نتائج تطابق بحثك.
											</td>
										</tr>
									)}
							</tbody>
						</table>
					</CardContent>
				</Card>
			)}

			{/* CHAT TESTER TAB */}
			{activeTab === "tester" && (
				<div className="h-[calc(100vh-280px)] min-h-[600px]">
					<KnowledgeBaseTester />
				</div>
			)}

			{/* SYSTEM SYNC (BULK INGEST) */}
			{activeTab === "system" && (
				<Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden">
					<CardHeader className="border-b bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
						<div>
							<CardTitle className="text-lg font-bold flex items-center gap-2">
								<Terminal className="w-5 h-5 text-indigo-600" />
								مزامنة الملفات من السيرفر (Bulk Ingest)
							</CardTitle>
							<CardDescription>
								معالجة جميع الملفات المتواجدة داخل مجلد
								.agent/docs/Kuwait_Legal_KB
							</CardDescription>
						</div>
						<Button
							onClick={async () => {
								setIsIngesting(true);
								try {
									const res = await fetch("/api/admin/kb/ingest", {
										method: "POST",
									});
									const data = await res.json();
									setIngestLog(data);
									if (res.ok) toast.success("تم الانتهاء بنجاح");
									else toast.error("حدث خطأ");
								} catch (err) {
									toast.error(`خطأ: ${err instanceof Error ? err.message : "Unknown error"}`);
								}
								setIsIngesting(false);
							}}
							disabled={isIngesting}
							className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 rounded-xl"
						>
							{isIngesting ? (
								<Clock className="w-5 h-5 animate-spin" />
							) : (
								<RefreshCw className="w-5 h-5" />
							)}
							{isIngesting ? "جاري المعالجة..." : "بدء المزامنة الشاملة"}
						</Button>
					</CardHeader>
					<CardContent className="p-6">
						{!ingestLog && !isIngesting && (
							<div className="py-20 text-center space-y-4">
								<div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
									<Terminal className="text-slate-400" />
								</div>
								<p className="text-slate-500 font-medium max-w-sm mx-auto text-sm">
									استخدم هذه الخاصية في حال إضافة ملفات يدوياً إلى مجلدات السيرفر
									المخصصة للمعرفة القانونية.
								</p>
							</div>
						)}

						{isIngesting && (
							<div className="py-20 flex flex-col items-center justify-center text-indigo-600 gap-4">
								<Clock className="w-16 h-16 animate-spin" />
								<p className="font-bold text-lg">
									جاري التقطيع وإنشاء الـ Embeddings...
								</p>
								<p className="text-sm text-slate-400 italic">
									هذا قد يستغرق بضع دقائق اعتماداً على حجم البيانات
								</p>
							</div>
						)}

						{ingestLog && (
							<div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
								<div
									className={cn(
										"p-6 rounded-2xl flex items-center justify-between",
										ingestLog.error
											? "bg-red-50 text-red-800"
											: "bg-emerald-50 text-emerald-800",
									)}
								>
									<div className="flex items-center gap-3">
										{ingestLog.error ? <AlertCircle /> : <CheckCircle2 />}
										<p className="font-black">
											{ingestLog.message || ingestLog.error}
										</p>
									</div>
									<time className="text-xs font-mono">
										{new Date().toLocaleTimeString()}
									</time>
								</div>

								{ingestLog.summary && (
									<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
										<div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
											<p className="text-3xl font-black text-slate-900">
												{ingestLog.summary.total}
											</p>
											<p className="text-xs text-slate-500 font-bold uppercase mt-1">
												الملفات
											</p>
										</div>
										<div className="bg-emerald-50/30 p-6 rounded-2xl border border-emerald-100">
											<p className="text-3xl font-black text-emerald-600">
												{ingestLog.summary.success}
											</p>
											<p className="text-xs text-emerald-500 font-bold uppercase mt-1">
												ناجح
											</p>
										</div>
										<div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100">
											<p className="text-3xl font-black text-indigo-600">
												{ingestLog.summary.totalChunks}
											</p>
											<p className="text-xs text-indigo-500 font-bold uppercase mt-1">
												المقاطع (Vectors)
											</p>
										</div>
										<div className="bg-slate-900 p-6 rounded-2xl text-white">
											<p className="text-3xl font-black">
												{(ingestLog.summary.durationMs / 1000).toFixed(1)}s
											</p>
											<p className="text-xs text-slate-400 font-bold uppercase mt-1">
												الوقت
											</p>
										</div>
									</div>
								)}
							</div>
						)}
					</CardContent>
				</Card>
			)}
			<ConfirmModal
				isOpen={showConfirm}
				onClose={() => {
					setShowConfirm(false);
					setItemToDelete(null);
				}}
				onConfirm={confirmDelete}
				title="تأكيد الحذف"
				description="هل أنت متأكد من حذف هذا المستند؟ سيتم حذف جميع المقاطع المرتبطة به من قاعدة بيانات المتجهات أيضاً."
				confirmText="حذف المستند"
				cancelText="تراجع"
				variant="destructive"
				isLoading={isDeleting}
			/>
		</div>
	);
}
