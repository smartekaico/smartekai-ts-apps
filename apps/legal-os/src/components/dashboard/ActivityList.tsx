"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import {
	Search,
	Activity,
	Database,
	Sparkles,
	MessageSquare,
	Shield,
	Info,
	Plus,
	FileText,
	Calendar,
	CreditCard,
	Settings,
	ArrowUpRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

export interface ActivityItem {
	id: string;
	type: "audit" | "session" | "document" | "event";
	action: string;
	details: string;
	creditsSpent?: number;
	createdAt: Date;
	userName?: string;
	href?: string;
	sessionTitle?: string;
}

interface ActivityListProps {
	initialLogs: ActivityItem[];
}

export function ActivityList({ initialLogs }: ActivityListProps) {
	const t = useTranslations("Activity");
	const locale = useLocale();
	const dateLocale = locale === "ar" ? ar : enUS;

	const [searchQuery, setSearchQuery] = useState("");
	const [activeTab, setActiveTab] = useState("all");

	const filteredLogs = useMemo(() => {
		return initialLogs.filter((log) => {
			// Tab filtering
			if (activeTab === "workspace") {
				if (!["session", "document", "event"].includes(log.type)) return false;
			} else if (activeTab === "credits") {
				if (log.type !== "audit" || !log.creditsSpent || log.creditsSpent <= 0)
					return false;
			} else if (activeTab === "system") {
				if (log.type !== "audit" || (log.creditsSpent && log.creditsSpent > 0))
					return false;
			}

			// Search filtering
			const searchLower = searchQuery.toLowerCase();
			return (
				log.details.toLowerCase().includes(searchLower) ||
				log.userName?.toLowerCase().includes(searchLower) ||
				log.action.toLowerCase().includes(searchLower)
			);
		});
	}, [initialLogs, searchQuery, activeTab]);

	const ACTION_CONFIG: Record<string, { color: string; icon: React.ElementType }> = {
		LEGAL_DRAFTING: {
			color: "bg-indigo-50/50 text-indigo-600 border-indigo-100",
			icon: Database,
		},
		LEGAL_ANALYSIS: {
			color: "bg-amber-50/50 text-amber-600 border-amber-100",
			icon: Sparkles,
		},
		LEGAL_RESEARCH: {
			color: "bg-sky-50/50 text-sky-600 border-sky-100",
			icon: Activity,
		},
		CHATS_MESSAGE: {
			color: "bg-emerald-50/50 text-emerald-600 border-emerald-100",
			icon: MessageSquare,
		},
		CONTRACT_GENERATION: {
			color: "bg-purple-50/50 text-purple-600 border-purple-100",
			icon: Shield,
		},
		BILLING: {
			color: "bg-emerald-50/50 text-emerald-600 border-emerald-100",
			icon: CreditCard,
		},
		TEAM_INVITE: {
			color: "bg-blue-50/50 text-blue-600 border-blue-100",
			icon: Info,
		},
		ADMIN_JURISDICTION: {
			color: "bg-rose-50/50 text-rose-600 border-rose-100",
			icon: Settings,
		},
		ADMIN_KB: {
			color: "bg-violet-50/50 text-violet-600 border-violet-100",
			icon: Database,
		},
		ADMIN_INVITE: {
			color: "bg-cyan-50/50 text-cyan-600 border-cyan-100",
			icon: Settings,
		},
		ADMIN_DEMO: {
			color: "bg-teal-50/50 text-teal-600 border-teal-100",
			icon: Shield,
		},
		session: {
			color: "bg-blue-50/50 text-blue-600 border-blue-100",
			icon: Plus,
		},
		document: {
			color: "bg-orange-50/50 text-orange-600 border-orange-100",
			icon: FileText,
		},
		event: {
			color: "bg-rose-50/50 text-rose-600 border-rose-100",
			icon: Calendar,
		},
	};

	return (
		<div className="space-y-6">
			{/* Search & Filter Header */}
			<div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/50 backdrop-blur-md p-4 rounded-3xl border border-white shadow-sm">
				<Tabs
					defaultValue="all"
					className="w-full md:w-auto"
					onValueChange={setActiveTab}
				>
					<TabsList className="bg-slate-100/50 p-1 rounded-2xl h-12">
						<TabsTrigger
							value="all"
							className="rounded-xl px-6 font-bold transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm"
						>
							{t("tabs.all")}
						</TabsTrigger>
						<TabsTrigger
							value="workspace"
							className="rounded-xl px-6 font-bold transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm"
						>
							{t("tabs.workspace")}
						</TabsTrigger>
						<TabsTrigger
							value="credits"
							className="rounded-xl px-6 font-bold transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm"
						>
							{t("tabs.credits")}
						</TabsTrigger>
						<TabsTrigger
							value="system"
							className="rounded-xl px-6 font-bold transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm"
						>
							{t("tabs.system")}
						</TabsTrigger>
					</TabsList>
				</Tabs>

				<div className="relative w-full md:w-80 group">
					<Search className="absolute start-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
					<Input
						placeholder={t("searchPlaceholder")}
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="ps-11 h-12 bg-white border-slate-100 rounded-2xl focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 shadow-sm transition-all"
					/>
				</div>
			</div>

			{/* Activity Timeline */}
			<div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-xl overflow-hidden min-h-[400px]">
				{filteredLogs.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-32 text-slate-400 gap-6 animate-in fade-in duration-700">
						<div className="h-24 w-24 bg-slate-50 rounded-3xl flex items-center justify-center border-dashed border-2 border-slate-200">
							<Info className="h-10 w-10 opacity-20" />
						</div>
						<div className="text-center space-y-1">
							<p className="text-xl font-bold italic text-slate-600">
								{t("noLogs")}
							</p>
							<p className="text-sm font-medium opacity-60">
								{t("noLogsDesc")}
							</p>
						</div>
					</div>
				) : (
					<div className="divide-y divide-slate-100/50">
						{filteredLogs.map((log, idx) => {
							const config = ACTION_CONFIG[log.action] ||
								ACTION_CONFIG[log.type] || {
									color: "bg-slate-50 text-slate-400",
									icon: Activity,
								};
							const Icon = config.icon;

							return (
								<div
									key={log.id}
									className={cn(
										"p-6 hover:bg-white/80 transition-all flex items-center justify-between group relative overflow-hidden",
										"animate-in fade-in slide-in-from-bottom-2 duration-500",
										`delay-[${idx * 50}ms]`,
									)}
								>
									<div className="flex items-center gap-6 relative z-10">
										<div
											className={cn(
												"h-14 w-14 rounded-2xl flex items-center justify-center transition-all border group-hover:scale-105 group-hover:shadow-md",
												config.color,
											)}
										>
											<Icon className="h-6 w-6" />
										</div>

										<div className="space-y-1.5">
											<div className="flex items-center gap-3">
												<span className="font-black text-slate-900 text-lg tracking-tight">
													{log.userName || "System"}
												</span>
												<span className="text-[10px] uppercase font-black text-slate-300">
													•{" "}
													{format(log.createdAt, "HH:mm", {
														locale: dateLocale,
													})}
												</span>
											</div>

											<div className="flex items-center gap-3">
												<span
													className={cn(
														"text-[9px] px-2 py-0.5 rounded-md font-black border uppercase tracking-wider",
														config.color,
													)}
												>
													{t(`labels.${log.action}`)}
												</span>
												<p className="text-slate-500 font-medium leading-relaxed truncate max-w-[200px] md:max-w-xl">
													{log.details}
												</p>
											</div>
										</div>
									</div>

									<div className="flex items-center gap-8 relative z-10">
										{log.creditsSpent !== undefined && log.creditsSpent > 0 && (
											<div className="flex flex-col items-end">
												<span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1.5">
													{t("stats.points")}
												</span>
												<div className="bg-rose-50 text-rose-600 px-3 py-1 rounded-lg font-black text-sm border border-rose-100 shadow-sm shadow-rose-50 transition-transform group-hover:scale-110">
													-{log.creditsSpent}
												</div>
											</div>
										)}

										<div className="text-end hidden md:block w-32">
											<p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">
												{t("date")}
											</p>
											<p className="text-sm font-bold text-slate-600">
												{format(log.createdAt, "d MMMM yyyy", {
													locale: dateLocale,
												})}
											</p>
										</div>

										{log.href && (
											<Link
												href={log.href}
												className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200 text-slate-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-slate-900 hover:text-white hover:border-slate-900"
											>
												<ArrowUpRight className="h-5 w-5" />
											</Link>
										)}
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
