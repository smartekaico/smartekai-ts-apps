"use client";

import type * as React from "react";
import { useState } from "react";
import { toast } from "sonner";
import posthog from "posthog-js";
import { Loader2, Sparkles, Building2, User, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { submitDemoRequest } from "@/app/[locale]/actions/marketing";

const COUNTRIES = [
	{ code: "KWT", en: "Kuwait", ar: "الكويت" },
	{ code: "SAU", en: "Saudi Arabia", ar: "المملكة العربية السعودية" },
	{ code: "ARE", en: "United Arab Emirates", ar: "الإمارات العربية المتحدة" },
	{ code: "QAT", en: "Qatar", ar: "قطر" },
	{ code: "BHR", en: "Bahrain", ar: "البحرين" },
	{ code: "OMN", en: "Oman", ar: "سلطنة عمان" },
	{ code: "EGY", en: "Egypt", ar: "مصر" },
	{ code: "JOR", en: "Jordan", ar: "الأردن" },
	{ code: "LBN", en: "Lebanon", ar: "لبنان" },
	{ code: "IRQ", en: "Iraq", ar: "العراق" },
	{ code: "MAR", en: "Morocco", ar: "المغرب" },
	{ code: "DZA", en: "Algeria", ar: "الجزائر" },
	{ code: "TUN", en: "Tunisia", ar: "تونس" },
	{ code: "TUR", en: "Turkey", ar: "تركيا" },
	{ code: "GBR", en: "United Kingdom", ar: "المملكة المتحدة" },
	{ code: "USA", en: "United States", ar: "الولايات المتحدة" },
	{ code: "CAN", en: "Canada", ar: "كندا" },
	{ code: "AUS", en: "Australia", ar: "أستراليا" },
	{ code: "DEU", en: "Germany", ar: "ألمانيا" },
	{ code: "FRA", en: "France", ar: "فرنسا" },
	{ code: "ESP", en: "Spain", ar: "إسبانيا" },
	{ code: "ZAF", en: "South Africa", ar: "جنوب أفريقيا" },
	{ code: "IND", en: "India", ar: "الهند" },
	{ code: "OTHER", en: "Other", ar: "دولة أخرى" },
];

export function DemoRequestModal({
	trigger,
	defaultIndustry = "LEGAL",
	isOpen,
	onOpenChange,
}: {
	trigger?: React.ReactElement;
	defaultIndustry?: "LEGAL" | "MEDICAL" | "VOICE";
	isOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
}) {
	const t = useTranslations();
	const locale = useLocale();
	const isRtl = locale === "ar";

	const [internalOpen, setInternalOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [industry, setIndustry] = useState(defaultIndustry);
	const [country, setCountry] = useState("");

	// Sync internal state with controlled prop
	const open = isOpen !== undefined ? isOpen : internalOpen;
	const setOpen = onOpenChange || setInternalOpen;

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLoading(true);

		const formData = new FormData(e.currentTarget);
		formData.append("industry", industry);
		if (!country) {
			toast.error(
				locale === "ar" ? "يرجى اختيار الدولة" : "Please select a country",
			);
			setLoading(false);
			return;
		}
		formData.append("country", country);

		const result = await submitDemoRequest(formData);

		if (result.success) {
			posthog.capture("demo_request_submitted", {
				industry,
				email: formData.get("email"),
				name: formData.get("name"),
			});
			toast.success(t("demo_modal_success"), {
				description:
					locale === "ar"
						? "يرجى التحقق من بريدك الإلكتروني (ومجلد البريد المزعج/Spam) لتلقي التعليمات."
						: "Please check your email (including Spam folder) for further instructions.",
				duration: 8000,
			});
			setOpen(false);
		} else {
			toast.error(result.error || t("demo_modal_error"));
		}
		setLoading(false);
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger
				render={
					trigger || (
						<Button
							size="lg"
							className="rounded-2xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-200 gap-2 h-14 px-8 text-lg"
						>
							{t("demo_modal_submit")}
							<Sparkles className="h-5 w-5" />
						</Button>
					)
				}
			/>

			<DialogContent
				className="sm:max-w-[500px] p-0 overflow-hidden border-none bg-white rounded-[2rem] shadow-2xl"
				dir={isRtl ? "rtl" : "ltr"}
			>
				<div className="relative p-8 lg:p-12">
					{/* Background decoration */}
					<div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
					<div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />

					<DialogHeader
						className="relative text-left flex flex-col items-start gap-2 mb-8"
						dir={isRtl ? "rtl" : "ltr"}
					>
						<div className="p-3 bg-indigo-600 rounded-2xl text-white inline-flex items-center justify-center shadow-lg shadow-indigo-200">
							<Sparkles className="h-6 w-6" />
						</div>
						<DialogTitle className="text-3xl font-black text-slate-900 tracking-tight mt-2 text-start">
							{t("demo_modal_title")}
						</DialogTitle>
						<DialogDescription className="text-slate-500 text-lg font-medium leading-relaxed text-start">
							{t("demo_modal_description")}
						</DialogDescription>
					</DialogHeader>

					<form onSubmit={handleSubmit} className="space-y-4 relative">
						<div className="space-y-2">
							<Label className="text-xs font-bold text-slate-500 uppercase">
								{t("demo_modal_nameLabel")}
							</Label>
							<div className="relative group">
								<User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
								<Input
									name="name"
									placeholder={t("demo_modal_namePlaceholder")}
									className="pl-12 h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-indigo-600 transition-all font-bold placeholder:text-slate-400"
									required
								/>
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label className="text-xs font-bold text-slate-500 uppercase">
									{t("demo_modal_emailLabel")}
								</Label>
								<div className="relative group">
									<Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
									<Input
										name="email"
										type="email"
										placeholder="name@firm.com"
										className="pl-12 h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-indigo-600 transition-all font-bold placeholder:text-slate-400"
										required
									/>
								</div>
							</div>
							<div className="space-y-2">
								<Label className="text-xs font-bold text-slate-500 uppercase">
									{t("demo_modal_countryLabel")}
								</Label>
								<Select
									value={country}
									onValueChange={(val) => setCountry(val ?? "")}
								>
									<SelectTrigger
										className="w-full rounded-xl bg-slate-50 border-slate-200 h-12 font-bold text-slate-900 focus:ring-indigo-600 focus:ring-offset-0 relative outline-none ring-0 focus-visible:ring-2"
										dir="ltr"
									>
										<SelectValue
											placeholder={t("demo_modal_countryPlaceholder")}
										/>
									</SelectTrigger>
									<SelectContent className="rounded-xl border-slate-100 shadow-xl z-[9999]">
										{COUNTRIES.map((c) => (
											<SelectItem
												key={c.code}
												value={c.code}
												className="font-bold cursor-pointer py-3"
											>
												{isRtl ? c.ar : c.en}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="space-y-2">
							<Label className="text-xs font-bold text-slate-500 uppercase">
								{t("demo_modal_companyLabel")}
							</Label>
							<div className="relative group">
								<Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
								<Input
									name="company"
									placeholder={t("demo_modal_companyPlaceholder")}
									className="pl-12 h-12 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-indigo-600 transition-all font-bold placeholder:text-slate-400"
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label className="text-xs font-bold text-slate-500 uppercase">
								{t("demo_modal_productLabel")}
							</Label>
							<Select
								value={industry}
								onValueChange={(val) => val && setIndustry(val as any)}
							>
								<SelectTrigger
									className="w-full rounded-xl bg-slate-50 border-slate-200 h-12 font-bold text-slate-900 focus:ring-indigo-600 focus:ring-offset-0 relative outline-none ring-0 focus-visible:ring-2"
									dir="ltr"
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent className="rounded-xl border-slate-100 shadow-xl z-[9999]">
									<SelectItem
										value="LEGAL"
										className="font-bold cursor-pointer py-3"
									>
										{t("demo_modal_legalOption")}
									</SelectItem>
									<SelectItem
										value="MEDICAL"
										className="font-bold cursor-pointer py-3"
									>
										{t("demo_modal_medicalOption")}
									</SelectItem>
									<SelectItem
										value="VOICE"
										className="font-bold cursor-pointer py-3"
									>
										{t("demo_modal_voiceOption")}
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="pt-4">
							<Button
								type="submit"
								disabled={loading}
								className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white h-14 font-bold text-lg shadow-xl shadow-slate-200 transition-all group"
							>
								{loading ? (
									<Loader2 className="h-5 w-5 animate-spin" />
								) : (
									<span className="flex items-center gap-2">
										{t("demo_modal_submit")}
										<Send
											className={cn(
												"h-4 w-4 opacity-70 group-hover:opacity-100 transition-all",
												isRtl
													? "rotate-180 group-hover:-translate-x-1"
													: "group-hover:translate-x-1",
											)}
										/>
									</span>
								)}
							</Button>
						</div>
					</form>
				</div>
			</DialogContent>
		</Dialog>
	);
}
