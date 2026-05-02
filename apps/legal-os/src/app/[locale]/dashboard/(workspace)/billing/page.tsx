import { db } from "@/db";
import { users, ledgers, creditBuckets, organizations } from "@/db/schema";
import { eq, desc, and, gt, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
	WalletCards,
	Zap,
	CreditCard,
	History,
	ArrowUpRight,
	ShieldCheck,
	Sparkles,
	AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { CreditPackageGrid } from "@/components/billing/CreditPackageGrid";
import { ManualPackageGrid } from "@/components/billing/ManualPackageGrid";

export default async function BillingPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		return (
			<div className="flex items-center justify-center p-20 text-slate-500 font-bold">
				الرجاء تسجيل الدخول للوصول إلى بيانات الشحن والمحفظة.
			</div>
		);
	}

	const userId = session.user.id;

	const activeOrgId =
		session.session.activeOrganizationId || session.user.activeOrganizationId;

	const [orgResult, ledgerEntries, activeBuckets] = await Promise.all([
		activeOrgId
			? db
					.select()
					.from(organizations)
					.where(eq(organizations.id, activeOrgId))
					.limit(1)
			: Promise.resolve([]),
		db
			.select()
			.from(ledgers)
			.where(eq(ledgers.userId, userId))
			.orderBy(desc(ledgers.createdAt))
			.limit(15),
		activeOrgId
			? db
					.select()
					.from(creditBuckets)
					.where(
						and(
							eq(creditBuckets.organizationId, activeOrgId),
							gt(creditBuckets.amount, 0),
						),
					)
					.orderBy(desc(creditBuckets.createdAt))
			: [],
	]);

	const org = orgResult[0];
	const credits = org?.creditBalance || 0;

	return (
		<div
			className="max-w-[1200px] mx-auto space-y-12 animate-in fade-in duration-700 rtl pb-20 px-4 md:px-0"
			dir="rtl"
		>
			{/* Header Section */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/60 shadow-sm mt-4">
				<div className="space-y-1">
					<div className="flex items-center gap-3">
						<h1 className="text-4xl font-black text-slate-900 tracking-tight">
							الرصيد والاشتراكات
						</h1>
						<span className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-indigo-100">
							Billing Hub
						</span>
					</div>
					<p className="text-slate-500 font-medium text-lg leading-relaxed font-sans mt-2">
						إدارة رصيد نقاطك، خطة الاشتراك، وسجل المعاملات المالية.
					</p>
				</div>
				<div className="h-16 w-16 bg-slate-900 rounded-3xl flex items-center justify-center text-white shadow-xl rotate-3 hover:rotate-0 transition-transform duration-500 border border-slate-700">
					<WalletCards className="h-8 w-8" />
				</div>
			</div>

			{/* Hero Stats Card */}
			<div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden group">
				<div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] transition-all group-hover:scale-110" />
				<div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-purple-500/10 rounded-full blur-[80px]" />

				<div className="relative z-10 flex flex-col items-center text-center space-y-6">
					<div className="h-24 w-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center backdrop-blur-xl border border-white/10 mb-2 shadow-inner">
						<Sparkles className="h-12 w-12 text-indigo-400 animate-pulse" />
					</div>
					<div className="space-y-4">
						<span className="bg-indigo-500/20 backdrop-blur-md px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.2em] border border-white/10 text-indigo-200">
							رصيدك الحالي (Credits Balance)
						</span>
						<div className="flex items-baseline justify-center gap-4 mt-4">
							<span className="text-9xl font-black tabular-nums tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 drop-shadow-2xl">
								{credits}
							</span>
							<span className="text-2xl font-black text-indigo-300/80 uppercase tracking-tight">
								نقطة
							</span>
						</div>
					</div>
					<p className="text-indigo-200/70 font-medium max-w-xl text-lg leading-relaxed leading-7">
						يتم استهلاك النقاط عند استخدام أدوات الذكاء الاصطناعي المتطورة.
						نقاطك في Smartek AI Hub لا تنتهي صلاحيتها أبداً، مما يمنحك المرونة
						الكاملة في استخدامها في أي وقت.
					</p>

					{/* Buckets Breakdown */}
					{activeBuckets.length > 0 && (
						<div className="w-full max-w-2xl mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
							{activeBuckets.map((bucket) => (
								<div
									key={bucket.id}
									className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col justify-between group hover:bg-white/10 transition-colors"
								>
									<div className="flex items-center justify-between mb-2">
										<span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">
											تاريخ الشراء
										</span>
										<span className="text-xs font-bold text-white/50">
											{format(new Date(bucket.createdAt), "dd/MM/yyyy")}
										</span>
									</div>
									<div className="flex items-baseline gap-2">
										<span className="text-2xl font-black text-white">
											{bucket.amount}
										</span>
										<span className="text-[10px] font-bold text-white/40 uppercase">
											نقطة متبقية
										</span>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Credit Packages Grid */}
			<div className="space-y-10">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<div className="h-12 w-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm">
							<CreditCard className="h-6 w-6" />
						</div>
						<h2 className="text-3xl font-black text-slate-900 tracking-tight">
							باقات النقاط المباشرة
						</h2>
					</div>
					<div className="px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-2">
						<AlertCircle className="h-4 w-4 text-amber-600" />
						<span className="text-xs font-bold text-amber-700">
							دفع آمن ومباشر
						</span>
					</div>
				</div>

				<CreditPackageGrid />
			</div>

			{/* Manual Top-up Section */}
			<div className="space-y-8">
				<div className="flex items-center gap-3">
					<div className="h-10 w-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 border border-amber-100">
						<Zap className="h-5 w-5" />
					</div>
					<h2 className="text-2xl font-black text-slate-900 tracking-tight">
						خيارات متقدمة
					</h2>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
					<div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] p-10 border border-slate-100 shadow-sm relative overflow-hidden group">
						<div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-amber-400 to-amber-600" />
						<h3 className="text-2xl font-black text-slate-900 mb-4 flex items-center gap-3 tracking-tight">
							شحن يدوي (Request Top-up)
						</h3>
						<p className="text-slate-500 font-medium leading-relaxed mb-10 text-[16px] max-w-sm">
							لشحن رصيد مخصص عبر باقاتنا اليدوية أو طلب فواتير ضريبية، يرجى
							اختيار الباقة المناسبة وسنرسل لك رابط الدفع فوراً.
						</p>
						<ManualPackageGrid />
					</div>

					<div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white relative overflow-hidden group shadow-2xl shadow-indigo-100/20">
						<div className="absolute top-[-30%] left-[-20%] w-80 h-80 bg-white/20 rounded-full blur-[80px] transition-transform group-hover:scale-125" />
						<div className="flex flex-col h-full justify-between gap-8 relative z-10">
							<div>
								<h3 className="text-3xl font-black mb-4 tracking-tight">
									باقات المكاتب الكبرى
								</h3>
								<p className="text-indigo-100 font-medium leading-relaxed text-lg opacity-90">
									هل تدير مكتباً كبيراً؟ نقدم اشتراكات سنوية لعدد غير محدود من
									المستخدمين مع دمج مخصص لنظام مكتبكم.
								</p>
							</div>
							<div className="bg-white/10 backdrop-blur-xl p-5 rounded-2xl border border-white/20 flex items-center gap-4 shadow-inner">
								<div className="h-14 w-14 bg-white text-indigo-700 rounded-2xl flex items-center justify-center shadow-lg">
									<ShieldCheck className="h-8 w-8" />
								</div>
								<div>
									<p className="font-black text-lg leading-none">
										Enterprise Suite
									</p>
									<p className="text-xs font-medium text-indigo-100 mt-1 opacity-70 uppercase tracking-widest leading-none">
										حصري للمحترفين والمؤسسات
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Transaction History */}
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg border border-slate-700">
							<History className="h-5 w-5" />
						</div>
						<h2 className="text-2xl font-black text-slate-900 tracking-tight">
							سجل المعاملات
						</h2>
					</div>
					<Button
						variant="ghost"
						className="text-slate-500 font-bold hover:text-indigo-600 text-sm"
					>
						عرض كل الحركات
					</Button>
				</div>

				<Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-white/80 backdrop-blur-md">
					<div className="overflow-x-auto">
						<table className="w-full text-right border-collapse">
							<thead>
								<tr className="bg-slate-50/50 border-b border-slate-100">
									<th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
										نوع المعاملة / التفاصيل
									</th>
									<th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">
										التاريخ والوقت
									</th>
									<th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-left">
										الحركة
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-50/50">
								{ledgerEntries.length === 0 ? (
									<tr>
										<td colSpan={3} className="p-24 text-center">
											<div className="flex flex-col items-center gap-4 text-slate-300">
												<History className="h-16 w-16 opacity-20" />
												<p className="text-xl font-bold italic">
													لا توجد معاملات مسجلة حالياً.
												</p>
											</div>
										</td>
									</tr>
								) : (
									ledgerEntries.map((entry) => (
										<tr
											key={entry.id}
											className="hover:bg-indigo-50/30 transition-all group"
										>
											<td className="p-8">
												<div className="flex items-center gap-5">
													<div className="h-14 w-14 bg-white rounded-2xl flex items-center justify-center text-slate-900 border border-slate-100 shadow-sm group-hover:border-indigo-200 group-hover:scale-105 transition-all">
														<CreditCard className="h-6 w-6" />
													</div>
													<div className="space-y-1 text-right">
														<p className="font-black text-slate-900 text-lg">
															{entry.description}
														</p>
														<p className="text-[10px] text-slate-400 font-black tracking-widest uppercase">
															REF: {entry.id.split("-")[0]}
														</p>
													</div>
												</div>
											</td>
											<td className="p-8 text-center text-slate-500 font-bold text-sm">
												{format(
													new Date(entry.createdAt),
													"d MMMM yyyy • HH:mm",
													{ locale: ar },
												)}
											</td>
											<td className="p-8 text-left">
												<span
													className={cn(
														"px-6 py-3 rounded-2xl text-sm font-black border tracking-tight shadow-sm inline-block min-w-[100px] text-center transition-all group-hover:scale-110",
														entry.amount > 0
															? "bg-emerald-50 text-emerald-700 border-emerald-100"
															: "bg-rose-50 text-rose-700 border-rose-100",
													)}
												>
													{entry.amount > 0 ? `+${entry.amount}` : entry.amount}{" "}
													PTS
												</span>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</Card>
			</div>
		</div>
	);
}
