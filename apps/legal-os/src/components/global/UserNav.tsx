"use client";

import * as React from "react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	LogOut,
	User,
	Settings,
	Building2,
	ChevronDown,
	Activity,
	ShieldCheck,
	ScrollText,
	ExternalLink,
	HelpCircle,
	Plus,
	Sparkles,
	LifeBuoy,
} from "lucide-react";
import { useLocale } from "next-intl";
import { useRouter, usePathname, routing } from "@/i18n/routing";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

interface UserNavProps {
	user: {
		name: string;
		email: string;
		image?: string | null;
		industryRole?: string;
	};
	organization?: {
		name: string;
		id: string;
		creditBalance?: number;
		defaultJurisdiction?: string;
	} | null;
	pendingDemoCount?: number;
	isCollapsed?: boolean;
}

const JURISDICTION_MAP: Record<string, string> = {
	kuwait: "🇰🇼 الكويت",
	ksa: "🇸🇦 السعودية",
	uae: "🇦🇪 الإمارات",
	egypt: "🇪🇬 مصر",
};

export function UserNav({
	user,
	organization,
	pendingDemoCount = 0,
	isCollapsed = false,
}: UserNavProps) {
	const router = useRouter();
	const currentLocale = useLocale();
	const pathname = usePathname();
	const credits = organization?.creditBalance ?? 0;
	const jurisdictionLabel =
		JURISDICTION_MAP[organization?.defaultJurisdiction || "kuwait"] ||
		"🇰🇼 الكويت";

	const isAdminPath = pathname?.includes("/admin");

	const handleSignOut = async () => {
		await authClient.signOut();
		router.push("/login");
	};

	const handleAdminSwitch = () => {
		// Clear viewAs cookie to force sidebar back to ADMIN mode
		document.cookie = "viewAs=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
		router.push("/dashboard/admin");
		router.refresh();
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				className={cn(
					"relative h-14 w-full flex items-center justify-start gap-3 px-2 hover:bg-slate-50/80 rounded-xl transition-all duration-300 border border-transparent hover:border-slate-100 group outline-none cursor-pointer",
					isCollapsed && "justify-center px-0",
				)}
			>
				<div className="relative">
					<Avatar className="h-10 w-10 border-2 border-white shadow-sm rounded-full overflow-hidden transition-transform group-hover:scale-105">
						<AvatarImage src={user.image || ""} alt={user.name} />
						<AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold">
							{user.name.charAt(0).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					{pendingDemoCount > 0 && user.industryRole === "ADMIN" && (
						<span
							className={cn(
								"absolute h-5 min-w-5 flex items-center justify-center bg-red-600 text-white text-[10px] font-black rounded-full border-2 border-white shadow-sm px-1.5 animate-bounce",
								isCollapsed ? "-top-2 -right-2" : "-top-1 -right-1",
							)}
						>
							{pendingDemoCount}
						</span>
					)}
				</div>
				{!isCollapsed && (
					<>
						<div className="flex flex-col flex-1 text-right overflow-hidden">
							<p className="text-sm font-bold text-slate-900 truncate leading-tight">
								{user.name}
							</p>
							<div className="flex items-center gap-1.5">
								<p className="text-[10px] text-slate-500 truncate flex items-center gap-1 opacity-80">
									{organization?.name || "مكتب شخصي"}
									<span className="text-slate-300 mx-0.5">•</span>
									<span className="text-[9px] font-medium">
										{jurisdictionLabel}
									</span>
								</p>
							</div>
						</div>
						<div className="flex flex-col items-end gap-1">
							<span className="px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[9px] font-black border border-indigo-100 tracking-tight whitespace-nowrap">
								{credits} {currentLocale === "ar" ? "نقطة" : "PTS"}
							</span>
							<ChevronDown className="h-3 w-3 text-slate-300 group-hover:text-slate-500 transition-colors" />
						</div>
					</>
				)}
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="w-56 font-sans overflow-hidden bg-white/95 backdrop-blur-xl border border-slate-200/60 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-2xl animate-in fade-in zoom-in-95 duration-200 z-[100]"
				align="center"
				side="top"
				sideOffset={10}
				dir="rtl"
			>
				{/* Identitiy Section */}
				<div className="p-2.5 bg-slate-50/50 flex items-center gap-2.5">
					<Avatar className="h-8 w-8 border shadow-sm">
						<AvatarImage src={user.image || ""} alt={user.name} />
						<AvatarFallback className="bg-indigo-100 text-indigo-700 text-[10px] font-bold">
							{user.name.charAt(0).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<div className="flex flex-col min-w-0">
						<p className="text-[11px] font-black text-slate-800 truncate leading-tight">
							{user.name}
						</p>
						<p className="text-[9px] font-medium text-slate-400 truncate leading-tight">
							{user.email}
						</p>
					</div>
				</div>

				<DropdownMenuSeparator className="bg-slate-100/50" />

				<div className="p-1">
					{/* Workspace Actions - Billing Removed */}

					{/* Contextual Admin Link */}
					{user.industryRole === "ADMIN" && !isAdminPath && (
						<DropdownMenuItem
							className="flex items-center gap-2 py-1.5 px-3 cursor-pointer rounded-xl transition-all bg-indigo-50/30 text-indigo-700 font-black focus:bg-indigo-600 focus:text-white group mt-0.5"
							onClick={handleAdminSwitch}
						>
							<div className="h-6 w-6 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 group-focus:bg-white/20 group-focus:text-white transition-colors">
								<ShieldCheck className="h-3 w-3" />
							</div>
							<span className="text-xs">
								{currentLocale === "ar" ? "لوحة أمان المنصة" : "Platform Admin"}
							</span>
							<Sparkles className="h-3 w-3 mr-auto opacity-40 group-focus:opacity-100" />
						</DropdownMenuItem>
					)}

					<DropdownMenuItem
						className="flex items-center gap-2 py-1.5 px-3 cursor-pointer rounded-xl transition-all focus:bg-slate-50 group mt-0.5"
						onClick={() => router.push("/dashboard/activity")}
					>
						<div
							className={cn(
								"h-6 w-6 rounded-lg flex items-center justify-center transition-colors",
								user.industryRole === "ADMIN"
									? "bg-amber-50 text-amber-600"
									: "bg-slate-100 text-slate-500",
							)}
						>
							{user.industryRole === "ADMIN" ? (
								<ScrollText className="h-3 w-3" />
							) : (
								<Activity className="h-3 w-3" />
							)}
						</div>
						<span className="text-xs font-bold text-slate-700">
							{user.industryRole === "ADMIN"
								? currentLocale === "ar"
									? "سجل التدقيق"
									: "Audit Logs"
								: currentLocale === "ar"
									? "سجل النشاط"
									: "Activity Log"}
						</span>
					</DropdownMenuItem>

					<DropdownMenuItem
						className="flex items-center gap-2 py-1.5 px-3 cursor-pointer rounded-xl transition-all focus:bg-slate-50 group mt-0.5"
						onClick={() => router.push("/dashboard/settings/profile")}
					>
						<div className="h-6 w-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
							<Settings className="h-3 w-3" />
						</div>
						<span className="text-xs font-bold text-slate-700">
							{currentLocale === "ar" ? "إعدادات الحساب" : "Account Settings"}
						</span>
					</DropdownMenuItem>
				</div>

				<DropdownMenuSeparator className="bg-slate-100/50" />

				<div className="p-1">
					<DropdownMenuItem
						className="flex items-center gap-2 py-1.5 px-3 cursor-pointer rounded-xl transition-all focus:bg-slate-50 group"
						onClick={() => router.push("/dashboard/settings/support")}
					>
						<div className="h-6 w-6 rounded-lg bg-indigo-50 text-indigo-400 group-focus:bg-indigo-100 group-focus:text-indigo-600 transition-colors">
							<LifeBuoy className="h-3 w-3" />
						</div>
						<span className="text-xs font-bold text-slate-700">
							{currentLocale === "ar" ? "الدعم والمساعدة" : "Support & Help"}
						</span>
					</DropdownMenuItem>
				</div>

				<DropdownMenuSeparator className="bg-slate-100/50" />

				{/* Logout Section */}
				<div className="p-1">
					<DropdownMenuItem
						className="flex items-center gap-3 py-2 px-3 cursor-pointer rounded-xl transition-all text-red-500 hover:text-red-600 focus:bg-red-50 focus:text-red-700 font-black group"
						onClick={handleSignOut}
					>
						<div className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500 group-focus:bg-red-100 transition-colors">
							<LogOut className="h-4 w-4" />
						</div>
						<span className="text-xs">
							{currentLocale === "ar" ? "تسجيل الخروج" : "Sign Out"}
						</span>
					</DropdownMenuItem>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
