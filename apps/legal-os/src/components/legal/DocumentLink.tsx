"use client";

import { Link } from "@/i18n/routing";
import {
	FileText,
	Scale,
	ChevronRight,
	Edit3,
	Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";

interface DocumentLinkProps {
	id: string;
	title: string;
	docType?: string | null;
	categoryId?: string | null;
	categories?: any[];
	createdAt?: string | Date | null;
	sessionId?: string | null;
	isActive?: boolean;
	isCollapsed?: boolean;
	variant?: "sidebar" | "workspace";
	preview?: string | null;
	status?: "Open" | "Archived" | string | null;
	onDeleted?: () => void;
	onUpdated?: () => void;
}
export function DocumentLink({
	id,
	title,
	docType,
	createdAt,
	sessionId,
	isActive = false,
	isCollapsed = false,
	variant = "sidebar",
	preview,
	status = "Open",
	onDeleted,
	onUpdated,
}: DocumentLinkProps) {
	const locale = useLocale();
	const t = useTranslations("Workspace");
	const dateLocale = locale === "ar" ? ar : enUS;
	const [isUpdating, setIsUpdating] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [editedTitle, setEditedTitle] = useState(title);
	const router = useRouter();

	const handleUpdate = async (updates: {
		title?: string;
		categoryId?: string | null;
	}) => {
		try {
			setIsUpdating(true);
			const res = await fetch(`/api/legal/documents/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(updates),
			});
			if (res.ok) {
				onUpdated?.();
				if (updates.title) setIsEditing(false);
				toast.success(locale === "ar" ? "تم التحديث" : "Updated successfully");
			} else {
				throw new Error("Update failed");
			}
		} catch (err) {
			toast.error(locale === "ar" ? "فشل التحديث" : "Update failed");
			setEditedTitle(title); // Revert
		} finally {
			setIsUpdating(false);
		}
	};

	const handleTitleSubmit = () => {
		if (editedTitle.trim() === "") {
			setEditedTitle(title);
			setIsEditing(false);
			return;
		}
		if (editedTitle !== title) {
			handleUpdate({ title: editedTitle });
		} else {
			setIsEditing(false);
		}
	};


	const href = sessionId
		? `/dashboard/sessions/${sessionId}?docId=${id}`
		: `/dashboard/documents/${id}?edit=true`;

	if (variant === "sidebar") {
		return (
			<>
				<div
					className={cn(
						"group/container flex flex-col gap-1 p-1 rounded-xl transition-all min-w-0 w-full",
						isActive && "bg-slate-50 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]",
					)}
				>
					<div className="flex items-center gap-2 min-w-0">
						<div className="flex-1 flex items-center gap-1 group/item relative min-w-0">
							{isEditing ? (
								<div
									className={cn(
										"flex-1 flex items-center gap-2.5 text-[13px] lg:text-[14px] font-bold py-2 ps-3 rounded-lg bg-white border border-indigo-200 shadow-sm min-w-0",
										isCollapsed ? "justify-center px-0" : "",
									)}
								>
									<div className="h-4 w-4 shrink-0 text-indigo-500">
										<Loader2 className="h-full w-full animate-spin" />
									</div>
									<input
										value={editedTitle}
										onChange={(e) => setEditedTitle(e.target.value)}
										onBlur={handleTitleSubmit}
										onKeyDown={(e) => {
											if (e.key === "Enter") handleTitleSubmit();
											if (e.key === "Escape") {
												setEditedTitle(title);
												setIsEditing(false);
											}
										}}
										className="flex-1 bg-transparent text-slate-900 border-none outline-none text-[13px] font-bold leading-tight"
										onClick={(e) => e.stopPropagation()}
									/>
								</div>
							) : (
								<div
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										router.push(href);
									}}
									onDoubleClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										setIsEditing(true);
									}}
									className={cn(
										"flex-1 flex items-center gap-2 text-[12px] lg:text-[13px] font-bold py-0.5 ps-2 rounded-lg transition-all min-w-0 cursor-pointer select-none",
										isActive
											? "bg-slate-100 text-slate-900 border border-slate-200"
											: "text-slate-800 hover:text-slate-900 hover:bg-slate-50",
										isCollapsed ? "justify-center px-0" : "",
									)}
								>
									<div
										className={cn(
											"h-4 w-4 shrink-0 transition-colors flex items-center justify-center",
											isActive ? "text-indigo-600" : "text-slate-400",
										)}
									>
										{isUpdating ? (
											<Loader2 className="h-full w-full animate-spin" />
										) : docType === "Analysis" ? (
											<Scale className="h-full w-full" />
										) : (
											<FileText className="h-full w-full" />
										)}
									</div>

									{!isCollapsed && (
										<span
											className={cn(
												"truncate flex-1 leading-tight py-1",
												isActive ? "text-slate-900" : "text-slate-800",
											)}
											title={
												locale === "ar"
													? "انقر للتعديل (مرتين)"
													: "Double-click to edit"
											}
										>
											{title}
										</span>
									)}
								</div>
							)}
						</div>
					</div>
				</div>
			</>
		);
	}

	// Workspace Variant (Used in SessionHome)
	return (
		<div
			className={cn(
				"group bg-white p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer select-none",
				isActive
					? "border-indigo-200 bg-slate-50 shadow-sm"
					: "border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100",
			)}
			onClick={(e) => {
				if (!isEditing) {
					router.push(href);
				}
			}}
		>
			{isEditing ? (
				<div
					className="flex-1 flex items-center gap-3"
					onClick={(e) => e.stopPropagation()}
				>
					<div
						className={cn(
							"h-9 w-9 rounded-xl flex items-center justify-center bg-indigo-50 text-indigo-600 shadow-sm",
							isActive && "bg-indigo-600 text-white",
						)}
					>
						<Loader2 className="h-5 w-5 animate-spin" />
					</div>
					<div className="flex-1">
						<input
							value={editedTitle}
							onChange={(e) => setEditedTitle(e.target.value)}
							onBlur={handleTitleSubmit}
							onKeyDown={(e) => {
								if (e.key === "Enter") handleTitleSubmit();
								if (e.key === "Escape") {
									setEditedTitle(title);
									setIsEditing(false);
								}
							}}
							className="bg-white text-slate-900 border border-indigo-200 px-3 py-1.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none w-full font-bold text-sm"
						/>
					</div>
				</div>
			) : (
				<div className="flex-1 flex items-center gap-3 min-w-0 group/doc">
					<div
						className={cn(
							"h-9 w-9 rounded-xl flex items-center justify-center transition-all shrink-0",
							docType === "Analysis"
								? "bg-rose-50 text-rose-600 hover:bg-rose-100"
								: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100",
							isActive && "bg-indigo-600 text-white",
						)}
					>
						{docType === "Analysis" ? (
							<Scale className="h-5 w-5" />
						) : (
							<FileText className="h-5 w-5" />
						)}
					</div>
					<div className="flex-1 min-w-0 text-right">
						<h4
							onDoubleClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								setIsEditing(true);
							}}
							className={cn(
								"font-bold text-[13px] transition-colors uppercase tracking-tight truncate py-0.5",
								isActive ? "text-indigo-600" : "text-slate-900",
							)}
							title={
								locale === "ar"
									? "انقر للتعديل (مرتين)"
									: "Double-click to edit"
							}
						>
							{title}
						</h4>
						<div className="flex items-center gap-2 mt-0.5">
							{preview && (
								<p className="text-[10px] text-slate-500 line-clamp-1 opacity-80 flex-1">
									{preview.replace(/<[^>]*>/g, " ").substring(0, 100)}
								</p>
							)}
							<button
								onClick={(e) => {
									e.stopPropagation();
									setIsEditing(true);
								}}
								className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white rounded text-slate-400 hover:text-indigo-600"
							>
								<Edit3 className="h-3 w-3" />
							</button>
						</div>
						{createdAt && (
							<p className="text-[9px] text-slate-400 font-bold mt-0.5">
								{docType === "Analysis"
									? t("home.docTypes.Analysis")
									: t("home.docTypes.LegalDoc")}{" "}
								•{" "}
								{format(new Date(createdAt), "dd MMMM yyyy", {
									locale: dateLocale,
								})}
							</p>
						)}
					</div>
				</div>
			)}

			<div className="flex items-center gap-2 ms-4">
				<div
					onClick={(e) => {
						e.stopPropagation();
						router.push(href);
					}}
					className={cn(
						"h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center transition-all",
						isActive
							? "bg-indigo-50 text-indigo-600"
							: "group-hover:bg-indigo-50 group-hover:text-indigo-600",
					)}
				>
					<ChevronRight className="h-4 w-4 rtl:rotate-180" />
				</div>
			</div>
		</div>
	);
}
