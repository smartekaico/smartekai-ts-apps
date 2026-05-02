"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
	User,
	Settings,
	CreditCard,
	Building2,
	Users,
	LifeBuoy,
	ShieldCheck,
	FileLock2,
	Globe,
	Palette,
} from "lucide-react";

export function SettingsSidebar() {
	const t = useTranslations("Settings.nav");
	const pathname = usePathname();

	const categories = [
		{
			label: t("personal"),
			items: [
				{
					title: t("profile"),
					href: "/dashboard/settings/profile",
					icon: User,
				},
				{
					title: t("billing"),
					href: "/dashboard/settings/billing",
					icon: CreditCard,
				},
				{
					title: t("preferences"),
					href: "/dashboard/settings/preferences",
					icon: Settings,
				},
			],
		},
		{
			label: t("workspace"),
			items: [
				{
					title: t("firmDetails"),
					href: "/dashboard/settings/workspace",
					icon: Building2,
				},
				{
					title: t("team"),
					href: "/dashboard/settings/team",
					icon: Users,
				},
			],
		},
	];

	const footerLinks = [
		{
			title: t("support"),
			href: "/dashboard/support",
			icon: LifeBuoy,
		},
		{
			title: t("terms"),
			href: "/terms-of-service",
			icon: ShieldCheck,
		},
		{
			title: t("privacy"),
			href: "/privacy-policy",
			icon: FileLock2,
		},
	];

	return (
		<aside className="w-full md:w-64 flex flex-col h-full border-l border-slate-100 bg-slate-50/50 backdrop-blur-sm p-4 animate-in fade-in slide-in-from-right-4 duration-500">
			<div className="flex-1 space-y-8">
				{categories.map((category, idx) => (
					<div key={idx} className="space-y-4">
						<h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-4">
							{category.label}
						</h3>
						<nav className="space-y-1">
							{category.items.map((item) => {
								const isActive = pathname === item.href;
								return (
									<Link
										key={item.href}
										href={item.href}
										className={cn(
											"flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all group",
											isActive
												? "bg-white text-indigo-600 shadow-sm border border-slate-100 translate-x-1"
												: "text-slate-500 hover:text-slate-900 hover:bg-white/50",
										)}
									>
										<item.icon
											className={cn(
												"h-4 w-4 transition-transform group-hover:scale-110",
												isActive ? "text-indigo-600" : "text-slate-400",
											)}
										/>
										{item.title}
									</Link>
								);
							})}
						</nav>
					</div>
				))}
			</div>

			<div className="pt-8 mt-8 border-t border-slate-200/60 pb-4">
				<nav className="space-y-1">
					{footerLinks.map((item) => (
						<Link
							key={item.href}
							href={item.href}
							className="flex items-center gap-3 px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
						>
							<item.icon className="h-3.5 w-3.5" />
							{item.title}
						</Link>
					))}
				</nav>

				<div className="mt-8 px-4">
					<div className="p-4 bg-slate-900 rounded-2xl relative overflow-hidden group">
						<div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/20 blur-2xl -z-0 rounded-full group-hover:scale-150 transition-transform duration-700" />
						<div className="relative z-10">
							<p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1">
								Smartek AI Hub Version
							</p>
							<p className="text-white text-xs font-bold">MVP 1.2.0</p>
						</div>
					</div>
				</div>
			</div>
		</aside>
	);
}
