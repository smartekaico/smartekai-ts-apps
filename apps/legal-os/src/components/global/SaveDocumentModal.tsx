"use client";

import { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	FolderPlus,
	Search,
	ChevronLeft,
	Check,
	Loader2,
	FileQuestion,
	FolderOpen,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface Session {
	id: string;
	title: string;
	tag: string | null;
	createdAt: string;
}

interface SaveDocumentModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (projectId: string | null) => Promise<void>;
	title: string;
}

export function SaveDocumentModal({
	isOpen,
	onClose,
	onSave,
	title,
}: SaveDocumentModalProps) {
	const router = useRouter();
	const [sessions, setSessions] = useState<Session[]>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState<string | null>(null); // State for different save types

	// Fetch projects from API
	useEffect(() => {
		if (isOpen) {
			setIsLoading(true);
			fetch("/api/legal/sessions")
				.then((res) => res.json())
				.then((data) => {
					if (Array.isArray(data)) setSessions(data);
					else console.error("Invalid sessions data:", data);
				})
				.catch((err) => console.error("Fetch sessions error:", err))
				.finally(() => setIsLoading(false));
		}
	}, [isOpen]);

	const filteredSessions = sessions.filter((p) =>
		p.title.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	const handleSaveToProject = async (projectId: string) => {
		setIsSaving(projectId);
		try {
			await onSave(projectId);
		} catch (err) {
			console.error("Save to project error:", err);
		} finally {
			setIsSaving(null);
		}
	};

	const handleSaveUnassigned = async () => {
		setIsSaving("unassigned");
		try {
			await onSave(null);
		} catch (err) {
			console.error("Save unassigned error:", err);
		} finally {
			setIsSaving(null);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent
				className="sm:max-w-[480px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl animate-in zoom-in-95 duration-300"
				dir="rtl"
			>
				<DialogHeader className="p-6 bg-slate-900 text-white relative">
					<DialogTitle className="text-xl font-black flex items-center gap-2">
						<FolderPlus className="h-5 w-5 text-indigo-400" />
						أين تريد حفظ هذا المستند؟
					</DialogTitle>
					<DialogDescription className="text-slate-400 text-xs font-medium mt-1">
						"{title}"
					</DialogDescription>
				</DialogHeader>

				<div className="p-6 space-y-6 bg-white">
					{/* Options Section */}
					<div className="grid grid-cols-1 gap-3">
						<button
							onClick={handleSaveUnassigned}
							disabled={isSaving !== null}
							className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-slate-50 transition-all text-right group"
						>
							<div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
								{isSaving === "unassigned" ? (
									<Loader2 className="h-5 w-5 animate-spin" />
								) : (
									<FileQuestion className="h-5 w-5" />
								)}
							</div>
							<div className="flex-1">
								<p className="font-bold text-slate-900 text-sm">
									حفظ كمسودة غير مرتبطة بجلسة
								</p>
								<p className="text-[10px] text-slate-500 font-medium">
									سيتم حفظ الملف في قائمة "قاعدة المعرفة"
								</p>
							</div>
							<ChevronLeft className="h-4 w-4 text-slate-300 group-hover:text-indigo-400 transition-transform group-hover:-translate-x-1" />
						</button>
					</div>

					<div className="relative">
						<div className="absolute inset-x-0 top-1/2 h-px bg-slate-100 -z-10" />
						<span className="bg-white px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mx-auto block w-fit">
							أو اختر جلسة عمل موجودة
						</span>
					</div>

					{/* Search bar */}
					<div className="relative">
						<Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
						<Input
							type="text"
							placeholder="ابحث عن اسم الجلسة أو الموكل..."
							className="pr-10 bg-slate-50 border-slate-100 h-11 rounded-xl focus:ring-indigo-500"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>

					{/* Sessions List */}
					<ScrollArea className="h-[200px] pr-2">
						<div className="space-y-2">
							{isLoading ? (
								<div className="flex flex-col items-center justify-center py-10 gap-2 opacity-50">
									<Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
									<p className="text-xs font-bold text-slate-400">
										جاري تحميل الجلسات...
									</p>
								</div>
							) : filteredSessions.length === 0 ? (
								<div className="text-center py-10 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
									<FolderOpen className="h-8 w-8 text-slate-200 mx-auto mb-2" />
									<p className="text-xs text-slate-400 font-medium">
										لا توجد نتائج مطابقة لبحثك.
									</p>
								</div>
							) : (
								filteredSessions.map((p: Session) => (
									<button
										key={p.id}
										onClick={() => handleSaveToProject(p.id)}
										disabled={isSaving !== null}
										className={cn(
											"w-full text-right p-3 rounded-xl border border-slate-50 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all flex items-center gap-3 group px-4",
											isSaving === p.id && "bg-indigo-50 border-indigo-200",
										)}
									>
										<div className="h-8 w-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-100 shadow-sm transition-all">
											{isSaving === p.id ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : (
												<FolderOpen className="h-4 w-4" />
											)}
										</div>
										<div className="flex-1 overflow-hidden">
											<p className="font-bold text-slate-900 text-xs truncate">
												{p.title}
											</p>
											<p className="text-[10px] text-slate-500 font-medium">
												{p.tag || "جلسة عامة"}
											</p>
										</div>
										<ChevronLeft className="h-3 w-3 text-slate-300 group-hover:text-indigo-400 transition-transform group-hover:-translate-x-1" />
									</button>
								))
							)}
						</div>
					</ScrollArea>
				</div>

				<DialogFooter className="p-4 bg-slate-50 flex flex-row border-t items-center justify-between gap-4">
					{/* Future: Add "Create New Session" link here */}
					<Button
						variant="ghost"
						className="text-xs font-bold text-slate-500 hover:text-indigo-600 rounded-xl"
						onClick={onClose}
					>
						إلغاء التغييرات
					</Button>
					<Button
						variant="outline"
						className="text-xs font-bold border-indigo-100 text-indigo-600 hover:bg-indigo-50 rounded-xl"
						onClick={() => router.push("/dashboard/sessions")}
					>
						بدء جلسة عمل جديدة
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
