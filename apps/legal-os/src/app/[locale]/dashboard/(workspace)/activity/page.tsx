import { db } from "@/db";
import {
	auditLogs,
	users,
	workSessions,
	sessionDocs,
	sessionEvents,
} from "@/db/schema";
import { eq, desc, and, sql, gte } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Shield, Flame, ActivityIcon, Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import {
	ActivityList,
	type ActivityItem,
} from "@/components/dashboard/ActivityList";

export default async function ActivityLogPage() {
	const t = await getTranslations("Activity");
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		return (
			<div className="p-8 text-center font-bold italic">Unauthorized...</div>
		);
	}

	const isAdmin = session.user.industryRole === "ADMIN";
	const activeOrgId =
		session.session.activeOrganizationId || session.user.activeOrganizationId;
	const today = startOfDay(new Date());

	// 1. Fetch Today's Stats (Audit Logs specifically for points)
	const stats = await db
		.select({
			action: auditLogs.action,
			totalCredits: sql<number>`CAST(sum(${auditLogs.creditsSpent}) AS INTEGER)`,
		})
		.from(auditLogs)
		.where(
			and(
				gte(auditLogs.createdAt, today),
				isAdmin
					? sql`true`
					: activeOrgId
						? eq(auditLogs.organizationId, activeOrgId)
						: eq(auditLogs.userId, session.user.id),
			),
		)
		.groupBy(auditLogs.action);

	const totalCreditsToday = stats.reduce(
		(sum, s) => sum + (s.totalCredits || 0),
		0,
	);

	// 2. Fetch Aggregated Logs for the timeline

	// A. Audit Logs
	const dbAuditLogs = await db
		.select({
			id: auditLogs.id,
			action: auditLogs.action,
			details: auditLogs.details,
			creditsSpent: auditLogs.creditsSpent,
			createdAt: auditLogs.createdAt,
			userName: users.name,
		})
		.from(auditLogs)
		.innerJoin(users, eq(auditLogs.userId, users.id))
		.where(
			isAdmin
				? sql`true`
				: activeOrgId
					? eq(auditLogs.organizationId, activeOrgId)
					: eq(auditLogs.userId, session.user.id),
		)
		.orderBy(desc(auditLogs.createdAt))
		.limit(50);

	// B. Workspace Activity (Sessions, Docs, Events)
	const dbSessions = await db
		.select({
			id: workSessions.id,
			title: workSessions.title,
			createdAt: workSessions.createdAt,
		})
		.from(workSessions)
		.where(
			activeOrgId ? eq(workSessions.organizationId, activeOrgId) : sql`false`,
		)
		.orderBy(desc(workSessions.createdAt))
		.limit(20);

	const dbDocs = await db
		.select({
			id: sessionDocs.id,
			title: sessionDocs.title,
			createdAt: sessionDocs.createdAt,
			sessionTitle: workSessions.title,
			sessionId: sessionDocs.sessionId,
		})
		.from(sessionDocs)
		.innerJoin(workSessions, eq(sessionDocs.sessionId, workSessions.id))
		.where(
			activeOrgId ? eq(workSessions.organizationId, activeOrgId) : sql`false`,
		)
		.orderBy(desc(sessionDocs.createdAt))
		.limit(20);

	const dbEvents = await db
		.select({
			id: sessionEvents.id,
			title: sessionEvents.title,
			createdAt: sessionEvents.createdAt,
			sessionTitle: workSessions.title,
			sessionId: sessionEvents.sessionId,
		})
		.from(sessionEvents)
		.innerJoin(workSessions, eq(sessionEvents.sessionId, workSessions.id))
		.where(
			activeOrgId ? eq(workSessions.organizationId, activeOrgId) : sql`false`,
		)
		.orderBy(desc(sessionEvents.createdAt))
		.limit(20);

	// Unified Mapping
	const unifiedLogs: ActivityItem[] = [
		...dbAuditLogs.map((log) => ({
			id: log.id,
			type: "audit" as const,
			action: log.action,
			details: log.details || "",
			creditsSpent: log.creditsSpent,
			createdAt: log.createdAt,
			userName: log.userName,
		})),
		...dbSessions.map((s) => ({
			id: `sess-${s.id}`,
			type: "session" as const,
			action: "session",
			details: t("workspaceActions.newSession"),
			createdAt: s.createdAt || new Date(),
			href: `/dashboard/sessions/${s.id}`,
		})),
		...dbDocs.map((d) => ({
			id: `doc-${d.id}`,
			type: "document" as const,
			action: "document",
			details: t("workspaceActions.inSession", {
				session: d.sessionTitle || "",
			}),
			createdAt: d.createdAt || new Date(),
			href: `/dashboard/sessions/${d.sessionId}`,
		})),
		...dbEvents.map((e) => ({
			id: `ev-${e.id}`,
			type: "event" as const,
			action: "event",
			details: t("workspaceActions.eventIn", { session: e.sessionTitle || "" }),
			createdAt: e.createdAt || new Date(),
			href: `/dashboard/sessions/${e.sessionId}`,
		})),
	]
		.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
		.slice(0, 100);

	return (
		<div
			className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 ps-4 pe-4 md:ps-0 md:pe-0"
			dir="rtl"
		>
			{/* Header Section */}
			<div className="relative overflow-hidden bg-white p-8 md:p-12 rounded-[3rem] border border-white shadow-2xl shadow-indigo-100/20 flex flex-col md:flex-row items-center justify-between gap-10">
				<div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl -mr-32 -mt-32 animate-pulse" />
				<div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-50/30 rounded-full blur-3xl -ml-32 -mb-32 animate-pulse delay-1000" />

				<div className="space-y-4 relative text-center md:text-right">
					<div className="flex flex-col md:flex-row items-center gap-4">
						<h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">
							{t("title").split(" ")[0]}{" "}
							<span className="text-indigo-600">
								{t("title").split(" ").slice(1).join(" ")}
							</span>
						</h1>
						{isAdmin && (
							<span className="bg-indigo-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-xl shadow-indigo-100">
								{t("viewAdmin")}
							</span>
						)}
					</div>
					<p className="text-slate-500 text-lg md:text-xl font-medium max-w-2xl">
						{t("subtitle")}
					</p>
				</div>

				<div className="relative hidden md:block">
					<div className="h-24 w-24 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white shadow-[0_20px_40px_rgba(0,0,0,0.15)] rotate-3">
						<ActivityIcon className="h-10 w-10 animate-bounce" />
					</div>
					<div className="absolute -top-3 -right-3 h-10 w-10 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg -rotate-12">
						<Sparkles className="h-5 w-5" />
					</div>
				</div>
			</div>

			{/* Stats Section */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
				<Card className="border-none shadow-xl rounded-[2.5rem] bg-gradient-to-br from-indigo-600 to-violet-700 text-white p-1 hover:scale-[1.02] transition-transform duration-500">
					<CardContent className="p-8 space-y-6">
						<div className="flex items-center justify-between">
							<div className="h-14 w-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/10">
								<Flame className="h-7 w-7 text-white" />
							</div>
							<span className="text-[10px] font-black uppercase tracking-widest opacity-60 bg-black/10 px-3 py-1 rounded-full">
								{t("stats.today")}
							</span>
						</div>
						<div>
							<p className="text-sm font-bold opacity-70 mb-1">
								{t("stats.totalCredits")}
							</p>
							<h3 className="text-5xl font-black leading-none flex items-baseline gap-2">
								{totalCreditsToday}
								<span className="text-lg opacity-50 font-medium">
									{t("stats.points")}
								</span>
							</h3>
						</div>
					</CardContent>
				</Card>

				{["LEGAL_ANALYSIS", "LEGAL_RESEARCH", "CHATS_MESSAGE"].map((action) => {
					const actionStat = stats.find((s) => s.action === action);
					return (
						<Card
							key={action}
							className="border-none shadow-sm rounded-[2.5rem] bg-white group hover:shadow-xl hover:-translate-y-1 transition-all duration-500 flex flex-col justify-center"
						>
							<CardContent className="p-8 flex items-center gap-6">
								<div
									className={cn(
										"h-16 w-16 rounded-[1.5rem] flex items-center justify-center transition-all group-hover:rotate-6 shadow-sm",
										action === "LEGAL_ANALYSIS"
											? "bg-amber-50 text-amber-600"
											: action === "LEGAL_RESEARCH"
												? "bg-sky-50 text-sky-600"
												: "bg-emerald-50 text-emerald-600",
									)}
								>
									<Activity className="h-8 w-8" />
								</div>
								<div>
									<p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
										{t(`labels.${action}`)}
									</p>
									<h3 className="text-3xl font-black text-slate-900">
										{actionStat?.totalCredits || 0}{" "}
										<span className="text-xs font-medium text-slate-300">
											{t("stats.points")}
										</span>
									</h3>
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>

			{/* Modern High-End Timeline Header */}
			<div className="flex flex-col md:flex-row items-end justify-between gap-4 px-2">
				<div className="space-y-1">
					<div className="flex items-center gap-3">
						<Shield className="h-6 w-6 text-indigo-500" />
						<h2 className="text-3xl font-black text-slate-900 tracking-tight">
							{t("auditHeader")}
						</h2>
					</div>
					<p className="text-slate-400 font-medium ps-9">
						{t("recentCount", { count: unifiedLogs.length })}
					</p>
				</div>
			</div>

			<ActivityList initialLogs={unifiedLogs} />
		</div>
	);
}
