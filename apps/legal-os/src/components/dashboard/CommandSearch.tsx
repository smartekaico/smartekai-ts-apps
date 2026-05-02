"use client";

import React, { useState, useEffect } from "react";
import {
	Search,
	Command as CommandIcon,
	FileText,
	MessageSquare,
	Calendar,
	X,
	Loader2,
	ArrowRight,
} from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface CommandSearchProps {
	isOpen: boolean;
	onClose: () => void;
}

export function CommandSearch({ isOpen, onClose }: CommandSearchProps) {
	const router = useRouter();
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<{
		sessions: any[];
		documents: any[];
	}>({ sessions: [], documents: [] });
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				// Trigger handled by parent state for isOpen
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	useEffect(() => {
		if (!isOpen) {
			setQuery("");
			setResults({ sessions: [], documents: [] });
			return;
		}

		const timer = setTimeout(() => {
			if (query.length > 1) {
				fetchResults();
			} else {
				setResults({ sessions: [], documents: [] });
			}
		}, 300);

		return () => clearTimeout(timer);
	}, [query, isOpen]);

	const fetchResults = async () => {
		setLoading(true);
		try {
			const [sessionsRes, docsRes] = await Promise.all([
				fetch("/api/legal/sessions"),
				fetch("/api/legal/documents"),
			]);

			let sessions = [];
			let docs = [];

			if (sessionsRes.ok) {
				const data = await sessionsRes.json();
				sessions = data
					.filter((s: any) =>
						s.title.toLowerCase().includes(query.toLowerCase()),
					)
					.slice(0, 5);
			}

			if (docsRes.ok) {
				const data = await docsRes.json();
				// Support array or object with documents property
				const docsList = data.documents || data;
				docs = docsList
					.filter((d: any) =>
						d.title.toLowerCase().includes(query.toLowerCase()),
					)
					.slice(0, 8);
			}

			setResults({ sessions, documents: docs });
		} catch (err) {
			console.error("Search fetch error:", err);
		} finally {
			setLoading(false);
		}
	};

	const navigateTo = (path: string) => {
		router.push(path);
		onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-[650px] p-0 overflow-hidden border-slate-200 shadow-2xl rounded-2xl gap-0 top-[20%] translate-y-0">
				<DialogHeader className="p-4 border-b bg-slate-50/50">
					<div className="flex items-center gap-3 px-1">
						<Search className="h-5 w-5 text-slate-400" />
						<input
							placeholder="ابحث عن جلسة عمل، مستند، أو مسودة..."
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							className="flex-1 bg-transparent border-none outline-none text-base placeholder:text-slate-400 font-medium"
						/>
						<div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-black text-slate-400 shadow-sm">
							ESC
						</div>
					</div>
				</DialogHeader>

				<div className="max-h-[450px] overflow-y-auto p-2 custom-scrollbar min-h-[100px]">
					{loading && (
						<div className="flex flex-col items-center justify-center py-12 gap-3">
							<Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
							<p className="text-xs text-slate-400 font-medium">
								جاري البحث في الأرشيف...
							</p>
						</div>
					)}

					{!loading &&
						query.length > 0 &&
						results.sessions.length === 0 &&
						results.documents.length === 0 && (
							<div className="py-12 text-center">
								<p className="text-slate-500 font-medium">
									لا توجد نتائج تطابق "{query}"
								</p>
								<p className="text-xs text-slate-400 mt-1">
									جرب كلمات بحث مختلفة أو ابحث بتصنيف محدد.
								</p>
							</div>
						)}

					{!loading && query.length <= 1 && (
						<div className="py-8 text-center text-slate-400">
							<CommandIcon className="h-8 w-8 mx-auto mb-3 opacity-20" />
							<p className="text-sm font-medium">
								ابدأ الكتابة للبحث في ذكاء المنصة...
							</p>
						</div>
					)}

					{!loading && results.sessions.length > 0 && (
						<div className="mb-4">
							<h3 className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
								جلسات العمل النشطة
							</h3>
							<div className="space-y-1">
								{results.sessions.map((sess) => (
									<button
										key={sess.id}
										onClick={() => navigateTo(`/dashboard/sessions/${sess.id}`)}
										className="w-full text-right flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-all group border border-transparent hover:border-slate-100"
									>
										<div className="flex items-center gap-3">
											<div className="h-9 w-9 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
												<MessageSquare className="h-4 w-4" />
											</div>
											<div className="text-right">
												<p className="font-bold text-sm text-slate-900 line-clamp-1">
													{sess.title}
												</p>
												<p className="text-[10px] text-slate-500 mt-0.5">
													{sess.tag || "جلسة عمل"}
												</p>
											</div>
										</div>
										<ArrowRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 -rotate-180 transition-all" />
									</button>
								))}
							</div>
						</div>
					)}

					{!loading && results.documents.length > 0 && (
						<div>
							<h3 className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
								المستندات والمسودات
							</h3>
							<div className="space-y-1">
								{results.documents.map((doc) => (
									<button
										key={doc.id}
										onClick={() =>
											navigateTo(
												doc.case_project_id
													? `/dashboard/sessions/${doc.case_project_id}?view=doc&docId=${doc.id}`
													: `/dashboard/documents?id=${doc.id}`,
											)
										}
										className="w-full text-right flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-all group border border-transparent hover:border-slate-100"
									>
										<div className="flex items-center gap-3">
											<div className="h-9 w-9 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-indigo-600">
												<FileText className="h-4 w-4" />
											</div>
											<div className="text-right">
												<p className="font-bold text-sm text-slate-900 line-clamp-1">
													{doc.title}
												</p>
												<div className="flex items-center gap-2 mt-0.5">
													<span className="text-[10px] text-slate-400 font-medium">
														{doc.project_title || "مستند خاص"}
													</span>
													<span className="h-1 w-1 rounded-full bg-slate-200" />
													<span className="text-[10px] text-slate-400">
														{format(
															new Date(doc.created_at || new Date()),
															"d MMM yyyy",
															{ locale: ar },
														)}
													</span>
												</div>
											</div>
										</div>
										<ArrowRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 -rotate-180 transition-all" />
									</button>
								))}
							</div>
						</div>
					)}
				</div>

				<div className="p-3 border-t bg-slate-50 flex items-center justify-between text-[10px] text-slate-400 font-medium">
					<div className="flex items-center gap-4">
						<span className="flex items-center gap-1">
							<span className="bg-white border rounded px-1 py-0.5 shadow-sm">
								↵
							</span>{" "}
							اختيار
						</span>
						<span className="flex items-center gap-1">
							<span className="bg-white border rounded px-1 py-0.5 shadow-sm">
								↑↓
							</span>{" "}
							تنقل
						</span>
					</div>
					<div>SmartEkai AI Legal Workspace</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
