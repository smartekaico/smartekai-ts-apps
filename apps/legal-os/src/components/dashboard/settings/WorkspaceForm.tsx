"use client";

import type React from "react";
import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Building2, Image as ImageIcon, Save, ShieldCheck, Loader2, X } from "lucide-react";
import { useRef } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { updateWorkspace } from "@/app/[locale]/actions/settings";
import { toast } from "sonner";

interface WorkspaceFormProps {
	organization: {
		id: string;
		name: string;
		logo?: string | null;
		defaultJurisdiction?: string | null;
	};
}

export function WorkspaceForm({ organization }: WorkspaceFormProps) {
	const t = useTranslations("Settings");
	const currentLocale = useLocale();
	const [isSaving, setIsSaving] = useState(false);
	const [jurisdiction, setJurisdiction] = useState(
		organization.defaultJurisdiction || "kuwait",
	);
	const [logoPreview, setLogoPreview] = useState<string | null>(organization.logo || null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onloadend = () => {
				setLogoPreview(reader.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setIsSaving(true);

		const formData = new FormData(e.currentTarget);
		const firmName = formData.get("firmName") as string;

		try {
			const result = await updateWorkspace({
				name: firmName,
				defaultJurisdiction: jurisdiction,
				logo: logoPreview || undefined,
			});

			if (result.success) {
				toast.success("تم تحديث بيانات المكتب بنجاح");
			} else {
				toast.error(result.error || "حدث خطأ أثناء الحفظ");
			}
		} catch (error) {
			toast.error("خطأ في الاتصال بالخادم");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<form key={organization.id} onSubmit={handleSubmit} className="space-y-10">
			<div className="grid grid-cols-1 gap-8">
				{/* Firm Branding Card */}
				<Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-white">
					<CardHeader className="p-8 border-b border-slate-50 bg-slate-50/30">
						<div className="flex items-center gap-3">
							<div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 border border-slate-100 shadow-sm">
								<Building2 className="h-5 w-5" />
							</div>
							<CardTitle className="text-lg font-black text-slate-900">
								هوية المكتب (Firm Branding)
							</CardTitle>
						</div>
					</CardHeader>
					<CardContent className="p-8 space-y-8">
						{/* Logo Upload Placeholder */}
						<div className="space-y-4">
							<Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
								شعار المكتب (Logo)
							</Label>
							<div className="flex flex-col md:flex-row items-center gap-8">
								<div
									onClick={() => fileInputRef.current?.click()}
									className="h-32 w-32 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 group hover:border-indigo-300 transition-colors cursor-pointer relative overflow-hidden"
								>
									{logoPreview ? (
										<img src={logoPreview} alt="Logo Preview" className="h-full w-full object-cover" />
									) : (
										<>
											<ImageIcon className="h-8 w-8 text-slate-300 group-hover:text-indigo-400 transition-colors" />
											<span className="text-[9px] font-bold text-slate-400 group-hover:text-indigo-500">
												{t("workspace.placeholderLogo")}
											</span>
										</>
									)}
									<div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
										<span className="text-[10px] font-black text-white px-3 py-1 bg-white/20 border border-white/30 rounded-full shadow-sm">
											{logoPreview ? (currentLocale === "ar" ? "تغيير" : "Change") : (currentLocale === "ar" ? "رفع" : "Upload")}
										</span>
									</div>
								</div>
								<input
									type="file"
									ref={fileInputRef}
									className="hidden"
									accept="image/*"
									onChange={handleLogoChange}
								/>

								{logoPreview && (
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => setLogoPreview(null)}
										className="rounded-xl border-rose-100 text-rose-500 hover:bg-rose-50 hover:text-rose-600 h-8 font-bold gap-2"
									>
										<X className="h-3 w-3" />
										{currentLocale === "ar" ? "حذف الشعار" : "Remove Logo"}
									</Button>
								)}
								<div className="flex-1 space-y-2">
									<h4 className="text-sm font-bold text-slate-900">
										متطلبات الشعار
									</h4>
									<p className="text-xs text-slate-500 leading-relaxed font-medium">
										يوصى باستخدام صورة بصيغة PNG أو SVG ذات خلفية شفافة بمقاس لا
										يقل عن 512×512 بكسل.
									</p>
								</div>
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div className="space-y-2">
								<Label
									htmlFor="firmName"
									className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1"
								>
									اسم المؤسسة / المكتب
								</Label>
								<Input
									id="firmName"
									name="firmName"
									defaultValue={organization.name}
									placeholder="مثال: مكتب محمد العبدالله للمحاماة"
									className="rounded-2xl border-slate-100 h-12 font-bold focus-visible:ring-indigo-600 focus-visible:border-indigo-600 transition-all bg-slate-50 focus:bg-white px-4"
									required
								/>
							</div>
							<div className="space-y-2">
								<Label
									htmlFor="jurisdiction"
									className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1"
								>
									النطاق القضائي الافتراضي
								</Label>
								<Select
									value={jurisdiction}
									onValueChange={(val) => val && setJurisdiction(val)}
								>
									<SelectTrigger className="rounded-2xl border-slate-100 h-12 font-bold bg-slate-50 focus:bg-white ring-offset-0 focus:ring-indigo-600 transition-all px-4">
										<SelectValue placeholder="اختر النطاق..." />
									</SelectTrigger>
									<SelectContent className="rounded-2xl border-slate-200 bg-white/95 backdrop-blur-xl">
										<SelectItem
											value="kuwait"
											className="rounded-xl focus:bg-indigo-50 font-bold"
										>
											🇰🇼 الكويت (Kuwait)
										</SelectItem>
										<SelectItem
											value="ksa"
											className="rounded-xl focus:bg-indigo-50 font-bold"
										>
											🇸🇦 السعودية (Saudi Arabia)
										</SelectItem>
										<SelectItem
											value="uae"
											className="rounded-xl focus:bg-indigo-50 font-bold"
										>
											🇦🇪 الإمارات (UAE)
										</SelectItem>
										<SelectItem
											value="egypt"
											className="rounded-xl focus:bg-indigo-50 font-bold"
										>
											🇪🇬 مصر (Egypt)
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Security & Compliance Info Card */}
				<Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-emerald-50/30 border-l-4 border-l-emerald-500">
					<CardContent className="p-8 flex items-center gap-6">
						<div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
							<ShieldCheck className="h-6 w-6" />
						</div>
						<div>
							<h3 className="text-sm font-black text-emerald-900 mb-1">
								بيانات آمنة ومحمية
							</h3>
							<p className="text-xs text-emerald-700 font-medium leading-relaxed">
								يتم استخدام بيانات المكتب لتخصيص ترويسات المستندات والتقارير
								القانونية. نحن نلتزم بأقصى معايير الخصوصية.
							</p>
						</div>
					</CardContent>
				</Card>

				{/* Save Bar */}
				<div className="flex items-center justify-end gap-4 py-8 border-t border-slate-100">
					<Button
						type="button"
						variant="ghost"
						className="rounded-2xl px-8 h-12 font-black text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all"
					>
						إلغاء
					</Button>
					<Button
						type="submit"
						disabled={isSaving}
						className="rounded-2xl px-10 h-12 font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 transition-all gap-3 overflow-hidden flex items-center justify-center"
					>
						{isSaving ? (
							<div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
						) : (
							<Save className="h-4 w-4" />
						)}
						{isSaving ? "جاري الحفظ..." : "حفظ التغييرات"}
					</Button>
				</div>
			</div>
		</form>
	);
}
