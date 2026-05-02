"use client";

import { useState, useEffect } from "react";
import {
	getOrganizations,
	updateOrganizationCredits,
	deleteSubscriber,
} from "@/app/[locale]/actions/admin";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Users,
	Search,
	CreditCard,
	Plus,
	Minus,
	Loader2,
	ArrowUpDown,
	MoreHorizontal,
	ShieldCheck,
	Building2,
	Globe,
	Calendar,
	Mail,
	Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Organization {
	id: string;
	name: string;
	ownerEmail: string;
	creditBalance: number;
	defaultJurisdiction: string | null;
	createdAt: string | Date;
}

export default function LegalSubscribersPage() {
	const [loading, setLoading] = useState(true);
	const [orgs, setOrgs] = useState<Organization[]>([]);
	const [search, setSearch] = useState("");
	const [updatingId, setUpdatingId] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [orgToDelete, setOrgToDelete] = useState<string | null>(null);

	useEffect(() => {
		fetchOrgs();
	}, []);

	const fetchOrgs = async () => {
		setLoading(true);
		const res = await getOrganizations("LEGAL");
		if (res.success) {
			setOrgs(res.data || []);
		} else {
			toast.error(res.error || "Failed to load organizations");
		}
		setLoading(false);
	};

	const handleAdjustCredits = async (orgId: string, amount: number) => {
		setUpdatingId(orgId);
		const res = await updateOrganizationCredits(orgId, amount);
		if (res.success) {
			toast.success(
				`تم ${amount > 0 ? "إضافة" : "خصم"} ${Math.abs(amount)} نقطة بنجاح`,
			);
			// Optimistic update
			setOrgs((prev) =>
				prev.map((o) =>
					o.id === orgId
						? { ...o, creditBalance: (o.creditBalance || 0) + amount }
						: o,
				),
			);
		} else {
			toast.error(res.error || "فشل تحديث الرصيد");
		}
		setUpdatingId(null);
	};
	const handleDeleteOrg = async () => {
		if (!orgToDelete) return;
		setConfirmOpen(false);
		setDeletingId(orgToDelete);

		const res = await deleteSubscriber(orgToDelete);
		if (res.success) {
			toast.success("تم حذف المشترك وجميع بياناته بنجاح");
			setOrgs((prev) => prev.filter((o) => o.id !== orgToDelete));
		} else {
			toast.error(res.error || "فشل حذف المشترك");
		}
		setDeletingId(null);
		setOrgToDelete(null);
	};

	const filteredOrgs = orgs.filter(
		(o) =>
			o.name?.toLowerCase().includes(search.toLowerCase()) ||
			o.ownerEmail?.toLowerCase().includes(search.toLowerCase()),
	);

	const stats = {
		total: orgs.length,
		totalCredits: orgs.reduce((acc, o) => acc + (o.creditBalance || 0), 0),
		avgCredits: orgs.length
			? Math.round(
					orgs.reduce((acc, o) => acc + (o.creditBalance || 0), 0) /
						orgs.length,
				)
			: 0,
	};

	return (
		<div className="space-y-8 rtl pb-10" dir="rtl">
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div>
					<h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
						<Users className="h-8 w-8 text-indigo-600" />
						إدارة مشتركي المساعد القانوني (Legal OS)
					</h1>
					<p className="text-slate-500 font-medium mt-1">
						إدارة المؤسسات، الأرصدة، وتراخيص الخدمة القانونية الذكية.
					</p>
				</div>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<Card className="rounded-[2rem] border-slate-100 shadow-sm bg-white overflow-hidden relative group transition-all hover:shadow-md">
					<CardContent className="p-6">
						<div className="flex items-center gap-4">
							<div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
								<Building2 className="h-6 w-6" />
							</div>
							<div>
								<p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
									إجمالي المكاتب
								</p>
								<p className="text-2xl font-black text-slate-900">
									{stats.total}
								</p>
							</div>
						</div>
						<div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 opacity-20" />
					</CardContent>
				</Card>

				<Card className="rounded-[2rem] border-slate-100 shadow-sm bg-white overflow-hidden relative group transition-all hover:shadow-md">
					<CardContent className="p-6">
						<div className="flex items-center gap-4">
							<div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
								<CreditCard className="h-6 w-6" />
							</div>
							<div>
								<p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
									إجمالي الأرصدة المتداولة
								</p>
								<p className="text-2xl font-black text-slate-900">
									{stats.totalCredits}
								</p>
							</div>
						</div>
						<div className="absolute top-0 left-0 w-full h-1 bg-amber-500 opacity-20" />
					</CardContent>
				</Card>

				<Card className="rounded-[2rem] border-slate-100 shadow-sm bg-white overflow-hidden relative group transition-all hover:shadow-md">
					<CardContent className="p-6">
						<div className="flex items-center gap-4">
							<div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
								<ArrowUpDown className="h-6 w-6" />
							</div>
							<div>
								<p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
									متوسط الرصيد/مكتب
								</p>
								<p className="text-2xl font-black text-slate-900">
									{stats.avgCredits}
								</p>
							</div>
						</div>
						<div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 opacity-20" />
					</CardContent>
				</Card>
			</div>

			{/* Main Table Card */}
			<Card className="rounded-[2.5rem] border-slate-100 shadow-xl overflow-hidden bg-white">
				<CardHeader className="bg-slate-50/50 border-b p-6 px-8 flex flex-row items-center justify-between gap-4 space-y-0">
					<div>
						<CardTitle className="text-lg font-black text-slate-900">
							قائمة المؤسسات المسجلة
						</CardTitle>
						<CardDescription className="text-xs font-bold text-slate-500 mt-0.5">
							البحث والتحكم في أرصدة المكاتب والشركات القانونية.
						</CardDescription>
					</div>
					<div className="relative w-full max-w-sm">
						<Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
						<Input
							placeholder="ابحث عن مكتب أو مؤسسة..."
							className="pr-10 bg-white border-slate-200 rounded-2xl text-sm font-bold focus:ring-indigo-500"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>
				</CardHeader>
				<CardContent className="p-0">
					{loading ? (
						<div className="flex flex-col items-center justify-center py-20 gap-3 opacity-60">
							<Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
							<p className="text-sm font-black text-slate-500 italic">
								جاري تحميل بيانات المشتركين...
							</p>
						</div>
					) : filteredOrgs.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-20 gap-3 opacity-60">
							<Users className="h-12 w-12 text-slate-300" />
							<p className="text-sm font-black text-slate-400 italic">
								لم يتم العثور على مؤسسات تطابق بحثك.
							</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-right border-collapse">
								<thead>
									<tr className="bg-slate-50/30 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
										<td className="p-5 px-8">المؤسسة / المكتب</td>
										<td className="p-5">البريد الإلكتروني</td>
										<td className="p-5">التواجد النطاقي</td>
										<td className="p-5">تاريخ الانضمام</td>
										<td className="p-5">الرصيد الحالي</td>
										<td className="p-5 px-8 text-left">إجراءات سريعة</td>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100">
									{filteredOrgs.map((org) => (
										<tr
											key={org.id}
											className="group hover:bg-slate-50/50 transition-colors"
										>
											<td className="p-5 px-8">
												<div className="flex items-center gap-3">
													<div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-black group-hover:bg-indigo-600 group-hover:text-white transition-all">
														{org.name?.substring(0, 1) || "L"}
													</div>
													<div>
														<p className="text-sm font-black text-slate-900 leading-none mb-1">
															{org.name}
														</p>
														<p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter italic">
															ID: ...{org.id.substring(org.id.length - 8)}
														</p>
													</div>
												</div>
											</td>
											<td className="p-5">
												<div className="flex items-center gap-2">
													<Mail className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
													<span className="text-xs font-bold text-slate-600">
														{org.ownerEmail}
													</span>
												</div>
											</td>
											<td className="p-5">
												<div className="flex items-center gap-2">
													<Globe className="h-3.5 w-3.5 text-slate-300" />
													<span className="text-xs font-black text-slate-600 uppercase italic tracking-tight">
														{org.defaultJurisdiction || "Kuwait"}
													</span>
												</div>
											</td>
											<td className="p-5">
												<div className="flex items-center gap-2">
													<Calendar className="h-3.5 w-3.5 text-slate-300" />
													<span className="text-xs font-bold text-slate-500">
														{new Date(org.createdAt).toLocaleDateString(
															"ar-KW",
														)}
													</span>
												</div>
											</td>
											<td className="p-5">
												<div className="flex items-center gap-2">
													<Badge
														variant="outline"
														className={cn(
															"px-3 py-1 rounded-lg font-black text-xs",
															org.creditBalance > 50
																? "bg-emerald-50 text-emerald-700 border-emerald-100"
																: org.creditBalance > 10
																	? "bg-amber-50 text-amber-700 border-amber-100"
																	: "bg-rose-50 text-rose-700 border-rose-100",
														)}
													>
														{org.creditBalance} نقطة
													</Badge>
												</div>
											</td>
											<td className="p-5 px-8">
												<div className="flex items-center justify-end gap-2">
													<Button
														variant="outline"
														size="xs"
														className="h-8 w-8 rounded-lg border-slate-200 hover:bg-slate-900 hover:text-white"
														onClick={() => handleAdjustCredits(org.id, 10)}
														disabled={updatingId === org.id}
													>
														<Plus className="h-3 w-3" />
													</Button>
													<Button
														variant="outline"
														size="xs"
														className="h-8 w-8 rounded-lg border-slate-200 hover:bg-rose-500 hover:text-white hover:border-rose-500"
														onClick={() => handleAdjustCredits(org.id, -10)}
														disabled={
															updatingId === org.id || org.creditBalance < 10
														}
													>
														<Minus className="h-3 w-3" />
													</Button>
													<Button
														size="sm"
														className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-8 px-4 text-[10px] font-black tracking-tight gap-1.5"
														onClick={() => handleAdjustCredits(org.id, 100)}
														disabled={updatingId === org.id || deletingId === org.id}
													>
														<CreditCard className="h-3 w-3" />
														شحن 100
													</Button>
													<Button
														variant="outline"
														size="xs"
														className="h-8 w-8 rounded-lg border-slate-200 hover:bg-rose-600 hover:text-white hover:border-rose-600 group/del"
														onClick={() => {
															setOrgToDelete(org.id);
															setConfirmOpen(true);
														}}
														disabled={updatingId === org.id || deletingId === org.id}
													>
														{deletingId === org.id ? (
															<Loader2 className="h-3 w-3 animate-spin" />
														) : (
															<Trash2 className="h-3 w-3" />
														)}
													</Button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</CardContent>
			</Card>

			<ConfirmModal
				isOpen={confirmOpen}
				onClose={() => setConfirmOpen(false)}
				onConfirm={handleDeleteOrg}
				title="حذف المشترك نهائياً"
				description="هل أنت متأكد من حذف هذا المشترك؟ سيتم حذف جميع بيانات المؤسسة، القضايا، الجلسات، والمستخدمين المرتبطين بها بشكل نهائي. لا يمكن التراجع عن هذا الإجراء."
			/>
		</div>
	);
}
