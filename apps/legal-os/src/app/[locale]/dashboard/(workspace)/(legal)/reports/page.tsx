"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
	FileBarChart,
	Printer,
	Calendar as CalendarIcon,
	Loader2,
	User,
	Scale,
	Gavel,
	Timer,
	Building2,
	Filter,
	Layers,
	Hash,
	ChevronLeft,
	type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ClientOnly } from "@/components/global/ClientOnly";
import Link from "next/link";

interface ReportEvent {
	id: number;
	title: string;
	eventType: string;
	eventDate: string;
	court: string | null;
	circuit: string | null;
	rollNumber: string | null;
	description: string | null;
	status: string;
	sessionTitle: string;
	sessionTag: string | null;
	assignedTo: string | null;
	plaintiff: string | null;
	defendant: string | null;
}

const EVENT_TYPE_CONFIG: Record<
	string,
	{ label: string; icon: LucideIcon; color: string; bg: string }
> = {
	Hearing: {
		label: "جلسة محكمة",
		icon: Gavel,
		color: "text-red-600",
		bg: "bg-red-50",
	},
	Expert: {
		label: "إدارة الخبراء",
		icon: Scale,
		color: "text-purple-600",
		bg: "bg-purple-50",
	},
	Deadline: {
		label: "موعد نهائي",
		icon: Timer,
		color: "text-amber-600",
		bg: "bg-amber-50",
	},
	Meeting: {
		label: "اجتماع عمل",
		icon: Building2,
		color: "text-sky-600",
		bg: "bg-sky-50",
	},
};

export default function ReportsPage() {
	const t = useTranslations("Dashboard");
	const tEvents = useTranslations("Dashboard"); // Reusing for now
	const locale = useLocale();
	const dateLocale = locale === "ar" ? ar : enUS;
	const { data: session } = authClient.useSession();

	const [loading, setLoading] = useState(true);
	const [events, setEvents] = useState<ReportEvent[]>([]);
	const [startDate, setStartDate] = useState<string>(
		format(new Date(), "yyyy-MM-dd"),
	);
	const [endDate, setEndDate] = useState<string>(
		format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
	);

	useEffect(() => {
		fetchReportData();
	}, []);

	const fetchReportData = async () => {
		setLoading(true);
		try {
			const res = await fetch(
				`/api/legal/reports?from=${startDate}&to=${endDate}`,
			);
			if (res.ok) {
				const data = await res.json();
				setEvents(data);
			}
		} catch (error) {
			console.error("Failed to fetch report data", error);
			toast.error(
				locale === "ar" ? "فشل تحميل البيانات" : "Failed to load report data",
			);
		} finally {
			setLoading(false);
		}
	};

	const handlePrint = () => {
		window.print();
	};

	if (loading) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
				<Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
				<p className="font-bold text-slate-500">{t("loading")}</p>
			</div>
		);
	}

	return (
		<div className="p-4 lg:p-10 max-w-7xl mx-auto space-y-10 rtl" dir="rtl">
			{/* Header Section */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-6 no-print">
				<div className="space-y-2">
					<div className="flex items-center gap-3">
						<div className="h-12 w-12 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl shadow-indigo-100">
							<FileBarChart className="h-6 w-6" />
						</div>
						<h1 className="text-4xl font-black text-slate-900 tracking-tight">
							{t("reports")}
						</h1>
					</div>
					<p className="text-slate-500 font-medium px-1">
						{locale === "ar"
							? "استخراج تقارير المواعيد القانونية للأيام السبعة القادمة"
							: "Generate legal appointment reports for the next 7 days"}
					</p>
				</div>

				<div className="flex flex-col sm:flex-row items-center gap-3">
					<div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-3 py-2 shadow-sm">
						<CalendarIcon className="h-4 w-4 text-slate-400" />
						<input
							type="date"
							value={startDate}
							onChange={(e) => setStartDate(e.target.value)}
							className="text-xs font-bold outline-none bg-transparent"
						/>
						<span className="text-slate-300 mx-1">/</span>
						<input
							type="date"
							value={endDate}
							onChange={(e) => setEndDate(e.target.value)}
							className="text-xs font-bold outline-none bg-transparent"
						/>
					</div>

					<Button
						onClick={fetchReportData}
						variant="outline"
						className="rounded-2xl h-14 w-14 p-0 border-slate-200 font-bold hover:bg-slate-50 transition-all"
						title={locale === "ar" ? "تحديث" : "Refresh"}
					>
						<Filter className="h-4 w-4" />
					</Button>
					<Button
						onClick={handlePrint}
						className="rounded-2xl h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-xl shadow-indigo-200 transition-all gap-3"
					>
						<Printer className="h-5 w-5" />
						{locale === "ar" ? "طباعة التقرير" : "Print Report"}
					</Button>
				</div>
			</div>

			{/* Print-Only Header */}
			<div className="hidden print:block mb-10 border-b-2 border-slate-900 pb-8">
				<div className="flex items-center justify-between">
					<div className="space-y-1">
						<h2 className="text-3xl font-black text-slate-900">
							مكتب {session?.user?.name || "المحاماة الذكي"}
						</h2>
						<p className="text-lg font-bold text-slate-600">
							{locale === "ar"
								? "تقرير الأجندة والمواعيد القانونية"
								: "Legal Agenda Report"}
						</p>
						<p className="text-sm text-slate-400 font-medium font-sans">
							{format(new Date(), "PPP", { locale: dateLocale })}
						</p>
					</div>
					<div className="text-right flex flex-col items-end gap-3">
						<Scale className="h-8 w-8 text-slate-900" />
						<p className="text-xl font-black text-slate-900">Lex Legal OS</p>
					</div>
				</div>
			</div>

			{/* Main Report Content */}
			<Card className="rounded-[40px] border-none shadow-2xl shadow-slate-200/50 overflow-hidden bg-white print:shadow-none print:rounded-none">
				<div className="overflow-x-auto">
					<table className="w-full text-right" dir="rtl">
						<thead>
							<tr className="border-b border-slate-100 bg-slate-50/50">
								<th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest min-w-[120px]">
									التاريخ والوقت
								</th>
								<th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest min-w-[180px]">
									الموضوع والوصف
								</th>
								<th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest min-w-[120px]">
									النوع
								</th>
								<th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest min-w-[150px]">
									المدعي (Plaintiff)
								</th>
								<th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest min-w-[150px]">
									المدعى عليه (Defendant)
								</th>
								<th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest min-w-[180px]">
									المحكمة / الرول
								</th>
								<th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest min-w-[120px]">
									المكلف
								</th>
								<th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest min-w-[150px]">
									جلسة العمل
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-50">
							{events.length === 0 ? (
								<tr>
									<td colSpan={6} className="py-24 text-center">
										<div className="flex flex-col items-center gap-4 text-slate-300">
											<CalendarIcon className="h-16 w-16 opacity-20" />
											<p className="text-xl font-black">
												لا توجد مواعيد مقررة في الفترة القادمة
											</p>
										</div>
									</td>
								</tr>
							) : (
								events.map((event) => {
									const config =
										EVENT_TYPE_CONFIG[event.eventType] ||
										EVENT_TYPE_CONFIG.Deadline;
									return (
										<tr
											key={event.id}
											className="hover:bg-slate-50/50 transition-colors group"
										>
											<td className="px-6 py-8 whitespace-nowrap">
												<div className="flex flex-col">
													<span className="text-base font-black text-slate-900">
														{format(new Date(event.eventDate), "eee, d MMM", {
															locale: dateLocale,
														})}
													</span>
													<span className="text-xs font-bold text-slate-400 font-sans tracking-tighter">
														{format(new Date(event.eventDate), "hh:mm a")}
													</span>
												</div>
											</td>
											<td className="px-6 py-8">
												<div className="space-y-1">
													<p className="text-base font-black text-slate-900">
														{event.title}
													</p>
													{event.description && (
														<p className="text-xs text-slate-500 font-medium line-clamp-2 max-w-[240px] italic">
															{event.description}
														</p>
													)}
												</div>
											</td>
											<td className="px-6 py-8 whitespace-nowrap">
												<div
													className={cn(
														"inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border-2",
														config.bg,
														"border-transparent text-xs font-black",
													)}
												>
													<config.icon
														className={cn("h-4 w-4", config.color)}
													/>
													<span className={config.color}>{config.label}</span>
												</div>
											</td>
											<td className="px-6 py-8">
												<div className="flex flex-col gap-1">
													<span className="text-sm font-black text-slate-900 line-clamp-2">
														{event.plaintiff || "-"}
													</span>
												</div>
											</td>
											<td className="px-6 py-8">
												<div className="flex flex-col gap-1">
													<span className="text-sm font-black text-slate-900 line-clamp-2">
														{event.defendant || "-"}
													</span>
												</div>
											</td>
											<td className="px-6 py-8">
												<div className="space-y-2">
													{event.court ? (
														<div className="flex items-center gap-2 text-slate-900">
															<Building2 className="h-4 w-4 text-slate-400" />
															<span className="text-sm font-black">
																{event.court}
															</span>
														</div>
													) : (
														<span className="text-xs font-bold text-slate-300">
															غير محدد
														</span>
													)}
													{(event.circuit || event.rollNumber) && (
														<div className="flex items-center gap-3 text-slate-500">
															{event.circuit && (
																<div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
																	<Layers className="h-3 w-3" />
																	<span className="text-[10px] font-bold">
																		{event.circuit}
																	</span>
																</div>
															)}
															{event.rollNumber && (
																<div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-100">
																	<Hash className="h-3 w-3" />
																	<span className="text-[10px] font-black">
																		رول {event.rollNumber}
																	</span>
																</div>
															)}
														</div>
													)}
												</div>
											</td>
											<td className="px-6 py-8 whitespace-nowrap">
												<div className="flex items-center gap-2 text-slate-600">
													<User className="h-4 w-4 text-slate-400" />
													<span className="text-sm font-black">
														{event.assignedTo || "لم يتم التكليف"}
													</span>
												</div>
											</td>
											<td className="px-6 py-8">
												<div className="flex flex-col max-w-[150px]">
													<span className="text-xs font-black text-indigo-600 truncate">
														{event.sessionTitle}
													</span>
													{event.sessionTag && (
														<span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
															{event.sessionTag}
														</span>
													)}
												</div>
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			</Card>

			{/* Footer Info - Print Only */}
			<div className="hidden print:flex justify-between items-center pt-8 border-t border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-widest font-sans">
				<span>
					lex.Law Copilot Legal Reports &copy; {new Date().getFullYear()}
				</span>
				<span>
					{locale === "ar" ? "تاريخ الاستخراج: " : "Generated: "}{" "}
					{new Date().toLocaleString()}
				</span>
			</div>

			<style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 15mm;
          }
          body {
            background: white !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          aside, nav, header {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
          table {
            border-collapse: collapse !important;
          }
          th {
             border-bottom: 2px solid #e2e8f0 !important;
             color: #64748b !important;
          }
          tr {
             page-break-inside: avoid;
             border-bottom: 1px solid #f1f5f9 !important;
          }
        }
      `}</style>
		</div>
	);
}
