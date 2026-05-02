"use client";

import React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Languages, Moon, Sun, Monitor, Check, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPreferencesPage() {
	const t = useTranslations("Settings");
	const locale = useLocale();
	const router = useRouter();
	const pathname = usePathname();

	const handleLocaleChange = (newLocale: "ar" | "en") => {
		router.replace(pathname, { locale: newLocale });
	};

	return (
		<div
			className="space-y-10 animate-in fade-in duration-700 rtl text-right"
			dir="rtl"
		>
			{/* Page Header */}
			<div className="flex flex-col gap-2">
				<h1 className="text-3xl font-black text-slate-900 tracking-tight">
					{t("nav.preferences")}
				</h1>
				<p className="text-slate-500 font-medium tracking-tight">
					تخصيص تجربة الاستخدام واللغة المفضلة.
				</p>
			</div>

			<div className="grid grid-cols-1 gap-8">
				{/* Language Selection */}
				<div className="space-y-4">
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100 shadow-sm">
							<Languages className="h-5 w-5" />
						</div>
						<h2 className="text-xl font-black text-slate-900">
							لغة النظام (System Language)
						</h2>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<button
							type="button"
							onClick={() => handleLocaleChange("ar")}
							className={cn(
								"p-6 rounded-[2rem] border-2 text-right transition-all group relative overflow-hidden",
								locale === "ar"
									? "border-indigo-600 bg-indigo-50/30"
									: "border-slate-100 bg-white hover:border-slate-200",
							)}
						>
							<div className="flex flex-col gap-1 relative z-10">
								<span className="text-lg font-black text-slate-900">
									العربية
								</span>
								<span className="text-sm text-slate-500 font-medium">
									اللغة الافتراضية للنظام القانوني.
								</span>
							</div>
							{locale === "ar" && (
								<div className="absolute top-6 left-6 h-8 w-8 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg animate-in zoom-in duration-300">
									<Check className="h-4 w-4 stroke-[3]" />
								</div>
							)}
						</button>

						<button
							type="button"
							onClick={() => handleLocaleChange("en")}
							className={cn(
								"p-6 rounded-[2rem] border-2 text-right transition-all group relative overflow-hidden",
								locale === "en"
									? "border-indigo-600 bg-indigo-50/30"
									: "border-slate-100 bg-white hover:border-slate-200",
							)}
						>
							<div className="flex flex-col gap-1 relative z-10">
								<span className="text-lg font-black text-slate-900">
									English
								</span>
								<span className="text-sm text-slate-500 font-medium">
									International standard interface.
								</span>
							</div>
							{locale === "en" && (
								<div className="absolute top-6 left-6 h-8 w-8 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg animate-in zoom-in duration-300">
									<Check className="h-4 w-4 stroke-[3]" />
								</div>
							)}
						</button>
					</div>
				</div>

				{/* Appearance Placeholder */}
				<Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-slate-50/50 grayscale opacity-80">
					<CardHeader className="p-8 pb-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm">
									<Monitor className="h-5 w-5" />
								</div>
								<CardTitle className="text-lg font-black text-slate-900">
									المظهر (Appearance)
								</CardTitle>
							</div>
							<Badge
								variant="outline"
								className="bg-white text-[9px] font-black uppercase tracking-widest px-2"
							>
								قريباً
							</Badge>
						</div>
					</CardHeader>
					<CardContent className="p-8 pt-0">
						<p className="text-xs font-bold text-slate-400">
							دعم الوضع الليلي (Dark Mode) في مرحلة التطوير حالياً.
						</p>
						<div className="flex gap-4 mt-6">
							<div className="h-16 w-24 bg-white rounded-xl border-2 border-slate-100" />
							<div className="h-16 w-24 bg-slate-200 rounded-xl border-2 border-transparent" />
							<div className="h-16 w-24 bg-slate-800 rounded-xl border-2 border-transparent" />
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
