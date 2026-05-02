"use client";

import { useState, useEffect, useCallback } from "react";
import {
	FileText,
	UploadCloud,
	Trash2,
	Search,
	Loader2,
	Filter,
	Plus,
	ChevronLeft,
	Calendar,
	ShieldCheck,
	Database,
	Globe,
	Lock,
	CheckCircle2,
	Zap,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DocumentHub } from "@/components/legal/DocumentHub";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
	getPublicJurisdictions,
	getPublicCategories,
} from "@/app/[locale]/actions/kb-public";

interface KnowledgeBaseClientProps {
	organizationId: string;
}

interface KBDocument {
	id: number;
	title: string;
	jurisdiction: string;
	categoryId?: string;
	doc_type: string;
	createdAt: string | Date;
}

interface Jurisdiction {
	id: string;
	nameAr: string;
	nameEn: string;
}

interface Category {
	id: string;
	nameAr: string;
	nameEn: string;
}

export function KnowledgeBaseClient({
	organizationId,
}: KnowledgeBaseClientProps) {
	const t = useTranslations("Workspace.home.docTypes");
	const currentLocale = useLocale();
	const [documents, setDocuments] = useState<KBDocument[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [showUpload, setShowUpload] = useState(false);
	const [newDocText, setNewDocText] = useState("");
	const [isIngesting, setIsIngesting] = useState(false);
	const [newDocTitle, setNewDocTitle] = useState("");

	// Metadata State
	const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
	const [categories, setCategories] = useState<Category[]>([]);
	const [selectedJurisdiction, setSelectedJurisdiction] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("");
	const [selectedDocType, setSelectedDocType] = useState("private_memo");

	const fetchDocuments = useCallback(async () => {
		setIsLoading(true);
		try {
			const res = await fetch("/api/legal/kb/documents");
			if (res.ok) {
				const data = await res.json();
				setDocuments(data);
			}
		} catch (error) {
			toast.error("فشل في تحميل المستندات.");
		} finally {
			setIsLoading(false);
		}
	}, []);

	const fetchMetadata = useCallback(async () => {
		const res = await getPublicJurisdictions();
		if (res.success) {
			setJurisdictions(res.data || []);
			if (res.data && res.data.length > 0) {
				setSelectedJurisdiction(res.data[0].id);
			}
		}
	}, []);

	const fetchCategories = useCallback(async (jId: string) => {
		const res = await getPublicCategories(jId);
		if (res.success) {
			setCategories(res.data || []);
			setSelectedCategory(""); // Reset category when jurisdiction changes
		}
	}, []);

	useEffect(() => {
		fetchDocuments();
		fetchMetadata();
	}, [fetchDocuments, fetchMetadata]);

	useEffect(() => {
		if (selectedJurisdiction) {
			fetchCategories(selectedJurisdiction);
		}
	}, [selectedJurisdiction, fetchCategories]);

	const handleIngest = async () => {
		if (!newDocTitle || !newDocText) {
			return toast.error("يرجى إدخال عنوان ومحتوى المستند.");
		}

		setIsIngesting(true);
		try {
			const res = await fetch("/api/legal/kb/ingest", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: newDocTitle,
					content: newDocText,
					jurisdiction: selectedJurisdiction,
					categoryId: selectedCategory,
					docType: selectedDocType,
				}),
			});

			if (res.ok) {
				toast.success("تمت إضافة المستند بنجاح.");
				setNewDocTitle("");
				setNewDocText("");
				setShowUpload(false);
				fetchDocuments();
			} else {
				const err = await res.json();
				toast.error(err.error || "فشل في إضافة المستند.");
			}
		} catch (error) {
			toast.error("حدث خطأ أثناء الاتصال.");
		} finally {
			setIsIngesting(false);
		}
	};

	const handleDelete = async (id: number) => {
		if (
			!confirm("هل أنت متأكد من حذف هذا المستند؟ سيتم حذفه من المكتبة والبحث.")
		)
			return;

		try {
			const res = await fetch(`/api/legal/kb?documentId=${id}`, {
				method: "DELETE",
			});
			if (res.ok) {
				setDocuments((prev) => prev.filter((d) => d.id !== id));
				toast.success("تم حذف المستند بنجاح");
			} else {
				toast.error("فشل في حذف المستند");
			}
		} catch (error) {
			toast.error("خطأ صلة.");
		}
	};

	const filteredDocs = documents.filter(
		(doc) =>
			doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
			doc.categoryId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			doc.jurisdiction?.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	return (
		<div className="space-y-8 animate-in fade-in duration-700 rtl" dir="rtl">
			{/* Search & Actions */}
			<div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-slate-100 shadow-sm sticky top-20 z-20">
				<div className="relative w-full sm:max-w-md group">
					<Input
						placeholder="ابحث في المكتبة المحلية..."
						className="pr-12 h-12 bg-slate-50/50 border-slate-100 rounded-2xl group-hover:border-indigo-400 transition-all font-bold focus:bg-white"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
					<Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
				</div>

				<Button
					onClick={() => setShowUpload(!showUpload)}
					className={cn(
						"w-full sm:w-auto h-12 px-8 rounded-2xl font-black gap-2 transition-all active:scale-95 shadow-lg",
						showUpload
							? "bg-slate-900 hover:bg-slate-800"
							: "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100",
					)}
				>
					{showUpload ? (
						<ChevronLeft className="h-5 w-5" />
					) : (
						<Plus className="h-5 w-5" />
					)}
					{showUpload ? "العودة للمكتبة" : "إضافة مستند جديد"}
				</Button>
			</div>

			{showUpload ? (
				<div className="animate-in slide-in-from-top-4 duration-500 max-w-4xl mx-auto space-y-6">
					<Card className="border-indigo-100 shadow-xl overflow-hidden rounded-[2.5rem]">
						<CardHeader className="bg-slate-900 p-8 text-white">
							<div className="flex items-center gap-4 mb-2">
								<div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-lg border border-white/20">
									<Database className="h-6 w-6 text-indigo-400" />
								</div>
								<CardTitle className="text-2xl font-black text-white">
									إضافة لمستنداتك الذكية
								</CardTitle>
							</div>
							<CardDescription className="text-slate-400 font-bold max-w-lg">
								سيتم معالجة المستند عبر محرك OCR الذكي، وتقطيعه لفقرات (Chunks)،
								ثم ربطه بذكاؤنا الاصطناعي ليتم استخدامه في ردود "Lex".
							</CardDescription>
						</CardHeader>
						<CardContent className="p-8 space-y-8">
							<div className="space-y-2">
								<label htmlFor="doc-title" className="text-sm font-black text-slate-700 px-1">
									عنوان المستند (Document Title)
								</label>
								<Input
									id="doc-title"
									placeholder="مثال: مذكرة قانونية لمكتب المحاماة — قضية رقم 123"
									className="h-14 bg-slate-50 border-slate-100 rounded-2xl font-bold px-6 focus:bg-white"
									value={newDocTitle}
									onChange={(e) => setNewDocTitle(e.target.value)}
								/>
							</div>

							<DocumentHub
								onContentDecided={setNewDocText}
								isLoading={isIngesting}
							/>

							<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
								<div className="space-y-2">
									<label htmlFor="jurisdiction-select" className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">
										الدولة/النطاق (Jurisdiction)
									</label>
									<select
										id="jurisdiction-select"
										className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 font-bold text-sm focus:bg-white outline-none"
										value={selectedJurisdiction}
										onChange={(e) => setSelectedJurisdiction(e.target.value)}
									>
										{jurisdictions.map((j) => (
											<option key={j.id} value={j.id}>
												{j.nameAr}
											</option>
										))}
									</select>
								</div>

								<div className="space-y-2">
									<label htmlFor="category-select" className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">
										التصنيف (Category)
									</label>
									<select
										id="category-select"
										className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 font-bold text-sm focus:bg-white outline-none"
										value={selectedCategory}
										onChange={(e) => setSelectedCategory(e.target.value)}
									>
										<option value="">عام (General)</option>
										{categories.map((c) => (
											<option key={c.id} value={c.id}>
												{c.nameAr}
											</option>
										))}
									</select>
								</div>

								<div className="space-y-2">
									<label htmlFor="doc-type-select" className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">
										نوع المستند (Type)
									</label>
									<select
										id="doc-type-select"
										className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 font-bold text-sm focus:bg-white outline-none"
										value={selectedDocType}
										onChange={(e) => setSelectedDocType(e.target.value)}
									>
										<option value="law">قانون (Law)</option>
										<option value="precedent">سابقة قضائية (Precedent)</option>
										<option value="principle">مبدأ قانوني (Principle)</option>
										<option value="procedure">إجراء (Procedure)</option>
										<option value="template">نموذج / صياغة (Template)</option>
										<option value="private_memo">
											مذكرة داخلية / بحث (Firm Memo)
										</option>
									</select>
								</div>
							</div>

							<div className="flex items-center justify-between p-4 bg-emerald-50 text-emerald-900 rounded-2xl border border-emerald-100">
								<div className="flex items-center gap-3">
									<ShieldCheck className="h-5 w-5 text-emerald-600" />
									<span className="text-xs font-bold uppercase tracking-widest tracking-tighter">
										سيادة البيانات (Tenant Isolation)
									</span>
								</div>
								<span className="text-[10px] font-black uppercase text-emerald-600">
									خاص بمؤسستك فقط
								</span>
							</div>

							<Button
								onClick={handleIngest}
								disabled={isIngesting || !newDocTitle || !newDocText}
								className="w-full h-16 bg-slate-900 hover:bg-black text-white rounded-3xl font-black text-lg shadow-2xl transition-all active:scale-95 gap-3"
							>
								{isIngesting ? (
									<Loader2 className="h-6 w-6 animate-spin" />
								) : (
									<Zap className="h-6 w-6 text-yellow-400 fill-yellow-400" />
								)}
								ابدأ المعالجة والإدراج (Ingest)
							</Button>
						</CardContent>
					</Card>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{isLoading ? (
						Array.from({ length: 6 }).map((_, i) => (
							<div
								key={`kb-skeleton-${i}`}
								className="h-48 bg-slate-100 rounded-[2rem] animate-pulse"
							/>
						))
					) : filteredDocs.length === 0 ? (
						<div className="col-span-full flex flex-col items-center justify-center py-20 text-center space-y-4">
							<div className="h-24 w-24 bg-slate-50 rounded-[3rem] flex items-center justify-center">
								<Database className="h-12 w-12 text-slate-200" />
							</div>
							<div>
								<h3 className="text-xl font-bold text-slate-700">
									لا توجد مستندات بعد
								</h3>
								<p className="text-slate-400 text-sm max-w-xs mx-auto">
									ابدأ برفع مذكراتك السابقة أو القوانين المهمة لمكتبك لبنائها
									وتحسين دقة الذكاء الاصطناعي.
								</p>
							</div>
						</div>
					) : (
						filteredDocs.map((doc) => (
							<Card
								key={doc.id}
								className="group hover:scale-[1.02] transition-all duration-300 border-none bg-white shadow-md hover:shadow-xl rounded-[2.5rem] overflow-hidden flex flex-col h-full border border-slate-50"
							>
								<CardHeader className="p-6 pb-0 flex flex-row items-start justify-between">
									<div
										className={cn(
											"h-12 w-12 rounded-2xl flex items-center justify-center shadow-inner",
											doc.doc_type === "template"
												? "bg-amber-50 text-amber-600"
												: doc.doc_type === "procedure"
													? "bg-rose-50 text-rose-600"
													: "bg-indigo-50 text-indigo-600",
										)}
									>
										<FileText className="h-6 w-6" />
									</div>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => handleDelete(doc.id)}
										className="h-8 w-8 rounded-full text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</CardHeader>
								<CardContent className="p-6 pt-4 flex-grow flex flex-col justify-between">
									<div className="space-y-2">
										<div className="flex flex-wrap gap-2 mb-2">
											<Badge
												variant="outline"
												className="rounded-lg py-0 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-tight border-indigo-100"
											>
												{jurisdictions.find((j) => j.id === doc.jurisdiction)
													?.nameAr || doc.jurisdiction}
											</Badge>
											{doc.categoryId && (
												<Badge
													variant="outline"
													className="rounded-lg py-0 bg-slate-50 text-slate-500 text-[9px] font-bold uppercase tracking-tight border-slate-100"
												>
													{categories.find((c) => c.id === doc.categoryId)
														?.nameAr || doc.categoryId}
												</Badge>
											)}
											<Badge
												variant="outline"
												className="rounded-lg py-0 bg-slate-50 text-slate-500 text-[9px] font-bold uppercase tracking-tight border-slate-100"
											>
												{t(doc.doc_type) ||
													doc.doc_type ||
													(currentLocale === "ar" ? "خاص" : "Private")}
											</Badge>
										</div>
										<h3 className="font-black text-slate-900 leading-snug line-clamp-2 text-lg">
											{doc.title}
										</h3>
									</div>

									<div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
										<div className="flex items-center gap-2 text-slate-400">
											<Calendar className="h-3 w-3" />
											<span className="text-[10px] font-bold">
												{new Date(doc.createdAt).toLocaleDateString("ar-KW")}
											</span>
										</div>
										<div className="flex items-center gap-1 text-emerald-600">
											<CheckCircle2 className="h-3 w-3" />
											<span className="text-[10px] font-black uppercase tracking-tighter">
												نشط (Indexed)
											</span>
										</div>
									</div>
								</CardContent>
							</Card>
						))
					)}
				</div>
			)}
		</div>
	);
}
