"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import {
	User,
	Settings,
	CreditCard,
	Building2,
	Users,
	LifeBuoy,
	MoreHorizontal,
	ScrollText,
	ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "@/i18n/routing";

export function SettingsTabs() {
	const t = useTranslations("Settings.nav");
	const pathname = usePathname();
	const currentLocale = useLocale();

	const tabs = [
		{
			title: t("preferences"),
			href: "/dashboard/settings/preferences",
			icon: Settings,
		},
		{
			title: currentLocale === "ar" ? "الملف الشخصي والمكتب" : "Profile & Firm",
			href: "/dashboard/settings/profile",
			icon: User,
		},
		{
			title: t("billing"),
			href: "/dashboard/settings/billing",
			icon: CreditCard,
		},
		{
			title: t("team"),
			href: "/dashboard/settings/team",
			icon: Users,
		},
		{
			title: currentLocale === "ar" ? "الدعم الفني" : "Support",
			href: "/dashboard/settings/support",
			icon: LifeBuoy,
		},
	];

	const router = useRouter();

	return (
		<div className="w-full bg-slate-50/50 backdrop-blur-md border-b border-slate-100 flex items-center px-4 overflow-x-auto no-scrollbar scroll-smooth">
			<div className="flex items-center gap-1 min-w-max py-3">
				{tabs.map((tab) => {
					const isActive = pathname === tab.href;
					return (
						<Link
							key={tab.href}
							href={tab.href}
							className={cn(
								"flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[13px] font-bold transition-all relative group overflow-hidden",
								isActive
									? "bg-white text-indigo-600 shadow-sm border border-slate-100 ring-1 ring-slate-100"
									: "text-slate-500 hover:text-slate-900 hover:bg-white/50",
							)}
						>
							<div
								className={cn(
									"p-1.5 rounded-lg transition-all",
									isActive
										? "bg-indigo-50 text-indigo-600"
										: "bg-transparent group-hover:bg-slate-100",
								)}
							>
								<tab.icon className="h-3.5 w-3.5" />
							</div>
							<span className="relative z-10">{tab.title}</span>

							{isActive && (
								<div className="absolute inset-0 bg-indigo-50/50 -z-0 animate-in fade-in duration-500" />
							)}
						</Link>
					);
				})}

				{/* More Actions Dropdown */}
				<div className="flex-shrink-0 flex items-center pr-2">
					<DropdownMenu>
						<DropdownMenuTrigger className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[13px] font-bold text-slate-500 hover:text-slate-900 hover:bg-white/50 transition-all border border-transparent hover:border-slate-100 relative z-20 cursor-pointer outline-none focus-visible:ring-0 group">
							<div className="p-1.5 rounded-lg bg-transparent group-hover:bg-slate-100 pointer-events-none">
								<MoreHorizontal className="h-3.5 w-3.5" />
							</div>
							<span className="hidden sm:inline pointer-events-none">
								{currentLocale === "ar" ? "المزيد" : "More"}
							</span>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							className="w-56 rounded-[1.5rem] p-2 shadow-2xl border-slate-100/50 bg-white/95 backdrop-blur-xl animate-in fade-in zoom-in duration-300 z-[100]"
							align="end"
							sideOffset={8}
						>
							<DropdownMenuItem
								className="flex items-center gap-3 py-2.5 px-3 cursor-pointer rounded-xl transition-all focus:bg-slate-50 group"
								onClick={() => router.push("/terms-of-service")}
							>
								<div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-focus:text-slate-600 transition-colors">
									<ScrollText className="h-4 w-4" />
								</div>
								<span className="text-xs font-bold text-slate-500 group-focus:text-slate-700">
									{t("terms")}
								</span>
							</DropdownMenuItem>
							<DropdownMenuItem
								className="flex items-center gap-3 py-2.5 px-3 cursor-pointer rounded-xl transition-all focus:bg-slate-50 group mt-1"
								onClick={() => router.push("/privacy-policy")}
							>
								<div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-focus:text-slate-600 transition-colors">
									<ShieldCheck className="h-4 w-4" />
								</div>
								<span className="text-xs font-bold text-slate-500 group-focus:text-slate-700">
									{t("privacy")}
								</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</div>
	);
}
