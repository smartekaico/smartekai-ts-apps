"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
	Plus,
	Loader2,
	User,
	Briefcase,
	Play,
	X,
	UserPlus,
	FolderPlus,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import posthog from "posthog-js";

interface Client {
	id: string;
	fullName: string;
}

interface Case {
	id: number;
	title: string;
	status?: string;
}

export function CreateSessionModal({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const router = useRouter();
	const t = useTranslations("Sessions");
	const commonT = useTranslations("Common");
	const currentLocale = useLocale();

	const [loading, setLoading] = useState(false);
	const [clients, setClients] = useState<Client[]>([]);
	const [cases, setCases] = useState<Case[]>([]);
	const [loadingClients, setLoadingClients] = useState(false);
	const [loadingCases, setLoadingCases] = useState(false);

	// Form State
	const [title, setTitle] = useState("");
	const [clientId, setClientId] = useState<string>("");
	const [caseId, setCaseId] = useState<string>("");

	// Creation state
	const [isNewClient, setIsNewClient] = useState(false);
	const [newClientName, setNewClientName] = useState("");
	const [newClientPhone, setNewClientPhone] = useState("");
	const [newClientCivilId, setNewClientCivilId] = useState("");

	const [isNewCase, setIsNewCase] = useState(false);
	const [newCaseTitle, setNewCaseTitle] = useState("");
	const [newCaseNumber, setNewCaseNumber] = useState("");

	useEffect(() => {
		if (open) {
			fetchClients();
			// Reset form on open
			setTitle("");
			setClientId("");
			setCaseId("");
			setIsNewClient(false);
			setIsNewCase(false);
			setNewClientName("");
			setNewClientPhone("");
			setNewClientCivilId("");
			setNewCaseTitle("");
			setNewCaseNumber("");
		}
	}, [open]);

	useEffect(() => {
		if (clientId && !isNewClient) {
			fetchCases(clientId);
		} else {
			setCases([]);
			setCaseId("");
		}
	}, [clientId, isNewClient]);

	const fetchClients = async () => {
		setLoadingClients(true);
		try {
			const res = await fetch("/api/legal/clients");
			if (res.ok) {
				const data = await res.json();
				setClients(data);
			}
		} catch (error) {
			console.error("Failed to fetch clients", error);
		} finally {
			setLoadingClients(false);
		}
	};

	const fetchCases = async (cid: string) => {
		setLoadingCases(true);
		try {
			const res = await fetch(`/api/legal/cases?clientId=${cid}`);
			if (res.ok) {
				const data = await res.json();
				setCases(data);
			}
		} catch (error) {
			console.error("Failed to fetch cases", error);
		} finally {
			setLoadingCases(false);
		}
	};

	const handleStartSession = async () => {
		if (!title) {
			toast.error("يرجى إدخال اسم الجلسة");
			return;
		}

		setLoading(true);
		try {
			let finalClientId = clientId;
			let finalCaseId = caseId;

			// 1. Handle New Client Creation
			if (isNewClient && newClientName) {
				const clientRes = await fetch("/api/legal/clients", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						fullName: newClientName,
						phone: newClientPhone || null,
						civilId: newClientCivilId || null,
					}),
				});
				if (clientRes.ok) {
					const newClient = await clientRes.json();
					finalClientId = newClient.id;
				} else {
					throw new Error("Failed to create client");
				}
			}

			// 2. Handle New Case Creation
			if (isNewCase && newCaseTitle && finalClientId) {
				const caseRes = await fetch("/api/legal/cases", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						title: newCaseTitle,
						clientId: finalClientId,
						caseNumber: newCaseNumber || null,
					}),
				});
				if (caseRes.ok) {
					const newCase = await caseRes.json();
					finalCaseId = newCase.id.toString();
				} else {
					throw new Error("Failed to create case");
				}
			}

			// 3. Create Session
			const res = await fetch("/api/legal/sessions", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title,
					caseId: finalCaseId || null,
				}),
			});

			if (res.ok) {
				const newSession = await res.json();

				posthog.capture("session_created_with_hierarchy", {
					sessionId: newSession.id,
					clientId: finalClientId,
					caseId: finalCaseId,
				});

				toast.success("تم بدء الجلسة بنجاح");
				onOpenChange(false);
				router.push(`/dashboard/sessions/${newSession.id}?view=chat`);
			} else {
				const error = await res.json();
				toast.error(error.error || "فشل في بدء الجلسة");
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "حدث خطأ غير متوقع");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="sm:max-w-[550px] p-0 overflow-hidden border-none shadow-2xl rounded-[32px] bg-white/95 backdrop-blur-xl transition-all rtl"
				dir="rtl"
			>
				<div className="h-2 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 animate-gradient-x" />

				<div className="p-8">
					<DialogHeader className="text-right mb-8">
						<DialogTitle className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
							<div className="h-10 w-10 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-100">
								<Play className="h-5 w-5 fill-current" />
							</div>
							بدء جلسة عمل جديدة
						</DialogTitle>
						<DialogDescription className="text-slate-500 font-medium mt-2">
							حدد سياق العمل للبدء فوراً في الصياغة والتحليل القانوني.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-6">
						{/* Session Title */}
						<div className="space-y-3">
							<Label className="text-right font-black text-[11px] uppercase tracking-widest text-slate-400 px-1">
								اسم الجلسة (مثلاً: دراسة لائحة، صياغة عقد)
							</Label>
							<Input
								placeholder="أدخل اسم الجلسة..."
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								className="rounded-2xl h-14 bg-slate-50/50 border-slate-200 focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 font-bold transition-all px-6"
							/>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{/* Client Selection */}
							<div className="space-y-3">
								<Label className="text-right font-black text-[11px] uppercase tracking-widest text-slate-400 px-1">
									الموكل
								</Label>
								{isNewClient ? (
									<div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
										<div className="relative group">
											<Input
												autoFocus
												placeholder="اسم الموكل الجديد..."
												value={newClientName}
												onChange={(e) => setNewClientName(e.target.value)}
												className="rounded-2xl h-14 bg-emerald-50/50 border-emerald-200 focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 font-bold transition-all ps-6 pe-12"
											/>
											<button
												onClick={() => setIsNewClient(false)}
												className="absolute inset-y-0 end-0 px-4 text-slate-400 hover:text-red-500 transition-colors"
											>
												<X className="h-4 w-4" />
											</button>
										</div>
										<div className="grid grid-cols-2 gap-3">
											<Input
												placeholder="رقم الهاتف (اختياري)"
												value={newClientPhone}
												onChange={(e) => setNewClientPhone(e.target.value)}
												className="rounded-xl h-11 bg-slate-50/50 border-slate-200 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 font-medium text-xs"
											/>
											<Input
												placeholder="الرقم المدني (اختياري)"
												value={newClientCivilId}
												onChange={(e) => setNewClientCivilId(e.target.value)}
												className="rounded-xl h-11 bg-slate-50/50 border-slate-200 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 font-medium text-xs"
											/>
										</div>
									</div>
								) : (
									<div className="flex gap-2">
										<Select
											value={clientId}
											onValueChange={(val) => setClientId(val || "")}
										>
											<SelectTrigger className="flex-1 rounded-2xl h-14 bg-slate-50/50 border-slate-200 font-bold px-6">
												<SelectValue placeholder="اختر موكلاً...">
													{clientId
														? clients.find((c) => c.id === clientId)?.fullName
														: undefined}
												</SelectValue>
											</SelectTrigger>
											<SelectContent
												className="rounded-2xl shadow-xl"
												dir="rtl"
											>
												{loadingClients ? (
													<div className="p-4 text-center">
														<Loader2 className="h-4 w-4 animate-spin text-emerald-600 inline" />
													</div>
												) : clients.length === 0 ? (
													<div className="p-4 text-center text-slate-400 font-medium">
														لا يوجد موكلون
													</div>
												) : (
													clients.map((c) => (
														<SelectItem
															key={c.id}
															value={c.id}
															className="font-bold"
														>
															{c.fullName}
														</SelectItem>
													))
												)}
											</SelectContent>
										</Select>
										<Button
											variant="outline"
											onClick={() => setIsNewClient(true)}
											className="h-14 w-14 rounded-2xl border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 transition-all p-0 flex items-center justify-center shrink-0"
										>
											<UserPlus className="h-5 w-5" />
										</Button>
									</div>
								)}
							</div>

							{/* Case Selection */}
							<div className="space-y-3">
								<Label className="text-right font-black text-[11px] uppercase tracking-widest text-slate-400 px-1">
									القضية / الملف
								</Label>
								{isNewCase ? (
									<div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
										<div className="relative group">
											<Input
												autoFocus
												placeholder="اسم القضية الجديد..."
												value={newCaseTitle}
												onChange={(e) => setNewCaseTitle(e.target.value)}
												className="rounded-2xl h-14 bg-indigo-50/50 border-indigo-200 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 font-bold transition-all ps-6 pe-12"
											/>
											<button
												onClick={() => setIsNewCase(false)}
												className="absolute inset-y-0 end-0 px-4 text-slate-400 hover:text-red-500 transition-colors"
											>
												<X className="h-4 w-4" />
											</button>
										</div>
										<Input
											placeholder="رقم القضية (اختياري)"
											value={newCaseNumber}
											onChange={(e) => setNewCaseNumber(e.target.value)}
											className="rounded-xl h-11 bg-slate-50/50 border-slate-200 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 font-medium text-xs"
										/>
									</div>
								) : (
									<div className="flex gap-2">
										<Select
											value={caseId}
											onValueChange={(val) => setCaseId(val || "")}
											disabled={!clientId && !isNewClient}
										>
											<SelectTrigger className="flex-1 rounded-2xl h-14 bg-slate-50/50 border-slate-200 font-bold px-6">
												<SelectValue
													placeholder={
														!clientId && !isNewClient
															? "اختر الموكل أولاً"
															: "اختر القضية..."
													}
												>
													{caseId
														? cases.find((c) => c.id.toString() === caseId)
																?.title
														: undefined}
												</SelectValue>
											</SelectTrigger>
											<SelectContent
												className="rounded-2xl shadow-xl"
												dir="rtl"
											>
												{loadingCases ? (
													<div className="p-4 text-center">
														<Loader2 className="h-4 w-4 animate-spin text-indigo-600 inline" />
													</div>
												) : cases.length === 0 ? (
													<div className="p-4 text-center text-slate-400 font-medium">
														لا توجد قضايا لهذا الموكل
													</div>
												) : (
													cases.map((c) => (
														<SelectItem
															key={c.id}
															value={c.id.toString()}
															className="font-bold"
														>
															<div className="flex items-center justify-between w-full gap-4">
																<span className="truncate">{c.title}</span>
																{c.status === "Archived" && (
																	<span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter shrink-0 ring-1 ring-slate-200">
																		{currentLocale === "ar"
																			? "مؤرشفة"
																			: "Archived"}
																	</span>
																)}
															</div>
														</SelectItem>
													))
												)}
											</SelectContent>
										</Select>
										<Button
											variant="outline"
											onClick={() => setIsNewCase(true)}
											disabled={!clientId && !isNewClient}
											className="h-14 w-14 rounded-2xl border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all p-0 flex items-center justify-center shrink-0"
										>
											<FolderPlus className="h-5 w-5" />
										</Button>
									</div>
								)}
							</div>
						</div>
					</div>

					<DialogFooter className="mt-10 gap-4 sm:gap-0 flex-row-reverse border-t border-slate-100 pt-8">
						<Button
							onClick={handleStartSession}
							disabled={loading || !title}
							className="flex-1 rounded-2xl h-14 bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-200 font-black text-sm relative overflow-hidden group transition-all"
						>
							<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
							{loading ? (
								<Loader2 className="h-5 w-5 animate-spin" />
							) : (
								"ابدأ جلسة العمل"
							)}
							{!loading && <Play className="h-4 w-4 ms-2 fill-current" />}
						</Button>
						<div className="w-4" />
						<Button
							variant="outline"
							onClick={() => onOpenChange(false)}
							className="flex-1 rounded-2xl h-14 font-black text-sm border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all"
						>
							إلغاء
						</Button>
					</DialogFooter>
				</div>
			</DialogContent>
		</Dialog>
	);
}
