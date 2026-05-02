"use client";

import { useState, useEffect, useCallback } from "react";
import {
	ShieldCheck,
	Plus,
	Trash2,
	FolderPlus,
	Globe,
	Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
	addJurisdiction,
	toggleJurisdictionStatus,
	updateJurisdiction,
	deleteJurisdiction,
} from "@/app/[locale]/actions/admin-jurisdictions";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Pencil } from "lucide-react";

interface Jurisdiction {
	id: string;
	code: string;
	nameAr: string;
	nameEn: string;
	isActive: boolean;
}

interface Category {
	id: string;
	slug: string;
	nameAr: string;
	nameEn: string;
	legalDomain: string;
	descriptionAr: string;
}

export function JurisdictionsManager({
	initialJurisdictions,
}: { initialJurisdictions: Jurisdiction[] }) {
	const [jurisdictionsList, setJurisdictionsList] =
		useState<Jurisdiction[]>(initialJurisdictions);
	const [selectedJuri, setSelectedJuri] = useState<Jurisdiction | null>(
		initialJurisdictions[0] || null,
	);

	// Jurisdiction Form
	const [newJuriNameAr, setNewJuriNameAr] = useState("");
	const [newJuriNameEn, setNewJuriNameEn] = useState("");
	const [newJuriCode, setNewJuriCode] = useState("");
	const [isAddingJuri, setIsAddingJuri] = useState(false);
	const [editingJuri, setEditingJuri] = useState<Jurisdiction | null>(null);

	// Modal State
	const [confirmModal, setConfirmModal] = useState<{
		open: boolean;
		type: "Juri" | "Cat";
		id: string;
		title: string;
	}>({ open: false, type: "Juri", id: "", title: "" });

	// Category State
	const [categories, setCategories] = useState<Category[]>([]);
	const [isLoadingCategories, setIsLoadingCategories] = useState(false);
	const [isAddingCategory, setIsAddingCategory] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(
		null,
	);

	// Category Form
	const [catNameAr, setCatNameAr] = useState("");
	const [catNameEn, setCatNameEn] = useState("");
	const [catDomain, setCatDomain] = useState("");
	const [catDesc, setCatDesc] = useState("");
	const [dynamicDomains, setDynamicDomains] = useState<string[]>([]);
	const [isAddingNewDomain, setIsAddingNewDomain] = useState(false);
	const [newDomainName, setNewDomainName] = useState("");

	const loadDomains = useCallback(async () => {
		try {
			const res = await fetch("/api/admin/kb/categories?action=domains");
			if (res.ok) {
				const data = await res.json();
				setDynamicDomains(data);
				if (data.length > 0 && !catDomain) setCatDomain(data[0]);
			}
		} catch (err) {}
	}, [catDomain]);

	const loadCategories = useCallback(async (juriId: string) => {
		setIsLoadingCategories(true);
		try {
			const res = await fetch(
				`/api/admin/kb/categories?jurisdictionId=${juriId}`,
			);
			if (res.ok) {
				const data = await res.json();
				setCategories(data);
			}
		} catch (err) {
			toast.error("فشل في تحميل التصنيفات");
		} finally {
			setIsLoadingCategories(false);
		}
	}, []);

	useEffect(() => {
		loadDomains();
	}, [loadDomains]);

	useEffect(() => {
		if (selectedJuri) {
			loadCategories(selectedJuri.id);
		}
	}, [selectedJuri, loadCategories]);

	const handleCreateCategory = async () => {
		if (!selectedJuri || !catNameAr || !catNameEn)
			return toast.error("أكمل البيانات المطلوبة");

		setIsAddingCategory(true);
		try {
			const finalDomain = isAddingNewDomain ? newDomainName : catDomain;
			if (!finalDomain) {
				toast.error("يرجى تحديد المجال القانوني");
				setIsAddingCategory(false);
				return;
			}

			const res = await fetch("/api/admin/kb/categories", {
				method: "POST",
				body: JSON.stringify({
					nameAr: catNameAr,
					nameEn: catNameEn,
					jurisdictionId: selectedJuri.id,
					legalDomain: finalDomain,
					descriptionAr: catDesc,
					slug: `${catNameEn.toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString().slice(-4)}`,
				}),
			});

			if (res.ok) {
				toast.success("تم إضافة التصنيف بنجاح");
				setCatNameAr("");
				setCatNameEn("");
				setCatDesc("");
				if (isAddingNewDomain) {
					setNewDomainName("");
					setIsAddingNewDomain(false);
					loadDomains();
				}
				loadCategories(selectedJuri.id);
			} else {
				const err = await res.json();
				toast.error(err.error || "فشل في الإضافة");
			}
		} catch (error) {
			toast.error("حدث خطأ ما");
		} finally {
			setIsAddingCategory(false);
		}
	};

	const onConfirmAction = async () => {
		setIsProcessing(true);
		try {
			if (confirmModal.type === "Cat") {
				const res = await fetch(
					`/api/admin/kb/categories?id=${confirmModal.id}`,
					{
						method: "DELETE",
					},
				);

				if (res.ok) {
					toast.success("تم حذف التصنيف");
					setCategories((prev) => prev.filter((c) => c.id !== confirmModal.id));
				} else {
					toast.error("فشل في حذف التصنيف");
				}
			} else if (confirmModal.type === "Juri") {
				const res = await deleteJurisdiction(confirmModal.id);
				if (res.success) {
					toast.success("تم حذف الدولة");
					setJurisdictionsList((prev) =>
						prev.filter((j) => j.id !== confirmModal.id),
					);
					if (selectedJuri?.id === confirmModal.id) setSelectedJuri(null);
				} else {
					toast.error(res.error || "فشل في الحذف");
				}
			}
		} catch (err) {
			toast.error("حدث خطأ أثناء العملية");
		} finally {
			setIsProcessing(false);
			setConfirmModal({ ...confirmModal, open: false });
		}
	};

	return (
		<div className="space-y-6 animate-in fade-in duration-700 rtl" dir="rtl">
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div className="space-y-0.5">
					<h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
						<Globe className="h-7 w-7 text-indigo-600" />
						الهيكل التنظيمي (Jurisdictions)
					</h1>
					<p className="text-[13px] text-slate-500 font-medium">
						إدارة الدول والأنظمة القضائية والتصنيفات المعتمدة.
					</p>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
				{/* JURISDICTIONS LIST & ADD */}
				<div className="lg:col-span-4 space-y-4">
					<Card className="rounded-[2rem] border-slate-200/50 bg-white/70 backdrop-blur-md shadow-sm overflow-hidden transition-all">
						<CardHeader className="bg-slate-50/50 py-3 border-b border-slate-100">
							<CardTitle className="text-sm font-black text-slate-700 uppercase tracking-wider">
								{editingJuri ? "تعديل بيانات الدولة" : "إضافة دولة جديدة"}
							</CardTitle>
						</CardHeader>
						<CardContent className="p-6 space-y-4">
							<div className="space-y-2">
								<label className="text-xs font-bold text-slate-500 uppercase">
									كود الدولة (مثل KW)
								</label>
								<Input
									placeholder="KW"
									value={newJuriCode}
									onChange={(e) => setNewJuriCode(e.target.value)}
									className="rounded-xl h-11"
									disabled={!!editingJuri}
								/>
							</div>
							<div className="space-y-2">
								<label className="text-xs font-bold text-slate-500 uppercase font-sans">
									Name (English)
								</label>
								<Input
									placeholder="Kuwait"
									value={newJuriNameEn}
									onChange={(e) => setNewJuriNameEn(e.target.value)}
									className="rounded-xl h-11 font-sans"
								/>
							</div>
							<div className="space-y-2">
								<label className="text-xs font-bold text-slate-500 uppercase">
									الاسم بالعربية
								</label>
								<Input
									placeholder="الكويت"
									value={newJuriNameAr}
									onChange={(e) => setNewJuriNameAr(e.target.value)}
									className="rounded-xl h-11"
								/>
							</div>
							<div className="flex gap-2">
								<Button
									onClick={async () => {
										if (!newJuriCode || !newJuriNameAr || !newJuriNameEn)
											return toast.error("أكمل الحقول");
										setIsAddingJuri(true);

										if (editingJuri) {
											const res = await updateJurisdiction(editingJuri.id, {
												nameAr: newJuriNameAr,
												nameEn: newJuriNameEn,
											});
											if (res.success) {
												toast.success("تم التعديل");
												setJurisdictionsList((prev) =>
													prev.map((j) =>
														j.id === editingJuri.id
															? {
																	...j,
																	nameAr: newJuriNameAr,
																	nameEn: newJuriNameEn,
																}
															: j,
													),
												);
												setEditingJuri(null);
												setNewJuriCode("");
												setNewJuriNameAr("");
												setNewJuriNameEn("");
											} else {
												toast.error(res.error || "فشل في التعديل");
											}
										} else {
											const res = await addJurisdiction(
												newJuriNameAr,
												newJuriNameEn,
												newJuriCode,
											);
											if (res.success) {
												toast.success("تم الإضافة");
												const newJuri = {
													id: newJuriCode.toLowerCase(),
													code: newJuriCode.toUpperCase(),
													nameAr: newJuriNameAr,
													nameEn: newJuriNameEn,
													isActive: true,
												};
												setJurisdictionsList([...jurisdictionsList, newJuri]);
												setNewJuriCode("");
												setNewJuriNameAr("");
												setNewJuriNameEn("");
											} else {
												toast.error(res.error || "فشل في الإضافة");
											}
										}
										setIsAddingJuri(false);
									}}
									disabled={isAddingJuri}
									className="flex-1 rounded-xl h-12 font-bold"
								>
									{isAddingJuri ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : editingJuri ? (
										<ShieldCheck className="w-4 h-4" />
									) : (
										<Plus className="w-4 h-4" />
									)}
									{editingJuri ? "حفظ التعديلات" : "حفظ الدولة"}
								</Button>
								{editingJuri && (
									<Button
										variant="outline"
										onClick={() => {
											setEditingJuri(null);
											setNewJuriCode("");
											setNewJuriNameAr("");
											setNewJuriNameEn("");
										}}
										className="rounded-xl h-12 text-slate-400"
									>
										إلغاء
									</Button>
								)}
							</div>
						</CardContent>
					</Card>

					<Card className="rounded-[2rem] border-slate-200/50 bg-white/70 backdrop-blur-md shadow-sm overflow-hidden">
						<CardHeader className="bg-slate-50/50 py-3 border-b border-slate-100">
							<CardTitle className="text-sm font-black text-slate-700 uppercase tracking-wider">
								الدول المتاحة
							</CardTitle>
						</CardHeader>
						<CardContent className="p-1.5">
							<div className="space-y-1">
								{jurisdictionsList.map((j) => (
									<div
										key={j.id}
										className={cn(
											"flex items-center justify-between p-3 rounded-2xl transition-all group/item",
											selectedJuri?.id === j.id
												? "bg-indigo-600 text-white shadow-indigo-200 shadow-lg"
												: "hover:bg-slate-50",
										)}
									>
										<div
											className="flex items-center gap-3 cursor-pointer flex-1"
											onClick={() => setSelectedJuri(j)}
										>
											<div
												className={cn(
													"w-1.5 h-1.5 rounded-full",
													j.isActive
														? selectedJuri?.id === j.id
															? "bg-white"
															: "bg-emerald-500"
														: "bg-slate-300",
												)}
											/>
											<div>
												<p
													className={cn(
														"text-xs font-black leading-tight",
														selectedJuri?.id === j.id
															? "text-white"
															: "text-slate-900",
													)}
												>
													{j.nameAr}
												</p>
												<p
													className={cn(
														"text-[8px] font-mono",
														selectedJuri?.id === j.id
															? "text-white/60"
															: "text-slate-400",
													)}
												>
													{j.code}
												</p>
											</div>
										</div>

										<div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
											<Button
												size="icon-xs"
												variant="ghost"
												className="rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white border-none"
												onClick={(e) => {
													e.stopPropagation();
													setEditingJuri(j);
													setNewJuriCode(j.code);
													setNewJuriNameAr(j.nameAr);
													setNewJuriNameEn(j.nameEn);
												}}
											>
												<Pencil className="h-3 w-3" />
											</Button>
											<Button
												size="icon-xs"
												variant="ghost"
												className="rounded-lg text-slate-400 hover:text-red-500 hover:bg-white border-none"
												onClick={(e) => {
													e.stopPropagation();
													setConfirmModal({
														open: true,
														type: "Juri",
														id: j.id,
														title: `حذف ${j.nameAr}`,
													});
												}}
											>
												<Trash2 className="h-3 w-3" />
											</Button>
										</div>

										<Badge
											variant={j.isActive ? "success" : "secondary"}
											className="text-[10px] ml-2 cursor-pointer"
											onClick={() => {
												const newStatus = !j.isActive;
												toggleJurisdictionStatus(j.id, newStatus).then(
													(res) => {
														if (res.success)
															setJurisdictionsList((prev) =>
																prev.map((item) =>
																	item.id === j.id
																		? { ...item, isActive: newStatus }
																		: item,
																),
															);
													},
												);
											}}
										>
											{j.isActive ? "نشط" : "متوقف"}
										</Badge>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</div>

				{/* CATEGORIES MANAGEMENT */}
				<div className="lg:col-span-8 space-y-6">
					{selectedJuri ? (
						<>
							<div className="bg-white/70 backdrop-blur-md rounded-[2.5rem] border border-slate-200/50 p-6 shadow-sm flex items-center justify-between">
								<div>
									<h2 className="text-xl font-black text-slate-900">
										تصنيفات {selectedJuri.nameAr}
									</h2>
									<p className="text-xs text-slate-500 font-medium">
										إدارة الأقسام القانونية وهيكل البيانات.
									</p>
								</div>
								<Button
									onClick={() => setSelectedJuri(null)}
									variant="ghost"
									size="sm"
									className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
								>
									إغلاق
								</Button>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								{/* Add Category Form */}
								<Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden h-fit">
									<CardHeader className="bg-slate-50/50 border-b">
										<CardTitle className="text-lg font-bold">
											إضافة تصنيف
										</CardTitle>
									</CardHeader>
									<CardContent className="p-6 space-y-4">
										<div className="space-y-2">
											<label className="text-xs font-bold text-slate-500 uppercase">
												اسم التصنيف (بالعربية)
											</label>
											<Input
												placeholder="مثل: قانون العمل"
												value={catNameAr}
												onChange={(e) => setCatNameAr(e.target.value)}
												className="rounded-xl"
											/>
										</div>
										<div className="space-y-2">
											<label className="text-xs font-bold text-slate-500 uppercase">
												Name (English)
											</label>
											<Input
												placeholder="e.g. Labor Law"
												value={catNameEn}
												onChange={(e) => setCatNameEn(e.target.value)}
												className="rounded-xl"
											/>
										</div>
										<div className="space-y-2">
											<div className="flex items-center justify-between">
												<label className="text-xs font-bold text-slate-500 uppercase">
													التصنيف (مثلاً: مدني، جنائي)
												</label>
												<button
													onClick={() =>
														setIsAddingNewDomain(!isAddingNewDomain)
													}
													className="text-[10px] text-indigo-600 font-bold hover:underline"
												>
													{isAddingNewDomain
														? "اختيار من القائمة"
														: "إضافة تصنيف جديد +"}
												</button>
											</div>
											
											{isAddingNewDomain ? (
												<Input
													placeholder="أدخل اسم التصنيف (مثلاً: عمالي)"
													value={newDomainName}
													onChange={(e) => setNewDomainName(e.target.value)}
													className="rounded-xl h-10 border-indigo-200 bg-indigo-50/30"
												/>
											) : (
												<select
													value={catDomain}
													onChange={(e) => setCatDomain(e.target.value)}
													className="w-full rounded-xl border border-slate-200 p-2 text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none h-11 bg-white transition-all"
												>
													<option value="">-- اختر التصنيف --</option>
													{Array.from(new Set([
														...dynamicDomains,
														"CIVIL", "CRIMINAL", "COMMERCIAL", "LABOR", "FAMILY", "ADMINISTRATIVE"
													])).map((d) => (
														<option key={d} value={d}>
															{d === "CIVIL" ? "مدني (Civil)" :
															 d === "CRIMINAL" ? "جنائي (Criminal)" :
															 d === "COMMERCIAL" ? "تجاري (Commercial)" :
															 d === "LABOR" ? "عمالي (Labor)" :
															 d === "FAMILY" ? "أحوال شخصية (Family)" :
															 d === "ADMINISTRATIVE" ? "إداري (Administrative)" : d}
														</option>
													))}
												</select>
											)}
										</div>
										<Button
											onClick={handleCreateCategory}
											disabled={isAddingCategory}
											className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-6 font-bold"
										>
											{isAddingCategory ? (
												<Loader2 className="animate-spin" />
											) : (
												<FolderPlus className="w-4 h-4 ml-2" />
											)}
											تأكيد الإضافة
										</Button>
									</CardContent>
								</Card>

								{/* Categories List */}
								<Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden flex-1">
									<CardHeader className="bg-slate-50/50 border-b">
										<CardTitle className="text-lg font-bold">
											التصنيفات المعتمدة
										</CardTitle>
									</CardHeader>
									<CardContent className="p-0">
										{isLoadingCategories ? (
											<div className="p-12 flex justify-center">
												<Loader2 className="animate-spin text-slate-300" />
											</div>
										) : categories.length === 0 ? (
											<div className="p-12 text-center text-slate-400">
												لا توجد تصنيفات حالياً لهذه الدولة.
											</div>
										) : (
											<div className="divide-y divide-slate-100">
												{categories.map((cat) => (
													<div
														key={cat.id}
														className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
													>
														<div>
															<p className="font-bold text-slate-900">
																{cat.nameAr}
															</p>
															<p className="text-[10px] text-slate-500">
																{cat.nameEn} • {cat.legalDomain}
															</p>
														</div>
														<Button
															variant="ghost"
															size="icon"
															className="text-red-400 hover:text-red-500 bg-red-50 rounded-xl"
															onClick={() =>
																setConfirmModal({
																	open: true,
																	type: "Cat",
																	id: cat.id,
																	title: `حذف ${cat.nameAr}`,
																})
															}
														>
															<Trash2 className="w-4 h-4" />
														</Button>
													</div>
												))}
											</div>
										)}
									</CardContent>
								</Card>
							</div>
						</>
					) : (
						<div className="h-full flex flex-col items-center justify-center p-12 bg-slate-50/50 border-2 border-dashed border-slate-100 rounded-[3rem] text-center space-y-4">
							<div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm">
								<Globe className="w-10 h-10 text-slate-300" />
							</div>
							<div>
								<h3 className="text-xl font-bold text-slate-900">
									لم يتم اختيار دولة
								</h3>
								<p className="text-slate-500 max-w-xs mx-auto">
									اختر دولة من القائمة الجانبية لإدارة تصنيفاتها القانونية وهيكل
									المعلومات الخاص بها.
								</p>
							</div>
						</div>
					)}
				</div>
			</div>

			<ConfirmModal
				isOpen={confirmModal.open}
				onClose={() => setConfirmModal({ ...confirmModal, open: false })}
				onConfirm={onConfirmAction}
				title={confirmModal.title}
				description="هل أنت متأكد من رغبتك في حذف هذا العنصر؟ لن تتمكن من استعادته لاحقاً."
				confirmText="تأكيد الحذف"
				isLoading={isProcessing}
			/>
		</div>
	);
}
