"use client";

import React, { useState, useEffect, use } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import {
	Loader2,
	Trash2,
	Calendar,
	Scale,
	Plus,
	ArrowRight,
	MessageSquare,
	FileText,
	User,
	Bot,
	Star,
	MoreVertical,
	Archive,
	Briefcase,
	Hash,
} from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import TipTapEditor from "@/components/global/TipTapEditor";
import { CreateDocumentModal } from "@/components/legal/CreateDocumentModal";
import { LegalDraftingTool } from "@/components/legal/ai-tools/LegalDraftingTool";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { AddEventModal } from "@/components/legal/AddEventModal";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { ChatWorkspace } from "@/components/legal/ChatWorkspace";
import posthog from "posthog-js";
import { authClient } from "@/lib/auth-client";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { PromptModal } from "@/components/ui/PromptModal";
import { EditClientModal } from "@/components/legal/EditClientModal";
import { EditCaseModal } from "@/components/legal/EditCaseModal";
import { getLocalizedCategoryName } from "@/lib/kb/category-utils";

interface WorkSession {
	id: number;
	title: string;
	tag: string;
	categoryId: string | null;
	status: string;
	isFavorite: boolean;
	clientName?: string;
	clientId?: string;
	clientPhone?: string;
	clientCivilId?: string;
	caseTitle?: string;
	caseId?: number;
	caseNumber?: string;
	caseStatus?: string;
	createdAt: string;
}

interface SessionDoc {
	id: number;
	title: string;
	content: string;
	categoryId: string | null;
	docType?: string;
	updatedAt: string;
	createdAt: string;
}

interface SessionEvent {
	id: number;
	title: string;
	eventDate: string;
	eventType: string;
	description: string | null;
}

interface Category {
	id: string;
	nameAr: string;
	nameEn: string;
	slug: string;
}

export default function CaseWorkspacePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const t = useTranslations("Workspace");
	const locale = useLocale();
	const dateLocale = locale === "ar" ? ar : enUS;
	const router = useRouter();
	const searchParams = useSearchParams();
	const docId = searchParams.get("docId");
	const viewParam = searchParams.get("view");
	const isNewMode = searchParams.get("mode") === "new";
	const { id: caseId } = use(params);

	// Authentication for ChatWorkspace
	const { data: sessionData } = authClient.useSession();

	const [project, setProject] = useState<WorkSession | null>(null);
	const [documents, setDocuments] = useState<SessionDoc[]>([]);
	const [events, setEvents] = useState<SessionEvent[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedDoc, setSelectedDoc] = useState<SessionDoc | null>(null);
	const [isNewDocModalOpen, setIsNewDocModalOpen] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
	const [startFromScratch, setStartFromScratch] = useState(false);
	const [categories, setCategories] = useState<Category[]>([]);
	const [isEditingSessionTitle, setIsEditingSessionTitle] = useState(false);
	const [tempSessionTitle, setTempSessionTitle] = useState("");
	const [isEditingDocTitle, setIsEditingDocTitle] = useState(false);
	const [tempDocTitle, setTempDocTitle] = useState("");
	const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
	const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
	const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
	const [isEditCaseModalOpen, setIsEditCaseModalOpen] = useState(false);
	const [showMetadata, setShowMetadata] = useState(false);

	// Default view is chat if no docId is specified
	const activeView = docId || startFromScratch ? "doc" : viewParam || "chat";

	useEffect(() => {
		if (caseId) {
			fetchProject();
			fetchCategories();
		}
	}, [caseId]);

	const fetchCategories = async () => {
		try {
			const res = await fetch("/api/legal/categories");
			if (res.ok) {
				const data = await res.json();
				setCategories(data);
			}
		} catch (err) {
			console.error("Fetch Categories Error:", err);
		}
	};

	useEffect(() => {
		if (docId) {
			fetchDocument(docId);
		} else {
			setSelectedDoc(null);
		}
	}, [docId]);

	useEffect(() => {
		if (isNewMode) {
			setIsNewDocModalOpen(true);
		}
	}, [isNewMode]);

	const fetchProject = async () => {
		if (!caseId) return;
		setLoading(true);
		try {
			const res = await fetch(`/api/legal/sessions/${caseId}`);
			if (res.ok) {
				const data = await res.json();
				if (data.project) {
					setProject(data.project);
					setDocuments(data.documents || []);
					setEvents(data.events || []);
				} else {
					throw new Error("Invalid project data");
				}
			} else {
				const errData = await res.json().catch(() => ({}));
				throw new Error(errData.error || t("fetchError") || "Failed to load session");
			}
		} catch (error) {
			console.error("Fetch Project Error:", error);
			toast.error(error instanceof Error ? error.message : "An error occurred");
			// Redirect back to hub if session is truly missing
			if (((error instanceof Error) ? error.message : "").includes("not found") || ((error instanceof Error) ? error.message : "").includes("غير موجودة")) {
				router.push("/dashboard/sessions");
			}
		} finally {
			setLoading(false);
		}
	};

	const updateSessionMetadata = async (
		newTitle?: string,
		newTag?: string,
		isFavorite?: boolean,
		newStatus?: string,
		categoryId?: string,
	) => {
		try {
			const payload: any = {};
			if (newTitle !== undefined) payload.title = newTitle;
			if (newTag !== undefined) payload.tag = newTag;
			if (categoryId !== undefined) payload.categoryId = categoryId;
			if (isFavorite !== undefined) payload.isFavorite = isFavorite;
			if (newStatus !== undefined) payload.status = newStatus;

			const res = await fetch(`/api/legal/sessions/${caseId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			if (res.ok) {
				const data = await res.json();
				setProject(data.session);

				if (newStatus === "archived") {
					toast.success("تمت أرشفة الجلسة بنجاح");
					router.push("/dashboard");
					return;
				}

				// Only show toast if something actually changed
				const hasTitleChanged =
					newTitle !== undefined && project && newTitle !== project.title;
				const hasTagChanged = newTag !== undefined && project && newTag !== project.tag;
				const hasCategoryChanged =
					categoryId !== undefined && project && categoryId !== project.categoryId;
				const hasFavoriteChanged =
					isFavorite !== undefined && project && isFavorite !== project.isFavorite;

				if (hasFavoriteChanged) {
					toast.success(
						isFavorite ? "تمت الإضافة للمفضلة" : "تمت الإزالة من المفضلة",
					);
				} else if (hasTitleChanged || hasTagChanged || hasCategoryChanged) {
					toast.success("تم تحديث بيانات الجلسة بنجاح");
				}

				window.dispatchEvent(new CustomEvent("refresh-workspace"));
			}
		} catch (err) {
			toast.error("فشل التحديث");
		}
	};

	const fetchDocument = async (id: string) => {
		try {
			const res = await fetch(`/api/legal/documents/${id}`);
			if (res.ok) {
				const data = await res.json();
				setSelectedDoc(data.document || data);
			}
		} catch (error) {
			console.error("Fetch Doc Error:", error);
		}
	};

	const handleDeleteDoc = async () => {
		if (!docId) return;

		try {
			setIsDeleting(true);
			const res = await fetch(`/api/legal/documents/${docId}`, {
				method: "DELETE",
			});
			if (!res.ok) throw new Error("Delete failed");
			toast.success(t("deleteSuccess") || "تم حذف المستند بنجاح");
			posthog.capture("session_doc_deleted", { sessionId: caseId, docId });

			// Reactive refresh
			window.dispatchEvent(new CustomEvent("refresh-workspace"));

			router.push(`/dashboard/sessions/${caseId}?view=chat`);
			fetchProject();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setIsDeleting(false);
			setShowDeleteConfirm(false);
		}
	};

	const handleCreateNew = () => {
		setIsNewDocModalOpen(true);
	};

	const handleSelectScratch = () => {
		setIsNewDocModalOpen(false);
		setStartFromScratch(true);
		// Move to doc view but with no docId to signal "New Document"
		router.push(`/dashboard/sessions/${caseId}?view=doc`);
		posthog.capture("session_doc_prepare_scratch", { sessionId: caseId });
	};

	const handleSelectAI = () => {
		setIsNewDocModalOpen(false);
		setStartFromScratch(false);
		posthog.capture("session_doc_created_ai", { sessionId: caseId });
		router.push(`/dashboard/sessions/${caseId}?view=ai-draft`);
	};

	if (loading) {
		return (
			<div className="flex flex-1 items-center justify-center p-12 h-screen">
				<div className="text-center space-y-4">
					<Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto" />
					<p className="text-slate-500 font-medium">جاري إعداد بيئة العمل...</p>
				</div>
			</div>
		);
	}

	if (!project) return null;

	return (
		<div className="flex flex-col h-full animate-in fade-in duration-500 bg-[#F6F6F9]">
			{/* Container to enforce full height layout exactly */}
			<div className="flex flex-col flex-1 h-full overflow-hidden">
				{/* Action Header - Always Top */}
				<div id="session-header" className="shrink-0 flex flex-col items-stretch py-3 px-4 sm:py-4 sm:px-6 border-b border-slate-200/60 bg-white/95 backdrop-blur-md sticky top-0 z-40 transition-all duration-300">
					<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
						<div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
							<div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-br from-indigo-50 to-white text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100 shadow-sm shrink-0 mt-0.5 sm:mt-0">
								<Scale className="h-5 w-5 sm:h-6 sm:w-6" />
							</div>
							<div className="flex flex-col min-w-0 flex-1">
								<div className="flex flex-col sm:flex-row sm:items-center justify-between lg:justify-start gap-3 sm:gap-6 lg:gap-10 w-full">
									{isEditingSessionTitle ? (
										<input
											type="text"
											autoFocus
											className="text-base sm:text-lg font-bold bg-white border border-indigo-300 rounded-[1.25rem] px-4 py-2 outline-none focus:ring-4 focus:ring-indigo-500/10 text-slate-800 min-w-[120px] flex-1 lg:flex-none shadow-inner"
											value={tempSessionTitle}
											onChange={(e) => setTempSessionTitle(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Enter") {
													e.currentTarget.blur();
												} else if (e.key === "Escape") {
													setIsEditingSessionTitle(false);
												}
											}}
											onBlur={() => {
												updateSessionMetadata(tempSessionTitle);
												setIsEditingSessionTitle(false);
											}}
										/>
									) : (
										<button
											type="button"
											className="text-base sm:text-xl font-black text-slate-900 tracking-tight cursor-pointer hover:bg-slate-50/80 px-3 py-1.5 -mx-3 rounded-2xl transition-all truncate flex-1 lg:flex-none text-right"
											onClick={() => {
												if (project) {
													setTempSessionTitle(project.title);
													setIsEditingSessionTitle(true);
												}
											}}
										>
											{project.title}
										</button>
									)}

									<div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5 sm:pb-0 no-scrollbar">
										{project.clientName ? (
											<button
												type="button"
												onClick={() => setIsEditClientModalOpen(true)}
												className="bg-emerald-50 text-emerald-700 text-[10px] sm:text-[11px] font-black px-3 py-1.5 rounded-2xl border border-emerald-100/50 hover:bg-emerald-100 transition-all flex items-center gap-1.5 shadow-sm whitespace-nowrap shrink-0 group"
											>
												<User className="h-3 w-3 transition-transform group-hover:scale-110" />
												{project.clientName}
											</button>
										) : (
											<button
												type="button"
												onClick={() => setIsEditClientModalOpen(true)}
												className="bg-white text-slate-400 text-[10px] sm:text-[11px] font-bold px-3 py-1.5 rounded-2xl border border-dashed border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 transition-all flex items-center gap-1.5 shrink-0"
											>
												<Plus className="h-3 w-3" />
												{locale === "ar" ? "إضافة موكل" : "Add Client"}
											</button>
										)}
										{project.caseTitle ? (
											<button
												type="button"
												onClick={() => setIsEditCaseModalOpen(true)}
												className="bg-indigo-50 text-indigo-700 text-[10px] sm:text-[11px] font-black px-3 py-1.5 rounded-2xl border border-indigo-100/50 hover:bg-indigo-100 transition-all flex items-center gap-1.5 shadow-sm whitespace-nowrap group"
											>
												<Briefcase className="h-3 w-3 transition-transform group-hover:scale-110" />
												{project.caseTitle}
											</button>
										) : (
											<button
												type="button"
												onClick={() => setIsEditCaseModalOpen(true)}
												className="bg-white text-slate-400 text-[10px] sm:text-[11px] font-bold px-3 py-1.5 rounded-2xl border border-dashed border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all flex items-center gap-1.5 shrink-0"
											>
												<Plus className="h-3 w-3" />
												{locale === "ar" ? "إضافة قضية" : "Add Case"}
											</button>
										)}
									</div>


								</div>

								{/* Metadata Row - Collapsible on Mobile */}
								<div
									className={cn(
										"lg:flex items-center flex-wrap gap-2 mt-1.5 transition-all duration-300 overflow-hidden",
										showMetadata
											? "flex opacity-100 max-h-[500px]"
											: "hidden opacity-0 max-h-0 lg:opacity-100 lg:max-h-none",
									)}
								>
									{project.caseNumber && (
										<button
											type="button"
											onClick={() => setIsEditCaseModalOpen(true)}
											className="bg-slate-50 text-slate-600 text-[10px] sm:text-[11px] font-black px-2 sm:px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 transition-all flex items-center gap-1.5 shadow-sm whitespace-nowrap"
										>
											<Hash className="h-3 w-3" />
											{project.caseNumber}
										</button>
									)}
								</div>
							</div>
						</div>

						<div
							className={cn(
								"lg:flex flex-col items-end gap-2 transition-all duration-300",
								showMetadata
									? "flex opacity-100 max-h-[500px]"
									: "hidden opacity-0 max-h-0 lg:flex lg:opacity-100 lg:max-h-none",
							)}
						>
							<div className="flex items-center flex-wrap gap-2 lg:gap-3 lg:justify-end">
								<span className="text-[10px] font-black tracking-widest uppercase text-slate-400 hidden sm:flex lg:flex items-center gap-2">
									بيئة العمل
								</span>
								<div className="w-px h-3 bg-slate-200 hidden sm:block" />
								<span
									className="text-[10px] font-bold text-slate-500"
									dir="ltr"
								>
									{format(
										new Date(project.createdAt || new Date()),
										"dd/MM/yyyy",
									)}
								</span>
								<div className="w-px h-3 bg-slate-200 hidden sm:block" />

								<div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 transition-all hover:bg-slate-100 hover:border-slate-300">
									<select
										className="bg-transparent text-[10px] font-black outline-none cursor-pointer appearance-none text-center min-w-[100px] text-slate-600"
										value={project.categoryId || project.tag || ""}
										onChange={(e) => {
											const val = e.target.value;
											if (val === "HEADER") return;

											const selectedCat = categories.find((c) => c.id === val);
											if (selectedCat) {
												updateSessionMetadata(
													undefined,
													getLocalizedCategoryName(selectedCat, locale),
													undefined,
													undefined,
													selectedCat.id,
												);
											} else if (val === "NEW_TAG") {
												setIsPromptModalOpen(true);
											} else {
												updateSessionMetadata(undefined, val);
											}
										}}
									>
										<option value="" className="font-bold">
											{locale === "ar" ? "اختر تصنيف" : "Choose Classification"}
										</option>
										{categories.map((cat) => (
											<option key={cat.id} value={cat.id}>
												{getLocalizedCategoryName(cat, locale)}
											</option>
										))}
										<option
											value="NEW_TAG"
											className="font-bold text-indigo-600"
										>
											+ إضافة وسم جديد...
										</option>
									</select>
								</div>
								<div className="w-px h-3 bg-slate-200 mx-1 hidden sm:block" />
								<button
									type="button"
									onClick={() =>
										updateSessionMetadata(
											undefined,
											undefined,
											!project.isFavorite,
										)
									}
									className={cn(
										"ms-2 transition-all p-1 rounded-lg",
										project.isFavorite
											? "text-amber-500 scale-110"
											: "text-slate-300 hover:text-amber-500 hover:scale-110",
									)}
									title={
										project.isFavorite ? "إزالة من المفضلة" : "إضافة للمفضلة"
									}
								>
									<Star
										className={cn(
											"h-4 w-4",
											project.isFavorite && "fill-amber-500",
										)}
									/>
								</button>

								<DropdownMenu>
									<DropdownMenuTrigger
										render={
											<button 
												type="button"
												className="p-1 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-all"
											>
												<MoreVertical className="h-4 w-4" />
											</button>
										}
									/>
									<DropdownMenuContent
										align="end"
										className="w-56 rounded-xl shadow-xl border-slate-200 z-[100]"
									>
										<DropdownMenuGroup>
											<DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-2">
												إجراءات الجلسة
											</DropdownMenuLabel>
										</DropdownMenuGroup>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											onClick={() =>
												updateSessionMetadata(
													undefined,
													undefined,
													!project.isFavorite,
												)
											}
											className="gap-3 py-2.5 px-3 cursor-pointer rounded-lg focus:bg-indigo-50"
										>
											<Star
												className={cn(
													"h-4 w-4",
													project.isFavorite
														? "fill-amber-500 text-amber-500"
														: "text-slate-400",
												)}
											/>
											<span className="font-bold text-sm">
												{project.isFavorite
													? "إزالة من المفضلة"
													: "إضافة للمفضلة"}
											</span>
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() => setIsArchiveModalOpen(true)}
											className="gap-3 py-2.5 px-3 cursor-pointer rounded-lg focus:bg-rose-50 text-rose-600 focus:text-rose-700"
										>
											<Archive className="h-4 w-4" />
											<span className="font-bold text-sm">أرشفة الجلسة</span>
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						</div>

						{/* Mobile Metadata Toggle - Repositioned for clarity */}
						<div className="lg:hidden absolute top-3 end-3 flex items-center gap-2">
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setShowMetadata(!showMetadata)}
								className={cn(
									"h-10 w-10 rounded-2xl transition-all shadow-sm border border-transparent",
									showMetadata
										? "bg-indigo-50 text-indigo-600 border-indigo-100"
										: "text-slate-400 bg-white/50"
								)}
							>
								<MoreVertical className="h-5 w-5" />
							</Button>
						</div>
					</div>

					{/* The 3 Action Buttons - Scrollable on Mobile */}
					<div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide flex-nowrap -mx-3 px-3 sm:mx-0 sm:px-0">
						<Button
							onClick={() => {
								posthog.capture("session_chat_started", { sessionId: caseId });
								setStartFromScratch(false);
								router.push(`/dashboard/sessions/${caseId}?view=chat`);
							}}
							variant={activeView === "chat" ? "default" : "outline"}
							className={cn(
								"rounded-lg gap-2 font-black text-[10px] uppercase tracking-wider h-9 px-4 transition-all shadow-sm shrink-0 whitespace-nowrap",
								activeView === "chat"
									? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 border-transparent"
									: "text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200",
							)}
						>
							<MessageSquare className="h-3.5 w-3.5" />
							محادثة ذكية
						</Button>
						<div className="w-px h-5 bg-slate-200 mx-0.5 shrink-0" />
						<Button
							onClick={handleCreateNew}
							variant={activeView === "doc" ? "default" : "outline"}
							className={cn(
								"rounded-lg gap-2 font-black text-[10px] uppercase tracking-wider h-9 px-4 transition-all shadow-sm shrink-0 whitespace-nowrap",
								activeView === "doc"
									? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 border-transparent"
									: "text-emerald-700 border-slate-200 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200",
							)}
						>
							<FileText className="h-3.5 w-3.5" />
							مستند جديد
						</Button>
						<Button
							onClick={() => setIsAddEventModalOpen(true)}
							variant="outline"
							className="rounded-lg gap-2 font-black text-[10px] uppercase tracking-wider h-9 px-4 border-slate-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-200 transition-all shadow-sm shrink-0 whitespace-nowrap"
						>
							<Calendar className="h-3.5 w-3.5" />
							إضافة موعد
						</Button>
					</div>
				</div>

				{/* Split-Pane Content Area */}
				<div className="flex-1 flex flex-row overflow-hidden relative">
					{/* The Canvas - Now Full Width */}
					<main className="flex-1 bg-white relative flex flex-col overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300 will-change-transform will-change-opacity">
						{/* Chat Workspace - Persistent Mounting */}
						<div
							className={cn(
								"absolute inset-0 transition-opacity duration-300",
								activeView !== "chat"
									? "opacity-0 invisible pointer-events-none"
									: "opacity-100 visible",
							)}
						>
							{sessionData?.user && (
								<ChatWorkspace
									user={sessionData.user}
									organizationId={
										(sessionData.session as any).activeOrganizationId ||
										(sessionData.user as any).activeOrganizationId ||
										""
									}
									sessionId={caseId}
									onRefresh={() => {
										fetchProject();
									}}
								/>
							)}
						</div>

						{/* AI Draft View - Persistent Mounting */}
						<div
							className={cn(
								"absolute inset-0 transition-opacity duration-300",
								activeView !== "ai-draft"
									? "opacity-0 invisible pointer-events-none"
									: "opacity-100 visible",
							)}
						>
							<div className="absolute inset-0 overflow-y-auto bg-slate-50">
								<div className="max-w-none mx-auto p-4 md:p-8 md:px-12">
									<div className="mb-6 flex items-center justify-between">
										<h3 className="text-2xl font-black text-slate-900 leading-tight">
											مساعد الصياغة الذكي
										</h3>
										<Button
											onClick={() => {
												router.push(`/dashboard/sessions/${caseId}?view=chat`);
											}}
											variant="outline"
											className="rounded-xl border-slate-200 gap-2 font-black text-xs uppercase tracking-wider text-slate-600 hover:text-slate-900 hover:bg-slate-50 shrink-0"
										>
											<ArrowRight className="h-4 w-4 text-slate-400" />
											العودة
										</Button>
									</div>
									<LegalDraftingTool caseId={caseId} embedded={true} />
								</div>
							</div>
						</div>

						{/* Document Editor View - Persistent Mounting */}
						<div
							className={cn(
								"absolute inset-0 transition-opacity duration-300",
								activeView !== "doc"
									? "opacity-0 invisible pointer-events-none"
									: "opacity-100 visible",
							)}
						>
							<div className="absolute inset-0 flex flex-col overflow-hidden">
								<div className="flex-1 w-full mx-auto p-0 sm:p-1 md:p-2 md:px-6 flex flex-col overflow-hidden">
									{/* Editor Header */}
									<div className="mb-1 sm:mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 border-b border-slate-100 pb-1 sm:pb-2 shrink-0 px-2 sm:px-0 mt-1">
										<div className="flex flex-col flex-1">
											{isEditingDocTitle && (selectedDoc || startFromScratch) ? (
												<input
													autoFocus
													value={tempDocTitle}
													onChange={(e) => setTempDocTitle(e.target.value)}
													onBlur={async () => {
														setIsEditingDocTitle(false);
														if (
															tempDocTitle.trim() !== "" &&
															(!selectedDoc || tempDocTitle !== selectedDoc.title)
														) {
															if (!selectedDoc) {
																// For scratch doc, just update local temp title
																return;
															}
															try {
																const res = await fetch(
																	`/api/legal/documents/${selectedDoc.id}`,
																	{
																		method: "PATCH",
																		headers: {
																			"Content-Type": "application/json",
																		},
																		body: JSON.stringify({ title: tempDocTitle }),
																	},
																);
																if (res.ok) {
																	toast.success("تم تحديث عنوان المستند");
																	fetchDocument(String(selectedDoc.id));
																	window.dispatchEvent(
																		new CustomEvent("refresh-workspace"),
																	);
																}
															} catch (err) {}
														}
													}}
													onKeyDown={(e) => {
														if (e.key === "Enter") e.currentTarget.blur();
														if (e.key === "Escape") setIsEditingDocTitle(false);
													}}
													className="text-lg sm:text-xl font-black text-slate-900 leading-tight bg-transparent border-b-2 border-indigo-500 outline-none w-full"
												/>
											) : (
												<button
													type="button"
													onClick={() => {
														setTempDocTitle(selectedDoc?.title || "مستند مسودة جديد");
														setIsEditingDocTitle(true);
													}}
													className="text-lg sm:text-xl font-black text-slate-900 leading-tight cursor-text transition-all hover:bg-slate-50 hover:rounded-lg hover:px-2 hover:-mx-2 w-fit text-right"
													title="انقر للتعديل"
												>
													{startFromScratch
														? (tempDocTitle || "مستند مسودة جديد")
														: selectedDoc?.title || "اختر مستنداً"}
												</button>
											)}
											{selectedDoc && (
												<div className="flex items-center gap-3 mt-2">
													<span className="text-[10px] font-bold text-slate-400">
														تاريخ آخر تعديل:{" "}
														{format(
															new Date(
																selectedDoc.updatedAt || selectedDoc.createdAt,
															),
															"dd MMMM yyyy, HH:mm",
															{ locale: dateLocale },
														)}
													</span>
													<div className="w-px h-3 bg-slate-200" />
													<div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-md px-2 py-0.5 transition-all hover:bg-emerald-100">
														<select
															className="bg-transparent text-emerald-700 text-[10px] font-bold outline-none cursor-pointer appearance-none min-w-[110px]"
															value={selectedDoc.categoryId || ""}
															onChange={async (e) => {
																try {
																	const res = await fetch(
																		`/api/legal/documents/${selectedDoc.id}`,
																		{
																			method: "PATCH",
																			headers: {
																				"Content-Type": "application/json",
																			},
																			body: JSON.stringify({
																				categoryId: e.target.value || null,
																			}),
																		},
																	);
																	if (res.ok) {
																		toast.success("تم تحديث تصنيف المستند");
																		fetchDocument(String(selectedDoc.id));
																	}
																} catch (err) {
																	toast.error("فشل تحديث التصنيف");
																}
															}}
														>
															<option value="" className="font-bold">
																{locale === "ar"
																	? "اختر تصنيف"
																	: "Choose Classification"}
															</option>
															{categories.map((cat) => (
																<option key={cat.id} value={cat.id}>
																	{getLocalizedCategoryName(cat, locale)}
																</option>
															))}
														</select>
													</div>
												</div>
											)}
										</div>

										<div className="flex items-center gap-3">
											{(selectedDoc || docId) && (
												<Button
													variant="ghost"
													size="sm"
													onClick={() => setShowDeleteConfirm(true)}
													className="text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg px-3 h-8 font-bold gap-1.5 transition-all text-xs"
													title="حذف المستند"
												>
													<Trash2 className="h-3.5 w-3.5" />
													<span>حذف</span>
												</Button>
											)}

											<Button
												onClick={() => {
													setStartFromScratch(false);
													router.push(
														`/dashboard/sessions/${caseId}?view=chat`,
													);
												}}
												variant="outline"
												className="rounded-lg border-slate-200 gap-2 font-black text-[10px] uppercase tracking-wider text-slate-600 hover:text-slate-900 hover:bg-slate-50 shrink-0"
											>
												<ArrowRight className="h-4 w-4" />
												العودة
											</Button>
										</div>
									</div>
									<div className="flex-1 overflow-hidden">
										<TipTapEditor
											key={selectedDoc?.id || "new"}
											content={selectedDoc?.content || ""}
											caseId={caseId}
											onSave={async (html) => {
												if (!html || html.trim() === '<p dir="rtl"></p>') {
													toast.error("لا يمكن حفظ مستند فارغ");
													return;
												}

												try {
													const payload = {
														title: startFromScratch
															? (tempDocTitle || "مستند مسودة جديد")
															: selectedDoc?.title,
														content: html,
														caseProjectId: caseId,
														docType: startFromScratch
															? "Draft"
															: selectedDoc?.docType || "Pleading",
														id: selectedDoc?.id,
													};

													const res = await fetch("/api/legal/documents", {
														method: "POST",
														headers: { "Content-Type": "application/json" },
														body: JSON.stringify(payload),
													});

													if (res.ok) {
														const saved = await res.json();
														toast.success(
															t("saveSuccess") || "تم حفظ المستند بنجاح",
														);
														posthog.capture("session_doc_saved", {
															sessionId: caseId,
															docId: saved.document?.id || saved.id,
														});

														// Trigger sidebar refresh
														window.dispatchEvent(
															new CustomEvent("refresh-workspace"),
														);

														fetchProject();

														if (startFromScratch) {
															setStartFromScratch(false);
															router.push(
																`/dashboard/sessions/${caseId}?view=doc&docId=${saved.document?.id || saved.id}`,
															);
														}
													} else {
														throw new Error("Save failed");
													}
												} catch (e) {
													toast.error(t("saveError") || "فشل حفظ المستند");
												}
											}}
										/>
									</div>
								</div>
							</div>
						</div>
					</main>
				</div>
			</div>

			<AddEventModal
				open={isAddEventModalOpen}
				onOpenChange={setIsAddEventModalOpen}
				projectId={caseId}
				onSuccess={() => {
					fetchProject();
					posthog.capture("session_event_created", { sessionId: caseId });
					window.dispatchEvent(new CustomEvent("refresh-workspace"));
				}}
			/>

			<CreateDocumentModal
				isOpen={isNewDocModalOpen}
				onClose={() => setIsNewDocModalOpen(false)}
				caseId={caseId}
				onSelectScratch={handleSelectScratch}
				onSelectAI={handleSelectAI}
			/>

			<ConfirmModal
				isOpen={showDeleteConfirm}
				onClose={() => setShowDeleteConfirm(false)}
				onConfirm={handleDeleteDoc}
				isLoading={isDeleting}
				title="حذف المستند"
				description={`هل أنت متأكد من حذف "${selectedDoc?.title || "هذا المستند"}"؟ لا يمكن التراجع عن هذا الإجراء.`}
			/>

			<ConfirmModal
				isOpen={isArchiveModalOpen}
				onClose={() => setIsArchiveModalOpen(false)}
				onConfirm={() => {
					updateSessionMetadata(undefined, undefined, undefined, "archived");
					setIsArchiveModalOpen(false);
				}}
				isLoading={isDeleting}
				title="أرشفة الجلسة"
				description="هل أنت متأكد من أرشفة هذه الجلسة؟ سيتم إخفاؤها من القائمة النشطة."
			/>

			<PromptModal
				isOpen={isPromptModalOpen}
				onClose={() => setIsPromptModalOpen(false)}
				onConfirm={(val) => {
					updateSessionMetadata(undefined, val);
					setIsPromptModalOpen(false);
				}}
				title="إضافة تصنيف جديد"
				label="اسم التصنيف / الوسم"
				placeholder="مثال: قضايا تجارية، مذكرات عمالية..."
			/>

			<EditClientModal
				open={isEditClientModalOpen}
				onOpenChange={setIsEditClientModalOpen}
				client={
					project && project.clientId
						? {
								id: project.clientId,
								fullName: project.clientName || "",
								phone: project.clientPhone,
								civilId: project.clientCivilId,
							}
						: null
				}
				onSuccess={fetchProject}
			/>

			<EditCaseModal
				open={isEditCaseModalOpen}
				onOpenChange={setIsEditCaseModalOpen}
				caseData={
					project && project.caseId
						? {
								id: project.caseId,
								title: project.caseTitle || "",
								caseNumber: project.caseNumber,
								status: project.caseStatus || "Active",
							}
						: null
				}
				onSuccess={fetchProject}
			/>
		</div>
	);
}
