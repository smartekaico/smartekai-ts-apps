import { db } from "@/db";
import { users, ledgers, creditBuckets, organizations } from "@/db/schema";
import { eq, desc, and, gt } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
	WalletCards,
	Zap,
	CreditCard,
	History,
	Sparkles,
	AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditPackageGrid } from "@/components/billing/CreditPackageGrid";
import { ManualPackageGrid } from "@/components/billing/ManualPackageGrid";
import { getTranslations } from "next-intl/server";

export default async function SettingsBillingPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		return null;
	}

	const userId = session.user.id;
	const activeOrgId =
		session.session.activeOrganizationId || session.user.activeOrganizationId;
	const t = await getTranslations("Settings");

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
			.limit(10),
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
			className="space-y-12 animate-in fade-in duration-700 rtl text-right"
			dir="rtl"
		>
			{/* Page Header */}
			<div className="flex flex-col gap-2">
				<h1 className="text-3xl font-black text-slate-900 tracking-tight">
					{t("billing.title")}
				</h1>
				<p className="text-slate-500 font-medium">{t("billing.subtitle")}</p>
			</div>

			{/* Hero Stats Card - Simplified */}
			<div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-xl relative overflow-hidden group">
				<div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px]" />

				<div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
					<div className="space-y-4">
						<span className="bg-indigo-500/20 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 text-indigo-200">
							رصيدك الحالي (Credits Balance)
						</span>
						<div className="flex items-baseline gap-4 mt-2">
							<span className="text-7xl font-black tabular-nums tracking-tighter text-white">
								{credits}
							</span>
							<span className="text-xl font-black text-indigo-300/80 uppercase tracking-tight">
								نقطة
							</span>
						</div>
					</div>
					<div className="h-20 w-20 bg-white/5 rounded-[2rem] flex items-center justify-center backdrop-blur-xl border border-white/10 shadow-inner">
						<Sparkles className="h-10 w-10 text-indigo-400" />
					</div>
				</div>

				{/* Buckets Breakdown */}
				{activeBuckets.length > 0 && (
					<div className="w-full mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-white/10 pt-8">
						{activeBuckets.map((bucket) => (
							<div
								key={bucket.id}
								className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col justify-between group hover:bg-white/10 transition-colors"
							>
								<div className="flex items-center justify-between mb-1">
									<span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">
										انتهاء الصلاحية: غ/م
									</span>
									<span className="text-[10px] font-bold text-white/50">
										{format(new Date(bucket.createdAt), "dd/MM/yyyy")}
									</span>
								</div>
								<div className="flex items-baseline gap-2">
									<span className="text-xl font-black text-white">
										{bucket.amount}
									</span>
									<span className="text-[9px] font-bold text-white/40 uppercase">
										نقطة متبقية
									</span>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Credit Packages Grid */}
			<div className="space-y-8">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm">
							<CreditCard className="h-5 w-5" />
						</div>
						<h2 className="text-2xl font-black text-slate-900 tracking-tight">
							باقات النقاط
						</h2>
					</div>
					<div className="px-3 py-1 bg-amber-50 border border-amber-100 rounded-lg flex items-center gap-2">
						<AlertCircle className="h-3 w-3 text-amber-600" />
						<span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">
							Secure Payments
						</span>
					</div>
				</div>

				<CreditPackageGrid />
			</div>

			{/* Manual Top-up Section */}
			<div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden group">
				<div className="absolute top-0 right-0 w-1.5 h-full bg-amber-500" />
				<div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
					<div className="flex-1 space-y-2">
						<h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
							<Zap className="h-5 w-5 text-amber-500" />
							شحن يدوي (Request Top-up)
						</h3>
						<p className="text-slate-500 font-medium text-sm leading-relaxed max-w-sm">
							للباقات الكبيرة أو شحن رصيد المؤسسات عبر الفواتير، يرجى تقديم طلب
							وسنتواصل معك.
						</p>
					</div>
					<div className="w-full md:w-auto">
						<ManualPackageGrid />
					</div>
				</div>
			</div>

			{/* Transaction History */}
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center border border-slate-200 shadow-sm">
							<History className="h-5 w-5" />
						</div>
						<h2 className="text-xl font-black text-slate-900 tracking-tight">
							سجل المعاملات
						</h2>
					</div>
				</div>

				<Card className="rounded-[2rem] border-slate-100 shadow-sm overflow-hidden bg-white">
					<div className="overflow-x-auto">
						<table className="w-full text-right border-collapse">
							<thead>
								<tr className="bg-slate-50 border-b border-slate-100">
									<th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
										المعاملة
									</th>
									<th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
										التاريخ
									</th>
									<th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
										المبلغ (PTS)
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-50">
								{ledgerEntries.length === 0 ? (
									<tr>
										<td
											colSpan={3}
											className="p-20 text-center text-slate-400 font-bold italic"
										>
											لا توجد حركات مسجلة.
										</td>
									</tr>
								) : (
									ledgerEntries.map((entry) => (
										<tr
											key={entry.id}
											className="hover:bg-slate-50/50 transition-all group"
										>
											<td className="p-6">
												<div className="flex items-center gap-4">
													<div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-slate-900 border border-slate-100 shadow-sm group-hover:border-indigo-200">
														<CreditCard className="h-5 w-5" />
													</div>
													<div>
														<p className="font-bold text-slate-900 text-sm">
															{entry.description}
														</p>
														<p className="text-[9px] text-slate-400 font-bold uppercase">
															REF: {entry.id.split("-")[0]}
														</p>
													</div>
												</div>
											</td>
											<td className="p-6 text-center text-slate-500 font-bold text-xs">
												{format(new Date(entry.createdAt), "d MMM yyyy", {
													locale: ar,
												})}
											</td>
											<td className="p-6 text-left">
												<span
													className={cn(
														"px-4 py-2 rounded-xl text-xs font-black border tabular-nums",
														entry.amount > 0
															? "bg-emerald-50 text-emerald-700 border-emerald-100"
															: "bg-rose-50 text-rose-700 border-rose-100",
													)}
												>
													{entry.amount > 0 ? `+${entry.amount}` : entry.amount}
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
