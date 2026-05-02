"use client";

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
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
	AlertTriangle,
	BadgeInfo,
	Database,
	FileText,
	Info,
	Loader2,
	RefreshCw,
	Search,
	ShieldCheck,
	Sparkles,
	Trash2,
	Upload,
	Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface DocRecord {
	id: number;
	title: string;
	docType: string;
	categoryId?: string;
	status: string;
	createdAt: string;
}

interface Stats {
	totalDocs: number;
	totalLimit: number;
	dailyUploads: number;
	dailyLimit: number;
	freeRemaining: number;
}

export function OrganizationKBManager() {
	const [activeTab, setActiveTab] = useState<"library" | "upload">("library");

	// Library State
	const [docs, setDocs] = useState<DocRecord[]>([]);
	const [stats, setStats] = useState<Stats | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");

	// Upload State
	const [isUploading, setIsUploading] = useState(false);
	const [uploadFiles, setUploadFiles] = useState<File[]>([]);
	const [uploadProgress, setUploadProgress] = useState(0);

	// Category & DocType Selection
	const [categories, setCategories] = useState<{ id: string; slug: string; nameAr: string; legalDomain: string }[]>([]);
	const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
	const [selectedDocType, setSelectedDocType] =
		useState<string>("firm_precedent");
	const [customCategory, setCustomCategory] = useState("");
	const [customDocType, setCustomDocType] = useState("");
	const [isAddingCustomCategory, setIsAddingCustomCategory] = useState(false);
	const [isAddingCustomDocType, setIsAddingCustomDocType] = useState(false);
	const [manualTitle, setManualTitle] = useState("");
	const [tags, setTags] = useState<string[]>([]);

	// Deletion State
	const [itemToDelete, setItemToDelete] = useState<number | null>(null);
	const [showConfirm, setShowConfirm] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const fetchCategories = useCallback(async () => {
		try {
			const res = await fetch("/api/legal/categories");
			if (res.ok) {
				const data = await res.json();
				setCategories(data);
			}
		} catch (err) {}
	}, []);

	useEffect(() => {
		fetchCategories();
	}, [fetchCategories]);

	const loadData = useCallback(async () => {
		setIsLoading(true);
		try {
			const res = await fetch("/api/legal/kb/documents");
			if (res.ok) {
				const data = await res.json();
				setDocs(data.documents);
				setStats(data.stats);
			}
		} catch (err) {
			toast.error("فشل في تحميل المكتبة");
		} finally {
			setIsLoading(false);
		}
	}, []);

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

		// 1. Check mapping first
		const mapped = mapping[catId.toUpperCase()];
		if (mapped) return mapped;

		// 2. Check DB
		const cat = categories.find((c) => c.id === catId || c.slug === catId);
		if (cat?.nameAr && cat.nameAr !== cat.id) {
			const subMapped = mapping[cat.nameAr.toUpperCase()];
			if (subMapped) return subMapped;
			return cat.nameAr;
		}

		return catId;
	};

	const getLocalizedDocType = (type: string) => {
		const mapping: Record<string, string> = {
			firm_precedent: "سابقة مكتب",
			legal_template: "نموذج قانوني",
			template: "نموذج قانوني",
			research_paper: "بحث قانوني",
			court_judgment: "سابقة / حكم قضائي",
			precedent: "سابقة / حكم قضائي",
			internal_memo: "مذكرة داخلية",
			law: "قانون",
			legal_principle: "مبدأ قانوني",
			principle: "مبدأ قانوني",
			administrative_decision: "قرار إداري",
		};
		return mapping[type] || type;
	};

	useEffect(() => {
		loadData();
	}, [loadData]);

	useEffect(() => {
		if (selectedCategoryId) {
			const cat = categories.find((c) => c.id === selectedCategoryId);
			if (cat?.legalDomain) {
				setTags([cat.legalDomain]);
			}
		} else {
			setTags([]);
		}
	}, [selectedCategoryId, categories]);

	const confirmDelete = async () => {
		if (!itemToDelete) return;
		setIsDeleting(true);
		try {
			const res = await fetch(`/api/legal/kb/${itemToDelete}`, {
				method: "DELETE",
			});
			if (res.ok) {
				toast.success("تم الحذف بنجاح");
				setDocs((prev) => prev.filter((d) => d.id !== itemToDelete));
				loadData(); // Refresh stats
				setShowConfirm(false);
			} else {
				toast.error("فشل الحذف");
			}
		} catch (err) {
			toast.error("حدث خطأ أثناء الحذف");
		} finally {
			setIsDeleting(false);
			setItemToDelete(null);
		}
	};

	const handleUpload = async () => {
		if (uploadFiles.length === 0) return toast.error("يرجى اختيار ملفات");

		setIsUploading(true);
		setUploadProgress(0);

		let successCount = 0;
		let failCount = 0;

		for (let i = 0; i < uploadFiles.length; i++) {
			const file = uploadFiles[i];
			const formData = new FormData();
			formData.append("file", file);
			formData.append("jurisdiction", "kuwait");
			if (manualTitle) formData.append("title", manualTitle);

			// Handle custom vs selected category
			if (isAddingCustomCategory && customCategory) {
				formData.append("customCategory", customCategory);
			} else if (selectedCategoryId) {
				formData.append("categoryId", selectedCategoryId);
			}

			// Handle custom vs selected doc type
			if (isAddingCustomDocType && customDocType) {
				formData.append("customDocType", customDocType);
			} else {
				formData.append("docType", selectedDocType);
			}

			if (tags.length > 0) {
				formData.append("tags", JSON.stringify(tags));
			}

			try {
				const res = await fetch("/api/legal/kb/upload", {
					method: "POST",
					body: formData,
				});
				const data = await res.json();

				if (res.ok) {
					successCount++;
					if (data.status === "success") {
						toast.success(`${file.name}: ${data.message}`);
					}
				} else {
					failCount++;
					toast.error(`${file.name}: ${data.error || "فشل الرفع"}`);
				}
			} catch (err) {
				failCount++;
				toast.error(`${file.name}: حدث خطأ غير متوقع`);
			}

			setUploadProgress(Math.round(((i + 1) / uploadFiles.length) * 100));
		}

		if (successCount > 0) {
			loadData();
			if (failCount === 0) setActiveTab("library");
		}

		setIsUploading(false);
		setUploadProgress(0);
		setUploadFiles([]);
	};

	return (
		<div
			className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 rtl"
			dir="rtl"
		>
			{/* HEADER SECTION */}
			<div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
				<div className="space-y-2">
					<div className="flex items-center gap-3">
						<div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 ring-4 ring-white">
							<Database className="h-6 w-6 text-white" />
						</div>
						<h1 className="text-3xl font-black text-slate-900 tracking-tight">
							مكتبة المعرفة الخاصة بمكتبكم
						</h1>
					</div>
					<p className="text-slate-500 font-medium max-w-2xl leading-relaxed">
						حول ملفاتك، أحكامك، ونماذك الخاصة إلى "قاعدة معرفة" لذكائك
						الاصطناعي. سيتعلم Lex من هذه الملفات ليقدم لك نصائح مخصصة تعكس خبرة
						مكتبكم الداخلية.
					</p>
				</div>

				<div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50 shadow-inner w-fit">
					<button
						onClick={() => setActiveTab("library")}
						className={cn(
							"px-6 py-2 rounded-xl text-sm font-bold transition-all",
							activeTab === "library"
								? "bg-white text-indigo-600 shadow-md"
								: "text-slate-500 hover:text-slate-700",
						)}
					>
						المكتبة الحالية
					</button>
					<button
						onClick={() => setActiveTab("upload")}
						className={cn(
							"px-6 py-2 rounded-xl text-sm font-bold transition-all",
							activeTab === "upload"
								? "bg-white text-indigo-600 shadow-md"
								: "text-slate-500 hover:text-slate-700",
						)}
					>
						رفع ملفات جديدة
					</button>
				</div>
			</div>

			{/* STATS ROW */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<Card className="rounded-[2rem] border-0 bg-white shadow-xl shadow-slate-200/50 overflow-hidden relative group">
					<div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700" />
					<CardHeader className="relative">
						<CardDescription className="text-slate-500 font-bold flex items-center gap-2 uppercase tracking-tight text-[10px]">
							<Database className="w-3 h-3" /> سعة التخزين الإجمالية
						</CardDescription>
						<CardTitle className="text-3xl font-black text-slate-900 flex items-baseline gap-2">
							{stats?.totalDocs ?? "..."}{" "}
							<span className="text-slate-300 text-lg font-bold">
								/ {stats?.totalLimit ?? "100"}
							</span>
						</CardTitle>
					</CardHeader>
					<CardContent className="relative pt-0">
						<div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
							<div
								className="bg-indigo-500 h-full rounded-full transition-all duration-1000"
								style={{
									width: `${((stats?.totalDocs ?? 0) / (stats?.totalLimit ?? 100)) * 100}%`,
								}}
							/>
						</div>
						<p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">
							المساحة المستهلكة من مكتبتكم
						</p>
					</CardContent>
				</Card>

				<Card className="rounded-[2rem] border-0 bg-white shadow-xl shadow-slate-200/50 overflow-hidden relative group">
					<div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700" />
					<CardHeader className="relative">
						<CardDescription className="text-slate-500 font-bold flex items-center gap-2 uppercase tracking-tight text-[10px]">
							<Sparkles className="w-3 h-3 text-emerald-500" /> العروض المجانية
							المتبقية
						</CardDescription>
						<CardTitle className="text-3xl font-black text-emerald-600">
							{stats?.freeRemaining ?? "..."}{" "}
							<span className="text-slate-400 text-sm font-bold">مستندات</span>
						</CardTitle>
					</CardHeader>
					<CardContent className="relative pt-0">
						<p className="text-[10px] text-emerald-700/60 font-medium">
							أول 5 مستندات مجانية لتجربة الخدمة
						</p>
					</CardContent>
				</Card>

				<Card className="rounded-[2rem] border-0 bg-white shadow-xl shadow-slate-200/50 overflow-hidden relative group">
					<div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700" />
					<CardHeader className="relative">
						<CardDescription className="text-slate-500 font-bold flex items-center gap-2 uppercase tracking-tight text-[10px]">
							<Upload className="w-3 h-3 text-amber-500" /> رفع اليوم (24h)
						</CardDescription>
						<CardTitle className="text-3xl font-black text-slate-900 flex items-baseline gap-2">
							{stats?.dailyUploads ?? "..."}{" "}
							<span className="text-slate-300 text-lg font-bold">
								/ {stats?.dailyLimit ?? "10"}
							</span>
						</CardTitle>
					</CardHeader>
					<CardContent className="relative pt-0">
						<div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
							<div
								className="bg-amber-400 h-full rounded-full transition-all duration-1000"
								style={{
									width: `${((stats?.dailyUploads ?? 0) / (stats?.dailyLimit ?? 10)) * 100}%`,
								}}
							/>
						</div>
						<p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">
							الحد الأقصى للرفع اليومي
						</p>
					</CardContent>
				</Card>
			</div>

			{activeTab === "library" ? (
				<Card className="rounded-[2.5rem] border-slate-200/50 bg-white/70 backdrop-blur-md shadow-2xl shadow-slate-200 animate-in slide-in-from-right-4">
					<CardHeader className="p-8 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
						<div>
							<CardTitle className="text-xl font-bold flex items-center gap-2">
								مكتبة المستندات المنظمة
							</CardTitle>
							<CardDescription>
								هذه الملفات محمية بخصوصية مكتبكم ويراها الذكاء الاصطناعي فقط عند
								محادثتكم.
							</CardDescription>
						</div>
						<div className="relative w-full md:w-80">
							<Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
							<Input
								placeholder="بحث في أرشيف المكتب..."
								className="rounded-2xl pr-10 h-11 border-slate-200 bg-white/50 text-sm font-medium focus:ring-4 focus:ring-indigo-50 transition-all"
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
							/>
						</div>
					</CardHeader>
					<CardContent className="p-0">
						<div className="overflow-x-auto">
							<table className="w-full text-right">
								<thead>
									<tr className="bg-slate-50/50 text-slate-400 text-[11px] font-black uppercase tracking-widest border-y border-slate-100">
										<th className="px-8 py-4">اسم المستند</th>
										<th className="px-8 py-4">النوع</th>
										<th className="px-8 py-4">تاريخ الإضافة</th>
										<th className="px-8 py-4 text-center">التحكم</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100">
									{docs
										.filter((d) =>
											d.title.toLowerCase().includes(searchTerm.toLowerCase()),
										)
										.map((doc) => (
											<tr
												key={doc.id}
												className="hover:bg-slate-50/50 transition-colors group"
											>
												<td className="px-8 py-5">
													<div className="flex items-center gap-4">
														<div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
															<FileText className="w-5 h-5" />
														</div>
														<p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
															{doc.title}
														</p>
													</div>
												</td>
												<td className="px-8 py-5">
													<div className="flex flex-col gap-1">
														<Badge
															variant="outline"
															className="rounded-lg border-slate-200 text-slate-500 font-bold text-[10px] uppercase w-fit"
														>
															{getLocalizedDocType(doc.docType)}
														</Badge>
														{doc.categoryId && (
															<span className="text-[10px] text-indigo-500 font-black">
																{getLocalizedCategory(doc.categoryId)}
															</span>
														)}
													</div>
												</td>
												<td className="px-8 py-5">
													<span className="text-xs font-medium text-slate-500">
														{new Date(doc.createdAt).toLocaleDateString(
															"ar-EG",
														)}
													</span>
												</td>
												<td className="px-8 py-5 text-center">
													<Button
														onClick={() => {
															setItemToDelete(doc.id);
															setShowConfirm(true);
														}}
														variant="ghost"
														size="icon"
														className="text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
													>
														<Trash2 className="w-4 h-4" />
													</Button>
												</td>
											</tr>
										))}

									{!isLoading && docs.length === 0 && (
										<tr>
											<td colSpan={4} className="py-24 text-center">
												<div className="max-w-xs mx-auto space-y-4">
													<div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto text-slate-200">
														<Database className="w-8 h-8" />
													</div>
													<p className="text-slate-400 font-bold">
														لا توجد مستندات بعد. ابدأ بتعليم Lex أسرار مكتبكم!
													</p>
													<Button
														onClick={() => setActiveTab("upload")}
														className="rounded-xl gap-2 font-black"
													>
														<Upload className="w-4 h-4" /> رفع أول مستند
													</Button>
												</div>
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</CardContent>
				</Card>
			) : (
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-left-4">
					<div className="lg:col-span-2 space-y-6">
						<Card className="rounded-[2rem] border-slate-200/50 bg-white/70 backdrop-blur-md shadow-sm border-dashed">
							<CardContent className="p-12">
								<div className="flex flex-col items-center justify-center text-center space-y-4">
									<div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 shadow-xl shadow-indigo-100/20 group-hover:scale-110 transition-transform duration-500">
										<Upload className="w-10 h-10" />
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
										id="kb-upload"
										className="hidden"
										multiple
										accept=".md,.pdf,.docx,.doc,.txt,.pptx,.ppt,.xlsx,.xls,.png,.jpg,.jpeg"
										onChange={(e) => {
											if (e.target.files) {
												const files = Array.from(e.target.files);
												setUploadFiles(files);
												if (files.length === 1 && !manualTitle) {
													const baseName = files[0].name
														.replace(/\.[^/.]+$/, "")
														.replace(/[_-]/g, " ");
													setManualTitle(baseName);
												}
											}
										}}
									/>

									<div className="flex flex-col items-center gap-4 pt-4">
										<label
											htmlFor="kb-upload"
											className="bg-white border border-slate-200 px-6 py-2.5 rounded-xl font-bold text-sm cursor-pointer hover:bg-slate-50 transition-colors shadow-sm"
										>
											اختيار ملفات
										</label>
										<p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
											<ShieldCheck className="w-3 h-3 text-emerald-500" />{" "}
											خصوصية 100% — نصوصك مشفرة ومؤمنة
										</p>
									</div>
								</div>
							</CardContent>
						</Card>

						{uploadFiles.length > 0 && (
							<div className="w-full space-y-3 mt-4 text-right">
								{uploadFiles.map((file, idx) => (
									<div
										key={idx}
										className="w-full bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between group"
									>
										<div className="flex items-center gap-3">
											<div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
												<FileText className="w-4 h-4" />
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
										{!isUploading && (
											<Button
												variant="ghost"
												size="icon"
												className="text-slate-400 hover:text-red-400 h-8 w-8"
												onClick={() =>
													setUploadFiles((prev) =>
														prev.filter((_, i) => i !== idx),
													)
												}
											>
												<Trash2 className="w-4 h-4" />
											</Button>
										)}
									</div>
								))}
								{!isUploading && (
									<button
										onClick={() => setUploadFiles([])}
										className="text-xs font-bold text-red-500 hover:underline py-2"
									>
										مسح الملفات
									</button>
								)}
							</div>
						)}

						{isUploading && (
							<div className="bg-indigo-600 rounded-3xl p-8 text-white space-y-4">
								<div className="flex items-center justify-between">
									<p className="font-bold">جاري المعالجة والتحليل...</p>
									<p className="font-black text-xl">{uploadProgress}%</p>
								</div>
								<Progress value={uploadProgress} className="h-2 bg-white/20" />
							</div>
						)}
					</div>

					<div className="space-y-6">
						<Card className="rounded-3xl border border-slate-100 shadow-sm overflow-hidden bg-white h-fit">
							<CardHeader className="bg-slate-50/50 border-b border-slate-100">
								<CardTitle className="text-sm font-black text-slate-800 flex items-center gap-2">
									<BadgeInfo className="w-4 h-4 text-indigo-500" />
									إعدادات الحفظ
								</CardTitle>
							</CardHeader>
							<CardContent className="p-6 space-y-6">
								{/* Tags Section */}
								<div className="space-y-2">
									<label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
										الوسوم التلقائية (Auto Tags)
									</label>
									<div className="flex flex-wrap gap-2 min-h-8 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
										{tags.length > 0 ? (
											tags.map((tag, i) => (
												<Badge
													key={i}
													className="bg-indigo-600 text-white hover:bg-indigo-700 border-0"
												>
													{getLocalizedCategory(tag)}
												</Badge>
											))
										) : (
											<span className="text-[10px] text-slate-400 font-bold italic">
												سيتم تحديد الوسوم آلياً
											</span>
										)}
									</div>
								</div>

								{/* Title Input */}
								<div className="space-y-2">
									<label htmlFor="user-doc-title" className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
										عنوان المستند (Title)
									</label>
									<Input
										id="user-doc-title"
										placeholder="أدخل عنواناً للمستند..."
										value={manualTitle}
										onChange={(e) => setManualTitle(e.target.value)}
										className="rounded-xl border-slate-200 text-sm font-bold h-11 bg-slate-50/50"
									/>
								</div>

								{/* Category Selector */}
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
											التصنيف (Category)
										</label>
										<button
											type="button"
											onClick={() =>
												setIsAddingCustomCategory(!isAddingCustomCategory)
											}
											className="text-[10px] font-bold text-indigo-600 hover:underline"
										>
											{isAddingCustomCategory ? "إلغاء" : "إضافة جديد +"}
										</button>
									</div>
									{isAddingCustomCategory ? (
										<Input
											placeholder="أدخل اسم التصنيف الجديد..."
											value={customCategory}
											onChange={(e) => setCustomCategory(e.target.value)}
											className="rounded-xl border-indigo-200 bg-indigo-50/30 h-11 text-sm font-bold"
										/>
									) : (
										<select
											value={selectedCategoryId}
											onChange={(e) => setSelectedCategoryId(e.target.value)}
											className="w-full bg-slate-50/50 rounded-xl border border-slate-200 p-3 text-sm font-bold focus:ring-0 outline-none h-11"
										>
											<option value="">عام (General)</option>
											{categories
												.filter(
													(c) =>
														!SYSTEM_TAGS.includes(c.id.toUpperCase()) &&
														!SYSTEM_TAGS.includes(c.slug.toUpperCase()),
												)
												.map((cat) => (
													<option key={cat.id} value={cat.id}>
														{getLocalizedCategory(cat.id)}
													</option>
												))}
										</select>
									)}
								</div>

								{/* Doc Type Selector */}
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
											النوع (Doc Type)
										</label>
										<button
											type="button"
											onClick={() =>
												setIsAddingCustomDocType(!isAddingCustomDocType)
											}
											className="text-[10px] font-bold text-indigo-600 hover:underline"
										>
											{isAddingCustomDocType ? "إلغاء" : "إضافة جديد +"}
										</button>
									</div>
									{isAddingCustomDocType ? (
										<Input
											placeholder="مثلاً: مذكرة دفاع، عقد توريد..."
											value={customDocType}
											onChange={(e) => setCustomDocType(e.target.value)}
											className="rounded-xl border-indigo-200 bg-indigo-50/30 h-11 text-sm font-bold"
										/>
									) : (
										<select
											value={selectedDocType}
											onChange={(e) => setSelectedDocType(e.target.value)}
											className="w-full bg-slate-50/50 rounded-xl border border-slate-200 p-3 text-sm font-bold focus:ring-0 outline-none h-11"
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
									)}
								</div>

								<Button
									onClick={handleUpload}
									disabled={isUploading || uploadFiles.length === 0}
									className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-8 rounded-[2rem] font-black text-lg gap-3 shadow-xl shadow-indigo-100"
								>
									{isUploading ? (
										<Loader2 className="w-5 h-5 animate-spin" />
									) : (
										<Zap className="w-5 h-5 fill-current" />
									)}
									{isUploading ? "جاري الرفع..." : "تأكيد الرفع والمعالجة"}
								</Button>
							</CardContent>
						</Card>

						<Card className="rounded-[2.5rem] bg-indigo-600 text-white border-0 shadow-2xl shadow-indigo-200 overflow-hidden relative p-8">
							<div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
							<CardTitle className="text-xl font-black mb-4 flex items-center gap-2">
								<Sparkles className="w-5 h-5 text-amber-300" /> السعة والنقاط
							</CardTitle>
							<div className="space-y-4 relative">
								<div className="flex gap-4">
									<div className="flex-1 p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm">
										<p className="text-[10px] font-bold text-indigo-200 uppercase mb-1">
											السعة المستهلكة
										</p>
										<p className="font-black text-lg">
											{stats?.totalDocs || 0} / {stats?.totalLimit || 100}
										</p>
									</div>
									<div className="flex-1 p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm">
										<p className="text-[10px] font-bold text-indigo-200 uppercase mb-1">
											الرفع اليومي
										</p>
										<p className="font-black text-lg">
											{stats?.dailyUploads || 0} / {stats?.dailyLimit || 10}
										</p>
									</div>
								</div>
								<p className="text-[10px] font-bold text-indigo-100 text-center">
									{stats && stats.totalDocs < 5
										? `لديك ${5 - stats.totalDocs} مستندات مجانية متبقية`
										: "تكلفة الرفع: 5 نقاط لكل مستند"}
								</p>
							</div>
						</Card>
					</div>
				</div>
			)}

			<ConfirmModal
				isOpen={showConfirm}
				onClose={() => setShowConfirm(false)}
				onConfirm={confirmDelete}
				title="حذف مستند من المعرفة"
				description="هل أنت متأكد من حذف هذا المستند؟ سيؤدي ذلك لإزالته تماماً من ذاكرة الذكاء الاصطناعي ولن يتمكن Lex من استرجاع معلومات منه لاحقاً."
				confirmText="نعم، حذف المستند"
				cancelText="تراجع"
				isLoading={isDeleting}
			/>
		</div>
	);
}
