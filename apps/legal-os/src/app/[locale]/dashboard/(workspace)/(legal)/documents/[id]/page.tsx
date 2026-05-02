"use client";

import { useState, useEffect, useLayoutEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	ArrowRight,
	Edit3,
	Eye,
	Save,
	Loader2,
	FileDown,
	Trash2,
} from "lucide-react";
import TipTapEditor from "@/components/global/TipTapEditor";

// Reuse from documents list page — shared config
const DOC_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
	analysis: { label: "تحليل قانوني", color: "bg-indigo-100 text-indigo-700" },
	pleading: {
		label: "صياغة قانونية",
		color: "bg-emerald-100 text-emerald-700",
	},
	contract: { label: "عقد", color: "bg-violet-100 text-violet-700" },
	draft: { label: "مسودة", color: "bg-amber-100 text-amber-700" },
	memo: { label: "مذكرة", color: "bg-amber-100 text-amber-700" },
};

interface DocumentData {
	id: string;
	title: string;
	content: string;
	doc_type: string;
	source_text: string;
	created_at: string;
	updated_at: string;
}

export default function DocumentViewPage({
	params,
}: { params: Promise<{ id: string }> }) {
	const { id } = use(params);
	const router = useRouter();
	const searchParams = useSearchParams();
	const [doc, setDoc] = useState<DocumentData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isEditing, setIsEditing] = useState(
		searchParams.get("edit") === "true",
	);
	const [isSaving, setIsSaving] = useState(false);
	const [editTitle, setEditTitle] = useState("");
	const [editContent, setEditContent] = useState("");
	const [confirmingDelete, setConfirmingDelete] = useState(false);

	useEffect(() => {
		const fetchDoc = async () => {
			try {
				const res = await fetch(`/api/legal/documents/${id}`);
				const data = await res.json();
				if (data.error) throw new Error(data.error);

				// Redirect to session hub if document belongs to a case
				const caseProjectId =
					data.document.caseProjectId || data.document.case_project_id;
				if (caseProjectId) {
					router.replace(`/dashboard/sessions/${caseProjectId}?docId=${id}`);
					return;
				}

				setDoc(data.document);
				setEditTitle(data.document.title);
				setEditContent(data.document.content);
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : "خطأ غير معروف";
				toast.error(`فشل تحميل المستند: ${errorMessage}`);
			} finally {
				setIsLoading(false);
			}
		};
		fetchDoc();
	}, [id, router]);

	// Preserve scroll when toggling edit mode
	useLayoutEffect(() => {
		if (doc) {
			const y = window.scrollY;
			requestAnimationFrame(() => window.scrollTo({ top: y }));
		}
	}, [isEditing, doc]);

	const handleSave = async (html: string) => {
		setIsSaving(true);
		try {
			const res = await fetch(`/api/legal/documents/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title: editTitle, content: html }),
			});
			const data = await res.json();
			if (data.error) throw new Error(data.error);
			setDoc((prev) =>
				prev
					? {
							...prev,
							title: editTitle,
							content: html,
							updated_at: new Date().toISOString(),
						}
					: prev,
			);
			setEditContent(html);
			setIsEditing(false);
			toast.success("تم حفظ التعديلات بنجاح");
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "خطأ غير معروف";
			toast.error(`فشل الحفظ: ${errorMessage}`);
		} finally {
			setIsSaving(false);
		}
	};

	const requestDelete = () => {
		setConfirmingDelete(true);
		setTimeout(() => setConfirmingDelete(false), 3000);
	};

	const handleDelete = async () => {
		setConfirmingDelete(false);
		try {
			await fetch(`/api/legal/documents/${id}`, { method: "DELETE" });
			toast.success("تم حذف المستند");
			router.push("/dashboard/documents");
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "خطأ غير معروف";
			toast.error(`فشل الحذف: ${errorMessage}`);
		}
	};

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center py-20 gap-3">
				<Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
				<p className="text-slate-500">جاري تحميل المستند...</p>
			</div>
		);
	}

	if (!doc) {
		return (
			<div className="container mx-auto p-8 max-w-5xl rtl text-right" dir="rtl">
				<Card className="border-red-200 bg-red-50">
					<CardContent className="p-6 text-red-700 text-center">
						<p className="font-semibold">لم يتم العثور على المستند</p>
						<Button
							onClick={() => router.push("/dashboard/documents")}
							className="mt-4"
							variant="outline"
						>
							<ArrowRight className="h-4 w-4 ml-2" />
							العودة للمستندات
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	const config = DOC_TYPE_CONFIG[doc.doc_type] || DOC_TYPE_CONFIG.analysis;
	const formattedDate = new Date(
		doc.updated_at || doc.created_at,
	).toLocaleDateString("ar-KW", {
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});

	return (
		<div
			className="flex flex-col h-[calc(100vh-85px)] w-full overflow-hidden rtl text-right"
			dir="rtl"
		>
			<div className="flex-1 container mx-auto px-4 md:px-10 max-w-none flex flex-col overflow-hidden py-4 md:py-8">
				{/* Header */}
				<div className="flex items-center justify-between mb-6 animate-in slide-in-from-right-4 fade-in duration-500">
					<div className="flex items-center gap-3">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => router.push("/dashboard/documents")}
							className="text-slate-500 hover:text-slate-700"
						>
							<ArrowRight className="h-4 w-4 ml-1" />
							المستندات
						</Button>
						<span
							className={`text-xs px-2.5 py-1 rounded-full ${config.color}`}
						>
							{config.label}
						</span>
						<span className="text-xs text-slate-400">{formattedDate}</span>
					</div>
					<div className="flex gap-2">
						<Button
							variant={isEditing ? "default" : "outline"}
							size="sm"
							onClick={() => setIsEditing(!isEditing)}
							className={
								isEditing
									? "bg-indigo-600 hover:bg-indigo-700"
									: "border-indigo-200 text-indigo-600"
							}
						>
							{isEditing ? (
								<>
									<Eye className="h-4 w-4 ml-1" /> عرض
								</>
							) : (
								<>
									<Edit3 className="h-4 w-4 ml-1" /> تحرير
								</>
							)}
						</Button>
						{confirmingDelete ? (
							<>
								<Button
									size="sm"
									className="bg-red-600 hover:bg-red-700 text-white text-xs animate-in fade-in duration-200"
									onClick={handleDelete}
								>
									تأكيد الحذف
								</Button>
								<Button
									size="sm"
									variant="ghost"
									className="text-slate-500 text-xs"
									onClick={() => setConfirmingDelete(false)}
								>
									إلغاء
								</Button>
							</>
						) : (
							<Button
								variant="outline"
								size="sm"
								className="text-red-500 border-red-200 hover:bg-red-50"
								onClick={requestDelete}
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						)}
					</div>
				</div>

				{/* Title — editable in edit mode */}
				{isEditing ? (
					<Input
						value={editTitle}
						onChange={(e) => setEditTitle(e.target.value)}
						className="text-2xl font-bold mb-4 h-auto py-3 border-indigo-200"
						dir="rtl"
					/>
				) : (
					<h1 className="text-2xl font-bold text-slate-900 mb-4">
						{doc.title}
					</h1>
				)}

				{/* Content Area - Filling remaining space */}
				<Card className="flex-1 border-slate-200 shadow-sm overflow-hidden flex flex-col mt-4">
					<CardContent className="flex-1 p-0 overflow-hidden">
						{isEditing ? (
							<div className="h-full p-4">
								<TipTapEditor
									content={editContent}
									caseId={doc.id}
									onSave={handleSave}
								/>
							</div>
						) : (
							<div className="h-full p-4">
								<TipTapEditor content={doc.content} caseId={doc.id} readOnly />
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
