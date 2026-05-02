import { db } from "@/db";
import {
	users,
	workSessions,
	sessionDocs,
	savedDocuments,
	creditBuckets,
} from "@/db/schema";
import { eq, desc, sql, count, or, isNull, sum } from "drizzle-orm";
import {
	Scale,
	FileText,
	Blocks,
	Search,
	Calendar,
	ChevronLeft,
	WalletCards,
	Clock,
	AlertCircle,
	Gavel,
	Timer,
	Plus,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InstantSessionButton } from "@/components/legal/InstantSessionButton";
import { AddEventModal } from "@/components/legal/AddEventModal";
import { format, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
	getUpcomingLegalEvents,
	getSessionsWithNextAction,
} from "@/lib/events";
import { ClientOnly } from "@/components/global/ClientOnly";

interface LegalDashboardProps {
	userId: string;
	userName: string;
	organizationId: string;
}

export async function LegalDashboard({
	userId,
	userName,
	organizationId,
}: LegalDashboardProps) {
	// Optimize: Parallelize all database queries for performance
	const [
		upcomingEvents,
		activeProjects,
		latestCaseDocsResult,
		sessionDocsCountResult,
		personalDocsCountResult,
		sessionsCountResult,
		creditsResult,
	] = await Promise.all([
		getUpcomingLegalEvents(organizationId),
		getSessionsWithNextAction(organizationId),
		db
			.select({
				id: sessionDocs.id,
				title: sessionDocs.title,
				createdAt: sessionDocs.createdAt,
				projectId: sessionDocs.sessionId,
			})
			.from(sessionDocs)
			.innerJoin(workSessions, eq(sessionDocs.sessionId, workSessions.id))
			.where(eq(workSessions.organizationId, organizationId))
			.orderBy(desc(sessionDocs.createdAt))
			.limit(10),
		db
			.select({ value: count() })
			.from(sessionDocs)
			.innerJoin(workSessions, eq(sessionDocs.sessionId, workSessions.id))
			.where(eq(workSessions.organizationId, organizationId)),
		db
			.select({ value: count() })
			.from(savedDocuments)
			.where(eq(savedDocuments.organizationId, organizationId)),
		db
			.select({ value: count() })
			.from(workSessions)
			.where(eq(workSessions.organizationId, organizationId)),
		db
			.select({ value: sum(creditBuckets.amount) }) // Real Credits
			.from(creditBuckets)
			.where(eq(creditBuckets.organizationId, organizationId)),
	]);

	const credits = Number(creditsResult[0]?.value || 0);
	const latestCaseDocs = latestCaseDocsResult;
	const savedDocsCount =
		Number(sessionDocsCountResult[0]?.value || 0) +
		Number(personalDocsCountResult[0]?.value || 0);
	const activeCasesCount = Number(sessionsCountResult[0]?.value || 0);

	// Helper for tag labels
	const getTagLabel = (project: any) => {
		const { getLocalizedCategoryName } = require("@/lib/kb/category-utils");
		// 1. If we have rich category data from the join, use it
		if (project.categoryNameAr || project.categoryNameEn) {
			return getLocalizedCategoryName(
				{
					id: project.categoryId,
					slug: project.categorySlug,
					nameAr: project.categoryNameAr,
					nameEn: project.categoryNameEn,
				},
				"ar",
			);
		}
		// 2. Fallback to the tag field or the default "General"
		const targetTag = project.tag || "GENERAL";
		return getLocalizedCategoryName(
			{ id: targetTag, slug: targetTag, nameAr: null, nameEn: null },
			"ar",
		);
	};

	// Merge and sort activity
	const recentActivities = [
		...activeProjects.slice(0, 5).map((p) => ({
			id: p.id,
			title: p.title,
			subtitle: "تم بدء جلسة عمل جديدة",
			time: p.createdAt || new Date(),
			icon: Blocks,
			href: `/dashboard/sessions/${p.id}`,
		})),
		...latestCaseDocs.map((d) => ({
			id: d.id,
			title: d.title,
			subtitle: "تم حفظ مستند قانوني",
			time: d.createdAt || new Date(),
			icon: FileText,
			href: d.projectId
				? `/dashboard/sessions/${d.projectId}`
				: "/dashboard/documents",
		})),
		...upcomingEvents.map((e) => ({
			id: e.id,
			title: e.title,
			subtitle: `موعد مرتبط بجلسة: ${e.projectTitle}`,
			time: new Date(e.eventDate),
			icon: Gavel,
			href: `/dashboard/sessions/${e.projectId}`,
		})),
	]
		.sort((a, b) => b.time.getTime() - a.time.getTime())
		.slice(0, 5)
		.map((act) => ({
			...act,
			timeLabel: formatDistanceToNow(act.time, { addSuffix: true, locale: ar }),
		}));

	// Analytics (Resolved globally)

	return (
		<div
			className="max-w-[1400px] mx-auto space-y-10 animate-in fade-in duration-500 rtl p-4 md:p-8"
			dir="rtl"
		>
			{/* Top Header Section */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
				<div className="space-y-1">
					<h1 className="text-4xl font-black text-slate-900 tracking-tight">
						مرحباً بك، {userName}!
					</h1>
					<p className="text-slate-500 font-medium">
						إليك ملخص سريع لنشاطك القانوني لهذا اليوم.
					</p>
				</div>
			</div>

			{/* Top Section: Analytics & Calendar */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
				{/* Analytics & Stats Overview */}
				<div className="lg:col-span-8 flex flex-col gap-6">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
						<div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-full">
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
									<Scale className="h-5 w-5" />
								</div>
								<p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
									الجلسات النشطة
								</p>
							</div>
							<div className="mt-3">
								<p className="text-2xl font-black text-slate-900">
									{activeCasesCount}
								</p>
								<p className="text-xs text-slate-400 font-medium mt-1">
									جلسة عمل مفتوحة حالياً
								</p>
							</div>
						</div>

						<div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-full">
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
									<FileText className="h-5 w-5" />
								</div>
								<p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
									المستندات المحفوظة
								</p>
							</div>
							<div className="mt-3">
								<p className="text-2xl font-black text-slate-900">
									{savedDocsCount}
								</p>
								<p className="text-xs text-slate-400 font-medium mt-1">
									مذكرة وصحيفة تم إنشاؤها
								</p>
							</div>
						</div>

						<div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-full">
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
									<WalletCards className="h-5 w-5" />
								</div>
								<p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
									الرصيد المتاح
								</p>
							</div>
							<div className="mt-3">
								<p className="text-2xl font-black text-slate-900">
									{credits}{" "}
									<span className="text-xs font-normal text-slate-500 uppercase">
										نقطة
									</span>
								</p>
								<p className="text-xs text-slate-400 font-medium mt-1">
									قابلة للاستخدام لخدمات الذكاء الاصطناعي
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Calendar & Reminders Widget */}
				<div className="lg:col-span-4 w-full h-full">
					<div className="bg-white rounded-3xl p-6 border shadow-sm h-full flex flex-col">
						<div className="flex items-center gap-3 mb-6">
							<div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
								<Gavel className="h-5 w-5" />
							</div>
							<h4 className="font-bold text-lg text-slate-900">
								المواعيد القادمة
							</h4>
						</div>

						{upcomingEvents.length === 0 ? (
							<div className="flex-1 flex flex-col items-center justify-center text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
								<Timer className="h-10 w-10 text-slate-300 mx-auto mb-3" />
								<p className="text-sm text-slate-500 font-medium px-4">
									لا توجد جلسات مجدولة حالياً.
								</p>
							</div>
						) : (
							<ul className="space-y-3 flex-1 overflow-y-auto pr-2 max-h-[180px] custom-scrollbar">
								{upcomingEvents.map((event, index) => (
									<li
										key={event.id}
										className="flex gap-4 items-start relative overflow-hidden"
									>
										{/* Status Dot with Color Coding */}
										<div
											className={cn(
												"h-3 w-3 rounded-full mt-2.5 z-10 shrink-0",
												"bg-indigo-500",
											)}
										/>

										<Link
											href={`/dashboard/sessions/${event.projectId}`}
											className="flex-1 group"
										>
											<div
												className={cn(
													"p-3 rounded-2xl border transition-all hover:shadow-md",
													"bg-indigo-50/30 border-indigo-100/50 group-hover:bg-indigo-50",
												)}
											>
												<p className="font-bold text-sm text-slate-900 line-clamp-1">
													{event.title}
												</p>
												<div className="flex items-center justify-between mt-1">
													<p className="text-[10px] font-bold text-slate-500 truncate max-w-[100px]">
														{event.projectTitle}
													</p>
													<p className="text-[10px] font-black text-indigo-600 bg-white px-2 py-0.5 rounded border">
														<ClientOnly fallback="--">
															{format(new Date(event.eventDate), "d MMMM", {
																locale: ar,
															})}
														</ClientOnly>
													</p>
												</div>
											</div>
										</Link>
									</li>
								))}
							</ul>
						)}
					</div>
				</div>
			</div>

			{/* Main Action Area: Case Projects */}
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-700">
							<Blocks className="h-5 w-5" />
						</div>
						<h2 className="text-2xl font-bold text-slate-900">
							جلسات العمل النشطة (Active Sessions)
						</h2>
					</div>
				</div>

				{activeProjects.length === 0 ? (
					<div className="bg-white rounded-3xl p-12 border border-dashed border-slate-300 text-center space-y-4">
						<div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
							<Scale className="h-8 w-8" />
						</div>
						<div>
							<h3 className="text-xl font-bold text-slate-900">
								لا يوجد جلسات حالياً
							</h3>
							<p className="text-slate-500 max-w-sm mx-auto mt-2">
								ابدأ ببدء أول جلسة عمل لك لتجربة قوة المساعد القانوني الذكي في
								التحليل والصياغة من خلال القائمة الجانبية.
							</p>
						</div>
					</div>
				) : (
					<div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 custom-scrollbar">
						{activeProjects.map((project) => (
							<Link
								key={project.id}
								href={`/dashboard/sessions/${project.id}`}
								className="group shrink-0 w-[280px] snap-start bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all relative overflow-hidden flex flex-col"
							>
								<div className="absolute top-0 right-0 w-1.5 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
								<div className="flex justify-between items-start mb-3">
									<div className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-lg border border-indigo-100">
										{getTagLabel(project)}
									</div>
								</div>
								<h3
									className="text-base font-bold text-slate-900 mb-2 truncate group-hover:text-indigo-600 transition-colors"
									title={project.title ?? undefined}
								>
									{project.title}
								</h3>

								{/* Dynamic Next Action Label */}
								{project.nextAction ? (
									<div className="mb-4 p-2.5 bg-red-50 rounded-2xl border border-red-100 flex items-start gap-2">
										<div className="mt-0.5 text-indigo-600">
											<Clock className="h-3.5 w-3.5" />
										</div>
										<div>
											<p className="text-[10px] font-black text-red-900 leading-none">
												الإجراء القادم:
											</p>
											<p
												className="text-[10px] text-red-700 mt-1 font-bold truncate max-w-[170px]"
												title={project.nextAction.title ?? undefined}
											>
												<ClientOnly fallback="...">
													{project.nextAction.title} (
													{format(
														new Date(project.nextAction.eventDate),
														"d/M",
													)}
													)
												</ClientOnly>
											</p>
										</div>
									</div>
								) : (
									<div className="mb-4 p-2.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2">
										<Clock className="h-3.5 w-3.5 text-slate-400" />
										<p className="text-[10px] text-slate-500 font-medium">
											لا توجد مواعيد مجدولة.
										</p>
									</div>
								)}

								<div className="flex flex-col gap-1 text-[11px] text-slate-500 mt-auto">
									<div className="flex items-center gap-1.5">
										<AlertCircle className="h-3 w-3" />
										<span>نشطة</span>
									</div>
									<div className="flex items-center gap-1.5 opacity-70">
										<Calendar className="h-3 w-3" />
										<ClientOnly fallback={<span>...</span>}>
											<span>
												{format(
													project.createdAt || new Date(),
													"d MMMM yyyy",
													{ locale: ar },
												)}
											</span>
										</ClientOnly>
									</div>
								</div>
							</Link>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
