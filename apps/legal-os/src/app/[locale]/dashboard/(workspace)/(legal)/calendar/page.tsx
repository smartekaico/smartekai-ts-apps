import { db } from "@/db";
import { appointments, sessionEvents, workSessions } from "@/db/schema";
import { eq, and, gt, asc, or, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, Bell, Scale, Clock } from "lucide-react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default async function DashboardCalendarPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		return (
			<div className="p-8 text-center font-bold">يرجى تسجيل الدخول...</div>
		);
	}

	const userId = session.user.id;
	const activeOrgId =
		session.session.activeOrganizationId || session.user.activeOrganizationId;

	// Fetch both personal/org appointments and session events
	const [userAppointments, projectEvents] = await Promise.all([
		db
			.select()
			.from(appointments)
			.where(
				and(
					eq(appointments.userId, userId),
					activeOrgId
						? or(
								eq(appointments.organizationId, activeOrgId),
								eq(appointments.userId, userId),
							)
						: eq(appointments.userId, userId),
				),
			)
			.orderBy(asc(appointments.appointmentDate)),
		db
			.select({
				id: sessionEvents.id,
				title: sessionEvents.title,
				eventType: sessionEvents.eventType,
				eventDate: sessionEvents.eventDate,
				status: sessionEvents.status,
				projectTitle: workSessions.title,
			})
			.from(sessionEvents)
			.innerJoin(workSessions, eq(sessionEvents.sessionId, workSessions.id))
			.where(
				and(
					activeOrgId
						? eq(workSessions.organizationId, activeOrgId)
						: eq(workSessions.id, 0), // fallback if no org
					gt(sessionEvents.eventDate, new Date()),
				),
			)
			.orderBy(asc(sessionEvents.eventDate)),
	]);

	// Combine and sort events
	const allEvents = [
		...userAppointments.map((a) => ({
			id: a.id,
			title: a.title,
			date: a.appointmentDate,
			type: "APPOINTMENT",
			status: a.status,
			label: "موعد إداري",
		})),
		...projectEvents.map((e) => ({
			id: e.id,
			title: `${e.title} - ${e.projectTitle}`,
			date: e.eventDate,
			type: e.eventType,
			status: e.status,
			label: e.eventType === "Hearing" ? "جلسة قضائية" : "إجراء قانوني",
		})),
	].sort((a, b) => a.date.getTime() - b.date.getTime());

	return (
		<div
			className="space-y-8 animate-in fade-in duration-700 rtl text-right"
			dir="rtl"
		>
			{/* Header Section */}
			<div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between">
				<div>
					<h1 className="text-4xl font-black tracking-tight text-slate-900 mb-2">
						التقويم القانوني (Calendar)
					</h1>
					<p className="text-slate-500 text-lg font-medium">
						تتبع الجلسات، المواعيد، والمواعيد النهائية في مكان واحد.
					</p>
				</div>
				<div className="h-16 w-16 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 shadow-inner">
					<CalendarIcon className="h-8 w-8" />
				</div>
			</div>

			<div className="grid grid-cols-1 gap-8">
				<Card className="border-none shadow-sm rounded-[2rem] overflow-hidden bg-white">
					<CardHeader className="bg-slate-50/50 border-b p-8">
						<CardTitle className="text-2xl font-bold flex items-center gap-3">
							<Clock className="h-6 w-6 text-indigo-600" />
							الجدول الزمني القادم
						</CardTitle>
					</CardHeader>
					<CardContent className="p-8">
						{allEvents.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
								<Bell className="h-12 w-12 opacity-20" />
								<p className="text-xl font-bold italic">
									لا توجد أي مواعيد أو جلسات حالياً.
								</p>
							</div>
						) : (
							<div className="relative border-r-2 border-slate-100 mr-6 pr-10 space-y-12">
								{allEvents.map((event) => (
									<div key={event.id} className="relative group">
										{/* Timeline Dot */}
										<span
											className={cn(
												"absolute -right-[46px] top-2 h-5 w-5 rounded-full border-4 border-white shadow-sm transition-transform group-hover:scale-125 z-10",
												event.type === "Hearing"
													? "bg-red-500"
													: event.type === "APPOINTMENT"
														? "bg-indigo-500"
														: "bg-amber-500",
											)}
										/>

										<div className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 group-hover:border-indigo-100">
											<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
												<div>
													<div className="flex items-center gap-3 mb-2">
														<span
															className={cn(
																"text-[10px] font-black px-3 py-1 rounded-full border",
																event.type === "Hearing"
																	? "bg-red-50 border-red-100 text-red-600"
																	: "bg-indigo-50 border-indigo-100 text-indigo-600",
															)}
														>
															{event.label}
														</span>
														<span className="text-sm font-bold text-slate-400">
															{format(event.date, "EEEE, d MMMM yyyy", {
																locale: ar,
															})}
														</span>
													</div>
													<h3 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase">
														{event.title}
													</h3>
												</div>

												<div className="flex items-center gap-4">
													<div className="text-right">
														<p className="text-xs font-bold text-slate-400">
															الحالة
														</p>
														<p
															className={cn(
																"text-sm font-black",
																event.status === "Upcoming" ||
																	event.status === "upcoming"
																	? "text-indigo-600"
																	: "text-slate-500",
															)}
														>
															{event.status === "Upcoming" ||
															event.status === "upcoming"
																? "قادم"
																: "مكتمل"}
														</p>
													</div>
													<div className="h-10 w-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
														{event.type === "Hearing" ? (
															<Scale className="h-5 w-5" />
														) : (
															<Clock className="h-5 w-5" />
														)}
													</div>
												</div>
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
