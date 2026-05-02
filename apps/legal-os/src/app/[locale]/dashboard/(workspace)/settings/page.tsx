import React from "react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import {
	User,
	ShieldCheck,
	CreditCard,
	Building2,
	Settings as SettingsIcon,
	ArrowLeft,
} from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function SettingsOverviewPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		redirect("/login");
	}

	const t = await getTranslations("Settings");
	const user = session.user;

	const quickLinks = [
		{
			title: t("nav.profile"),
			href: "/dashboard/settings/profile",
			icon: User,
			description: t("profile.subtitle"),
			color: "text-indigo-600",
			bg: "bg-indigo-50",
		},
		{
			title: t("nav.billing"),
			href: "/dashboard/settings/billing",
			icon: CreditCard,
			description: t("billing.subtitle"),
			color: "text-emerald-600",
			bg: "bg-emerald-50",
		},
		{
			title: t("nav.firmDetails"),
			href: "/dashboard/settings/workspace",
			icon: Building2,
			description: t("workspace.subtitle"),
			color: "text-blue-600",
			bg: "bg-blue-50",
		},
	];

	return (
		<div
			className="space-y-10 animate-in fade-in duration-700 rtl text-right"
			dir="rtl"
		>
			{/* Header */}
			<div className="flex flex-col gap-2">
				<h1 className="text-3xl font-black text-slate-900 tracking-tight">
					{t("nav.personal")}
				</h1>
				<p className="text-slate-500 font-medium">
					مرحباً {user.name}، يمكنك هنا إدارة إعدادات حسابك ومساحة العمل الخاصة
					بك.
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{quickLinks.map((link) => (
					<Link key={link.href} href={link.href} className="group">
						<Card className="h-full border-slate-100 hover:border-indigo-100 shadow-sm hover:shadow-xl transition-all duration-300 rounded-[2rem] overflow-hidden group-hover:-translate-y-1">
							<CardHeader className="p-6 pb-2 flex flex-row items-center justify-between">
								<div
									className={`h-12 w-12 rounded-2xl ${link.bg} ${link.color} flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm`}
								>
									<link.icon className="h-6 w-6" />
								</div>
								<ArrowLeft className="h-5 w-5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
							</CardHeader>
							<CardContent className="px-6 pb-6">
								<CardTitle className="text-xl font-black text-slate-900 mb-2">
									{link.title}
								</CardTitle>
								<CardDescription className="text-sm font-medium text-slate-500 leading-relaxed">
									{link.description}
								</CardDescription>
							</CardContent>
						</Card>
					</Link>
				))}
			</div>

			{/* Account Identity Card */}
			<Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-slate-50/50">
				<CardHeader className="p-8 pb-4">
					<CardTitle className="text-lg font-black flex items-center gap-2">
						<ShieldCheck className="h-5 w-5 text-indigo-600" />
						هوية الحساب والنظام
					</CardTitle>
				</CardHeader>
				<CardContent className="p-8 pt-0 grid grid-cols-1 md:grid-cols-2 gap-8">
					<div className="space-y-2">
						<span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
							نوع الحساب
						</span>
						<p className="text-sm font-bold text-slate-700">
							{user.industryRole === "ADMIN"
								? "مدير النظام (Admin)"
								: "مستخدم قانوني (Legal User)"}
						</p>
					</div>
					<div className="space-y-2">
						<span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
							معرف المستخدم (UID)
						</span>
						<p className="text-[10px] font-mono font-bold text-slate-400">
							{user.id}
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
