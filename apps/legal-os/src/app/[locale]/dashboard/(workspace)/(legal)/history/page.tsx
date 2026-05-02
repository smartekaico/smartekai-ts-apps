"use client";

import { useState, useEffect, useCallback } from "react";
import { getLocalizedCategoryName } from "@/lib/kb/category-utils";
import {
	FolderOpen,
	Search,
	Archive,
	RotateCcw,
	Scale,
	TrendingUp,
	Loader2,
	Inbox,
	Clock,
	MoreVertical,
	History,
	FileText,
	Wand2,
	ArrowUpDown,
	LayoutGrid,
	List as ListIcon,
	Edit3,
	User,
	Briefcase,
	Hash,
	Phone,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Locale } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DocumentLink } from "@/components/legal/DocumentLink";
import { EditClientModal } from "@/components/legal/EditClientModal";
import { EditCaseModal } from "@/components/legal/EditCaseModal";

// Types from Documents page
interface SavedDocument {
	id: string;
	title: string;
	doc_type: string;
	preview: string;
	created_at: string;
	case_project_id: string | null;
	project_title: string | null;
}

interface WorkSession {
	id: string;
	title: string;
	tag: string | null;
	status: string;
	createdAt: string;
}

interface Category {
	id: string;
	slug: string;
	nameAr: string;
	nameEn: string;
}

interface Client {
	id: string;
	fullName: string;
	phone: string | null;
	civilId: string | null;
	createdAt: string;
}

interface Case {
	id: string;
	title: string;
	caseNumber: string | null;
	status: string;
	createdAt: string;
	clientId: string;
}

const DOC_TYPE_CONFIG: Record<
	string,
	{ label: string; icon: React.ElementType; color: string }
> = {
	Analysis: {
		label: "تحليل قانوني",
		icon: Scale,
		color: "bg-indigo-100 text-indigo-700",
	},
	Summary: {
		label: "تلخيص قانوني",
		icon: FileText,
		color: "bg-slate-100 text-slate-700",
	},
	Pleading: {
		label: "صياغة صحيفة",
		icon: Wand2,
		color: "bg-emerald-100 text-emerald-700",
	},
	Contract: {
		label: "عقد/اتفاقية",
		icon: FileText,
		color: "bg-violet-100 text-violet-700",
	},
	Research: {
		label: "بحث قانوني",
		icon: Search,
		color: "bg-amber-100 text-amber-700",
	},
	Draft: { label: "مسودة", icon: Edit3, color: "bg-slate-100 text-slate-700" },
	Default: {
		label: "مستند",
		icon: FileText,
		color: "bg-slate-50 text-slate-500",
	},
};

// --- Subcomponents ---

const EmptyState = ({
	icon: Icon,
	title,
	desc,
}: { icon: React.ElementType; title: string; desc: string }) => (
	<Card className="border-dashed border-2 border-slate-200 bg-slate-50/50 p-20 text-center flex flex-col items-center gap-6 rounded-[2.5rem]">
		<div className="h-20 w-20 bg-white rounded-3xl flex items-center justify-center text-slate-300 shadow-sm">
			<Icon className="h-10 w-10" />
		</div>
		<div className="space-y-2">
			<h3 className="text-2xl font-black text-slate-800">{title}</h3>
			<p className="text-slate-500 max-w-sm font-medium">{desc}</p>
		</div>
	</Card>
);

const LoadingState = () => (
	<div className="p-32 flex flex-col items-center justify-center gap-6 bg-white rounded-[3rem] border border-dashed border-slate-200">
		<Loader2 className="h-16 w-16 animate-spin text-indigo-600" />
		<p className="text-xl font-black text-slate-900 tracking-tight">
			جاري تحصيل البيانات...
		</p>
	</div>
);

const SessionCard = ({
	session,
	isActive,
	t,
	getTagLabel,
	dateLocale,
	updateStatus,
}: {
	session: WorkSession;
	isActive: boolean;
	t: (key: string) => string;
	getTagLabel: (slug: string) => string;
	dateLocale: Locale;
	updateStatus: (id: string, status: string) => void;
}) => (
	<Card className="group relative flex flex-col h-full hover:shadow-2xl hover:shadow-indigo-100/50 transition-all duration-500 border-slate-100 overflow-hidden rounded-[2rem] bg-white">
		<div className="p-8 flex-1">
			<div className="flex justify-between items-start mb-6">
				<div
					className={cn(
						"h-12 w-12 rounded-2xl flex items-center justify-center transition-all bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white group-hover:scale-110",
					)}
				>
					<Scale className="h-6 w-6" />
				</div>
				{session.tag && (
					<span className="text-[9px] font-black px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 tracking-wider">
						{getTagLabel(session.tag)}
					</span>
				)}
			</div>
			<h3 className="text-xl font-black text-slate-900 leading-tight mb-4 group-hover:text-indigo-600 transition-colors line-clamp-2">
				{session.title}
			</h3>
			<p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
				<Clock className="h-3 w-3" />{" "}
				{format(new Date(session.createdAt), "d MMMM yyyy", {
					locale: dateLocale,
				})}
			</p>
		</div>
		<CardFooter className="p-6 pt-0 flex gap-2">
			<Link href={`/dashboard/sessions/${session.id}`} className="flex-1">
				<Button className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-black rounded-xl h-12 shadow-sm transition-all">
					{t("card.enter")}
				</Button>
			</Link>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className="h-12 w-12 rounded-xl text-slate-400 border border-slate-100 shrink-0"
					>
						<MoreVertical className="h-5 w-5" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-48 rounded-xl" dir="rtl">
					<DropdownMenuItem
						onClick={() =>
							updateStatus(session.id, isActive ? "Archived" : "Open")
						}
						className="gap-2 font-bold p-3"
					>
						{isActive ? (
							<Archive className="h-4 w-4" />
						) : (
							<RotateCcw className="h-4 w-4" />
						)}
						{isActive ? t("card.archive") : t("card.restore")}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</CardFooter>
	</Card>
);

const SessionListRow = ({
	session,
	isActive,
	getTagLabel,
	dateLocale,
	updateStatus,
}: {
	session: WorkSession;
	isActive: boolean;
	getTagLabel: (slug: string) => string;
	dateLocale: Locale;
	updateStatus: (id: string, status: string) => void;
}) => (
	<div className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl hover:shadow-lg transition-all">
		<div className="flex items-center gap-5 min-w-0">
			<div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
				<Scale className="h-5 w-5" />
			</div>
			<div className="truncate">
				<h3 className="font-black text-slate-900 truncate">{session.title}</h3>
				<div className="flex items-center gap-3 mt-1">
					<span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
						{format(new Date(session.createdAt), "d MMMM", {
							locale: dateLocale,
						})}
					</span>
					{session.tag && (
						<span className="bg-slate-50 text-indigo-600 px-2 py-0.5 rounded text-[9px] font-bold">
							{getTagLabel(session.tag)}
						</span>
					)}
				</div>
			</div>
		</div>
		<div className="flex items-center gap-3">
			<Link href={`/dashboard/sessions/${session.id}`}>
				<Button
					size="sm"
					variant="ghost"
					className="h-10 px-6 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white font-black rounded-xl"
				>
					دخول
				</Button>
			</Link>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className="h-10 w-10 p-0 text-slate-300 hover:text-slate-600 transition-colors"
					>
						<MoreVertical className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-48 rounded-xl" dir="rtl">
					<DropdownMenuItem
						onClick={() =>
							updateStatus(session.id, isActive ? "Archived" : "Open")
						}
						className="gap-2 font-bold p-3"
					>
						{isActive ? (
							<Archive className="h-4 w-4" />
						) : (
							<RotateCcw className="h-4 w-4" />
						)}
						{isActive ? "أرشفة" : "استعادة"}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	</div>
);

const ClientListRow = ({
	client,
	dateLocale,
	onClick,
}: {
	client: Client;
	dateLocale: Locale;
	onClick: () => void;
}) => (
	<div 
		onClick={onClick}
		className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl hover:shadow-lg transition-all cursor-pointer group"
	>
		<div className="flex items-center gap-5 min-w-0">
			<div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-all">
				<User className="h-5 w-5" />
			</div>
			<div className="truncate">
				<h3 className="font-black text-slate-900 truncate group-hover:text-emerald-600 transition-colors">{client.fullName}</h3>
				<div className="flex items-center gap-4 mt-1">
					<span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
						{format(new Date(client.createdAt), "d MMMM yyyy", {
							locale: dateLocale,
						})}
					</span>
					{client.phone && (
						<div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
							<Phone className="h-3 w-3" />
							<span>{client.phone}</span>
						</div>
					)}
				</div>
			</div>
		</div>
		<Button
			size="sm"
			variant="ghost"
			className="h-10 px-6 bg-slate-50 text-slate-600 hover:bg-emerald-600 hover:text-white font-black rounded-xl transition-all"
		>
			عرض التفاصيل
		</Button>
	</div>
);

const CaseListRow = ({
	caseItem,
	dateLocale,
	onClick,
	locale,
}: {
	caseItem: Case;
	dateLocale: Locale;
	onClick: () => void;
	locale: string;
}) => (
	<div 
		onClick={onClick}
		className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl hover:shadow-lg transition-all cursor-pointer group"
	>
		<div className="flex items-center gap-5 min-w-0">
			<div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all">
				<Briefcase className="h-5 w-5" />
			</div>
			<div className="truncate">
				<h3 className="font-black text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{caseItem.title}</h3>
				<div className="flex items-center gap-4 mt-1">
					<span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
						{format(new Date(caseItem.createdAt), "d MMMM yyyy", {
							locale: dateLocale,
						})}
					</span>
					{caseItem.caseNumber && (
						<span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg border border-slate-200">
							#{caseItem.caseNumber}
						</span>
					)}
					<span
						className={cn(
							"text-[9px] font-black px-2 py-0.5 rounded-lg border",
							caseItem.status === "Active"
								? "bg-emerald-50 text-emerald-600 border-emerald-100"
								: "bg-slate-50 text-slate-500 border-slate-100",
						)}
					>
						{caseItem.status === "Active"
							? locale === "ar"
								? "نشطة"
								: "Active"
							: caseItem.status}
					</span>
				</div>
			</div>
		</div>
		<Button
			size="sm"
			variant="ghost"
			className="h-10 px-6 bg-slate-50 text-slate-600 hover:bg-indigo-600 hover:text-white font-black rounded-xl transition-all"
		>
			عرض التفاصيل
		</Button>
	</div>
);


export default function HistoryHubPage() {
	const tDashboard = useTranslations("Dashboard");
	const tSessions = useTranslations("Sessions");
	const locale = useLocale();
	const router = useRouter();
	const searchParams = useSearchParams();
	const dateLocale = locale === "ar" ? ar : enUS;

	// Active Main Tab (sessions | docs)
	const [activeMainTab, setActiveMainTab] = useState(
		searchParams.get("tab") || "sessions",
	);

	// --- Sessions State ---
	const [sessions, setSessions] = useState<WorkSession[]>([]);
	const [categories, setCategories] = useState<Category[]>([]);
	const [loadingSessions, setLoadingSessions] = useState(false);
	const [sessionsSearch, setSessionsSearch] = useState("");

	// --- Documents State ---
	const [documents, setDocuments] = useState<SavedDocument[]>([]);
	const [loadingDocs, setLoadingDocs] = useState(false);
	const [docsSearch, setDocsSearch] = useState("");
	const [docsFilterType, setDocsFilterType] = useState("all");
	const [docsSortOrder, setDocsSortOrder] = useState<"desc" | "asc">("desc");
	const [docsActiveStatus, setDocsActiveStatus] = useState("Open");

	// --- Clients State ---
	const [clientsData, setClientsData] = useState<Client[]>([]);
	const [loadingClients, setLoadingClients] = useState(false);
	const [clientsSearch, setClientsSearch] = useState("");

	// --- Cases State ---
	const [casesData, setCasesData] = useState<Case[]>([]);
	const [loadingCases, setLoadingCases] = useState(false);
	const [casesSearch, setCasesSearch] = useState("");

	// --- Modal State ---
	const [editClientOpen, setEditClientOpen] = useState(false);
	const [selectedClient, setSelectedClient] = useState<Client | null>(null);
	const [editCaseOpen, setEditCaseOpen] = useState(false);
	const [selectedCase, setSelectedCase] = useState<Case | null>(null);

	// Sync tab with URL
	useEffect(() => {
		const tab = searchParams.get("tab");
		if (tab && (tab === "sessions" || tab === "docs")) {
			setActiveMainTab(tab);
		}
	}, [searchParams]);

	const handleTabChange = (val: string) => {
		setActiveMainTab(val);
		const params = new URLSearchParams(searchParams.toString());
		params.set("tab", val);
		router.replace(`/${locale}/dashboard/history?${params.toString()}`);
	};

	const fetchClients = useCallback(async () => {
		try {
			setLoadingClients(true);
			const res = await fetch("/api/legal/clients");
			if (res.ok) setClientsData(await res.json());
		} catch (e) {
			console.error("Error fetching clients", e);
		} finally {
			setLoadingClients(false);
		}
	}, []);

	const fetchCases = useCallback(async () => {
		try {
			setLoadingCases(true);
			const res = await fetch("/api/legal/cases");
			if (res.ok) setCasesData(await res.json());
		} catch (e) {
			console.error("Error fetching cases", e);
		} finally {
			setLoadingCases(false);
		}
	}, []);

	// --- Data Fetching ---
	const fetchSessions = useCallback(async () => {
		try {
			setLoadingSessions(true);
			const res = await fetch("/api/legal/sessions", { cache: "no-store" });
			if (res.ok) setSessions(await res.json());
		} catch (error) {
			console.error("Fetch Sessions Error:", error);
		} finally {
			setLoadingSessions(false);
		}
	}, []);

	const fetchCategories = useCallback(async () => {
		try {
			const res = await fetch("/api/legal/categories");
			if (res.ok) setCategories(await res.json());
		} catch (e) {
			console.error("Error fetching categories", e);
		}
	}, []);

	const fetchDocs = useCallback(async (status = "Open") => {
		setLoadingDocs(true);
		try {
			const res = await fetch(`/api/legal/documents?status=${status}`);
			const data = await res.json();
			setDocuments(data.documents || []);
		} catch (err) {
			console.error("Fetch Docs Error:", err);
		} finally {
			setLoadingDocs(false);
		}
	}, []);

	useEffect(() => {
		if (activeMainTab === "sessions") {
			fetchSessions();
			fetchCategories();
		} else if (activeMainTab === "docs") {
			fetchDocs(docsActiveStatus);
		} else if (activeMainTab === "clients") {
			fetchClients();
		} else if (activeMainTab === "cases") {
			fetchCases();
		}
	}, [
		activeMainTab,
		docsActiveStatus,
		fetchSessions,
		fetchCategories,
		fetchDocs,
		fetchClients,
		fetchCases,
	]);

	// --- Handlers ---
	const updateSessionStatus = async (id: string, newStatus: string) => {
		try {
			const res = await fetch(`/api/legal/sessions/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status: newStatus }),
			});
			if (res.ok) {
				toast.success(
					newStatus === "Archived"
						? tSessions("toasts.archiveSuccess")
						: tSessions("toasts.restoreSuccess"),
				);
				setSessions((prev) =>
					prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)),
				);
			}
		} catch {
			toast.error(tSessions("toasts.genericError"));
		}
	};

	const handleUpdateDocStatus = async (id: string, status: string) => {
		try {
			await fetch(`/api/legal/documents/${id}`, {
				method: "PATCH",
				body: JSON.stringify({ status }),
			});
			setDocuments((prev) => prev.filter((d) => d.id !== id));
			toast.success(
				status === "Archived" ? "تم أرشفة المستند" : "تم استعادة المستند",
			);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "خطأ غير معروف";
			toast.error(`فشل التحديث: ${errorMessage}`);
		}
	};

	// --- Helpers ---
	const getTagLabel = (slug: string) => {
		if (slug === "other") return locale === "ar" ? "أخرى" : "Other";
		const cat = categories.find((c) => c.slug === slug || c.id === slug);
		if (cat) return getLocalizedCategoryName(cat, locale);
		return slug;
	};

	const stripHtml = (html: string) =>
		html
			?.replace(/<[^>]*>/g, " ")
			.replace(/\s+/g, " ")
			.trim() || "";

	// --- Filtered Data ---
	const filteredSessions = sessions.filter(
		(p) =>
			p?.title?.toLowerCase().includes(sessionsSearch.toLowerCase()) ||
			(p?.tag?.toLowerCase().includes(sessionsSearch.toLowerCase())),
	);
	const activeSessions = filteredSessions.filter(
		(p) => p.status?.toLowerCase() === "open",
	);
	const archivedSessions = filteredSessions.filter(
		(p) => p.status?.toLowerCase() === "archived",
	);

	const filteredDocs = documents
		.filter((d) => {
			const matchesType =
				docsFilterType === "all" ||
				(docsFilterType === "unassigned"
					? d.case_project_id === null
					: d.doc_type === docsFilterType);
			const query = docsSearch.toLowerCase();
			const matchesSearch =
				d?.title?.toLowerCase().includes(query) ||
				stripHtml(d?.preview || "")
					.toLowerCase()
					.includes(query);
			return matchesType && matchesSearch;
		})
		.sort((a, b) => {
			const dateA = new Date(a.created_at).getTime();
			const dateB = new Date(b.created_at).getTime();
			return docsSortOrder === "desc" ? dateB - dateA : dateA - dateB;
		});

	const filteredClients = clientsData.filter(
		(c) =>
			c.fullName.toLowerCase().includes(clientsSearch.toLowerCase()) ||
			(c.phone?.includes(clientsSearch)) ||
			(c.civilId?.includes(clientsSearch)),
	);

	const filteredCases = casesData.filter(
		(c) =>
			c.title.toLowerCase().includes(casesSearch.toLowerCase()) ||
			(c.caseNumber?.toLowerCase().includes(casesSearch.toLowerCase())),
	);

	return (
		<main
			className="w-full max-w-[1400px] mx-auto min-h-screen px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-in fade-in duration-700 rtl"
			dir="rtl"
		>
			<div className="flex flex-col gap-4 sm:gap-6">
				{/* Header Section */}
				<header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 border-b border-slate-100 pb-4 sm:pb-6 text-right">
					<div className="space-y-2 sm:space-y-4">
						<div className="flex items-center gap-3 text-indigo-600 justify-end sm:justify-start">
							<TrendingUp className="h-5 w-5" />
							<span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em]">
								{tDashboard("history")}
							</span>
						</div>
						<h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 leading-tight">
							{activeMainTab === "sessions"
								? tSessions("hubTitle")
								: activeMainTab === "docs"
									? tDashboard("documents")
									: activeMainTab === "clients"
										? locale === "ar"
											? "سجل الموكلين"
											: "Clients Hub"
										: locale === "ar"
											? "سجل القضايا"
											: "Cases Hub"}
						</h1>
					</div>

				</header>

				{/* Main Interface */}
				<Tabs
					value={activeMainTab}
					onValueChange={handleTabChange}
					className="w-full flex flex-col gap-6 sm:gap-10"
				>
					<div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md pb-4 pt-2 -mx-4 px-4 sm:mx-0 sm:px-0 border-b border-slate-50">
						<TabsList className="flex items-center gap-1 sm:gap-2 bg-slate-100/50 p-1.5 rounded-2xl h-14 sm:h-20 w-full lg:w-fit shadow-sm border border-slate-100 overflow-x-auto no-scrollbar">
							<TabsTrigger
								value="sessions"
								className="flex-1 lg:flex-none px-4 sm:px-10 h-11 sm:h-16 rounded-xl data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md font-black transition-all gap-2 sm:gap-3 text-xs sm:text-lg border border-transparent whitespace-nowrap"
							>
								<History className="h-4 w-4 sm:h-5 sm:w-5" />
								{tDashboard("sessions")}
							</TabsTrigger>
							<TabsTrigger
								value="docs"
								className="flex-1 lg:flex-none px-4 sm:px-10 h-11 sm:h-16 rounded-xl data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md font-black transition-all gap-2 sm:gap-3 text-xs sm:text-lg border border-transparent whitespace-nowrap"
							>
								<FileText className="h-4 w-4 sm:h-5 sm:w-5" />
								{tDashboard("documents")}
							</TabsTrigger>
							<TabsTrigger
								value="clients"
								className="flex-1 lg:flex-none px-4 sm:px-10 h-11 sm:h-16 rounded-xl data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md font-black transition-all gap-2 sm:gap-3 text-xs sm:text-lg border border-transparent whitespace-nowrap"
							>
								<User className="h-4 w-4 sm:h-5 sm:w-5" />
								{locale === "ar" ? "الموكلين" : "Clients"}
							</TabsTrigger>
							<TabsTrigger
								value="cases"
								className="flex-1 lg:flex-none px-4 sm:px-10 h-11 sm:h-16 rounded-xl data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md font-black transition-all gap-2 sm:gap-3 text-xs sm:text-lg border border-transparent whitespace-nowrap"
							>
								<Briefcase className="h-4 w-4 sm:h-5 sm:w-5" />
								{locale === "ar" ? "القضايا" : "Cases"}
							</TabsTrigger>
						</TabsList>
					</div>

					{/* Sessions Content */}
					<TabsContent
						value="sessions"
						className="mt-0 outline-none space-y-12"
					>
						<section className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
							<Card className="p-4 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border-slate-100 shadow-sm flex flex-col justify-between hover:border-indigo-100 transition-colors">
								<p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 sm:mb-6">
									{tSessions("stats.totalActive")}
								</p>
								<div className="flex items-end justify-between">
									<span className="text-2xl sm:text-4xl font-black text-slate-900 font-sans tracking-tight">
										{activeSessions.length}
									</span>
									<div className="h-8 w-8 sm:h-12 sm:w-12 bg-indigo-50 text-indigo-600 rounded-lg sm:rounded-2xl flex items-center justify-center shadow-inner">
										<Inbox className="h-4 w-4 sm:h-6 sm:w-6" />
									</div>
								</div>
							</Card>
							<Card className="p-4 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border-slate-100 shadow-sm flex flex-col justify-between hover:border-indigo-100 transition-colors">
								<p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 sm:mb-6">
									{tSessions("tabs.archived")}
								</p>
								<div className="flex items-end justify-between">
									<span className="text-2xl sm:text-4xl font-black text-slate-400 font-sans tracking-tight">
										{archivedSessions.length}
									</span>
									<div className="h-8 w-8 sm:h-12 sm:w-12 bg-slate-50 text-slate-400 rounded-lg sm:rounded-2xl flex items-center justify-center">
										<Archive className="h-4 w-4 sm:h-6 sm:w-6" />
									</div>
								</div>
							</Card>
							<Card className="p-4 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border-slate-100 shadow-sm flex flex-col justify-between hover:border-indigo-100 transition-colors col-span-2 lg:col-span-1">
								<p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 sm:mb-6">
									إجمالي الوقت
								</p>
								<div className="flex items-end justify-between">
									<span className="text-2xl sm:text-4xl font-black text-slate-900 font-sans">
										∞
									</span>
									<div className="h-8 w-8 sm:h-12 sm:w-12 bg-emerald-50 text-emerald-600 rounded-lg sm:rounded-2xl flex items-center justify-center rotate-3">
										<Clock className="h-4 w-4 sm:h-6 sm:w-6" />
									</div>
								</div>
							</Card>
						</section>

						<Tabs defaultValue="active" className="w-full flex flex-col gap-6 sm:gap-10">
							<div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
								<TabsList className="bg-slate-50 p-1 rounded-xl h-12 w-fit border border-slate-100 shadow-sm">
									<TabsTrigger
										value="active"
										className="px-6 h-10 rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md font-black transition-all text-xs"
									>
										{tSessions("tabs.active")} ({activeSessions.length})
									</TabsTrigger>
									<TabsTrigger
										value="archived"
										className="px-6 h-10 rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-600 data-[state=active]:shadow-md font-black transition-all text-xs"
									>
										{tSessions("tabs.archived")} ({archivedSessions.length})
									</TabsTrigger>
								</TabsList>

								<div className="relative w-full md:w-96 group">
									<Input
										placeholder={tSessions("searchPlaceholder")}
										value={sessionsSearch}
										onChange={(e) => setSessionsSearch(e.target.value)}
										className="ps-10 h-12 bg-white border-slate-100 rounded-xl text-sm font-bold shadow-sm focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition-all"
									/>
									<Search className="absolute inset-y-0 start-3 my-auto h-4 w-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
								</div>
							</div>

							<TabsContent value="active" className="mt-0 outline-none">
								{loadingSessions ? (
									<LoadingState />
								) : activeSessions.length > 0 ? (
										<div className="space-y-4 pb-12">
											{activeSessions.map((s) => (
												<SessionListRow
													key={s.id}
													session={s}
													isActive={true}
													getTagLabel={getTagLabel}
													dateLocale={dateLocale}
													updateStatus={updateSessionStatus}
												/>
											))}
										</div>
								) : (
									<EmptyState
										icon={Inbox}
										title={tSessions("noActive")}
										desc={tSessions("noActiveDesc")}
									/>
								)}
							</TabsContent>

							<TabsContent value="archived" className="mt-0 outline-none">
								{loadingSessions ? (
									<LoadingState />
								) : archivedSessions.length > 0 ? (
										<div className="space-y-4 pb-12">
											{archivedSessions.map((s) => (
												<SessionListRow
													key={s.id}
													session={s}
													isActive={false}
													getTagLabel={getTagLabel}
													dateLocale={dateLocale}
													updateStatus={updateSessionStatus}
												/>
											))}
										</div>
								) : (
									<EmptyState
										icon={Archive}
										title={tSessions("noArchived")}
										desc={tSessions("noArchivedDesc")}
									/>
								)}
							</TabsContent>
						</Tabs>
					</TabsContent>

					{/* Documents Content */}
					<TabsContent value="docs" className="mt-0 outline-none space-y-12">
						<section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
							<Card className="p-8 rounded-[2rem] border-slate-100 shadow-sm flex flex-col justify-between hover:border-indigo-100 transition-colors">
								<p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">
									إجمالي المستندات
								</p>
								<div className="flex items-end justify-between">
									<span className="text-4xl font-black text-slate-900 font-sans tracking-tight">
										{documents.length}
									</span>
									<div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
										<FileText className="h-6 w-6" />
									</div>
								</div>
							</Card>
							<Card className="p-8 rounded-[2rem] border-slate-100 shadow-sm flex flex-col justify-between hover:border-indigo-100 transition-colors">
								<p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">
									التحليلات القانونية
								</p>
								<div className="flex items-end justify-between">
									<span className="text-4xl font-black text-emerald-600 font-sans tracking-tight">
										{documents.filter((d) => d.doc_type === "Analysis").length}
									</span>
									<div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100/50">
										<Scale className="h-6 w-6" />
									</div>
								</div>
							</Card>
							<Card className="p-8 rounded-[2rem] border-slate-100 shadow-sm flex flex-col justify-between hover:border-indigo-100 transition-colors sm:col-span-2 lg:col-span-1">
								<p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">
									الأبحاث والمذكرات
								</p>
								<div className="flex items-end justify-between">
									<span className="text-4xl font-black text-amber-600 font-sans tracking-tight">
										{
											documents.filter(
												(d) =>
													d.doc_type === "Research" ||
													d.doc_type === "Pleading",
											).length
										}
									</span>
									<div className="h-12 w-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center transform hover:rotate-6 transition-transform">
										<Search className="h-6 w-6" />
									</div>
								</div>
							</Card>
						</section>

						<Tabs
							value={docsActiveStatus}
							onValueChange={setDocsActiveStatus}
							className="w-full flex flex-col gap-10"
						>
							<div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6">
								<TabsList className="bg-slate-50 p-2 rounded-2xl h-16 w-fit border border-slate-100 shadow-sm">
									<TabsTrigger
										value="Open"
										className="px-8 h-12 rounded-xl data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md font-black transition-all"
									>
										{locale === "ar" ? "المستندات النشطة" : "Active Docs"}
									</TabsTrigger>
									<TabsTrigger
										value="Archived"
										className="px-8 h-12 rounded-xl data-[state=active]:bg-white data-[state=active]:text-slate-600 data-[state=active]:shadow-md font-black transition-all"
									>
										{locale === "ar" ? "الأرشيف" : "Archive"}
									</TabsTrigger>
								</TabsList>

								<div className="relative w-full md:w-96 group">
									<Input
										placeholder={
											locale === "ar"
												? "ابحث في المستندات..."
												: "Search documents..."
										}
										value={docsSearch}
										onChange={(e) => setDocsSearch(e.target.value)}
										className="ps-10 h-12 bg-white border-slate-100 rounded-xl text-sm font-bold shadow-sm focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition-all"
									/>
									<Search className="absolute inset-y-0 start-3 my-auto h-4 w-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
								</div>
							</div>

							{!loadingDocs && documents.length > 0 && (
								<div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar">
									{[
										"all",
										"Analysis",
										"Research",
										"Pleading",
										"Contract",
										"Draft",
									].map((type) => (
										<Button
											key={type}
											variant="ghost"
											size="sm"
											className={cn(
												"h-9 px-4 rounded-xl font-bold transition-all whitespace-nowrap border text-xs",
												docsFilterType === type
													? "bg-slate-900 text-white border-slate-900 shadow-md"
													: "text-slate-500 border-slate-100 hover:bg-slate-50",
											)}
											onClick={() => setDocsFilterType(type)}
										>
											{type === "all"
												? locale === "ar"
													? "الكل"
													: "All"
												: type}
										</Button>
									))}
									<div className="ms-auto">
										<Button
											variant="ghost"
											size="sm"
											className="h-9 px-3 text-slate-400 font-bold hover:bg-slate-50 gap-1 rounded-xl text-xs"
											onClick={() =>
												setDocsSortOrder((o) => (o === "desc" ? "asc" : "desc"))
											}
										>
											<ArrowUpDown className="h-3 w-3" />
											{docsSortOrder === "desc"
												? locale === "ar"
													? "الأحدث"
													: "Newest"
												: locale === "ar"
													? "الأقدم"
													: "Oldest"}
										</Button>
									</div>
								</div>
							)}

							<TabsContent value="Open" className="mt-0 outline-none">
								{loadingDocs ? (
									<LoadingState />
								) : filteredDocs.length > 0 ? (
										<div className="space-y-4 pb-12">
											{filteredDocs.map((doc) => (
												<DocumentLink
													key={doc.id}
													id={doc.id}
													title={doc.title}
													docType={doc.doc_type}
													createdAt={doc.created_at}
													sessionId={doc.case_project_id || ""}
													variant="sidebar"
													status="Open"
													preview={doc.preview}
													onUpdated={() => fetchDocs(docsActiveStatus)}
													onDeleted={() => fetchDocs(docsActiveStatus)}
												/>
											))}
										</div>
								) : (
									<EmptyState
										icon={FolderOpen}
										title="لا توجد مستندات نشطة"
										desc="ابدأ العمل على جلسة لتوليد مستندات."
									/>
								)}
							</TabsContent>

							<TabsContent value="Archived" className="mt-0 outline-none">
								{loadingDocs ? (
									<LoadingState />
								) : filteredDocs.length > 0 ? (
										<div className="space-y-4 pb-12">
											{filteredDocs.map((doc) => (
												<DocumentLink
													key={doc.id}
													id={doc.id}
													title={doc.title}
													docType={doc.doc_type}
													createdAt={doc.created_at}
													sessionId={doc.case_project_id || ""}
													variant="sidebar"
													status="Archived"
													preview={doc.preview}
													onUpdated={() => fetchDocs(docsActiveStatus)}
													onDeleted={() => fetchDocs(docsActiveStatus)}
												/>
											))}
										</div>
								) : (
									<EmptyState
										icon={Archive}
										title="الأرشيف فارغ"
										desc="المستندات المؤرشفة ستظهر هنا."
									/>
								)}
							</TabsContent>
						</Tabs>
					</TabsContent>

					{/* Clients Content */}
					<TabsContent value="clients" className="mt-0 outline-none space-y-8">
						<div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6">
							<h2 className="text-2xl font-black text-slate-900">
								{locale === "ar" ? "قائمة الموكلين" : "Client List"}
							</h2>
							<div className="relative w-full md:w-96 group">
								<Input
									placeholder={
										locale === "ar"
											? "ابحث بالاسم أو الهاتف..."
											: "Search by name or phone..."
									}
									value={clientsSearch}
									onChange={(e) => setClientsSearch(e.target.value)}
									className="ps-10 h-12 bg-white border-slate-100 rounded-xl text-sm font-bold shadow-sm focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition-all"
								/>
								<Search className="absolute inset-y-0 start-3 my-auto h-4 w-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
							</div>
						</div>

						{loadingClients ? (
							<LoadingState />
						) : filteredClients.length > 0 ? (
							<div className="space-y-4 pb-12">
								{filteredClients.map((client) => (
									<ClientListRow
										key={client.id}
										client={client}
										dateLocale={dateLocale}
										onClick={() => {
											setSelectedClient(client);
											setEditClientOpen(true);
										}}
									/>
								))}
							</div>
						) : (
							<EmptyState
								icon={User}
								title="لا يوجد موكلين"
								desc="لم يتم العثور على أي موكلين مسجلين."
							/>
						)}
					</TabsContent>

					{/* Cases Content */}
					<TabsContent value="cases" className="mt-0 outline-none space-y-8">
						<div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6">
							<h2 className="text-2xl font-black text-slate-900">
								{locale === "ar" ? "سجل القضايا" : "Case History"}
							</h2>
							<div className="relative w-full md:w-96 group">
								<Input
									placeholder={
										locale === "ar"
											? "ابحث بالعنوان أو الرقم..."
											: "Search by title or number..."
									}
									value={casesSearch}
									onChange={(e) => setCasesSearch(e.target.value)}
									className="ps-10 h-12 bg-white border-slate-100 rounded-xl text-sm font-bold shadow-sm focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition-all"
								/>
								<Search className="absolute inset-y-0 start-3 my-auto h-4 w-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
							</div>
						</div>

						{loadingCases ? (
							<LoadingState />
						) : filteredCases.length > 0 ? (
							<div className="space-y-4 pb-12">
								{filteredCases.map((caseItem) => (
									<CaseListRow
										key={caseItem.id}
										caseItem={caseItem}
										dateLocale={dateLocale}
										locale={locale}
										onClick={() => {
											setSelectedCase(caseItem);
											setEditCaseOpen(true);
										}}
									/>
								))}
							</div>
						) : (
							<EmptyState
								icon={Briefcase}
								title="لا توجد قضايا"
								desc="لم يتم العثور على أي قضايا مسجلة."
							/>
						)}
					</TabsContent>
				</Tabs>
			</div>

			{/* Modals */}
			<EditClientModal
				open={editClientOpen}
				onOpenChange={setEditClientOpen}
				client={selectedClient}
				onSuccess={fetchClients}
			/>
			<EditCaseModal
				open={editCaseOpen}
				onOpenChange={setEditCaseOpen}
				caseData={selectedCase ? { ...selectedCase, id: Number(selectedCase.id) } : null}
				onSuccess={fetchCases}
			/>
		</main>
	);
}
