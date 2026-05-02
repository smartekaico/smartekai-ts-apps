import { auth } from "@/lib/auth";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
	caseAnalyses,
	generatedContracts,
	workSessions,
	auditLogs,
	organizations,
} from "@/db/schema";
import { eq, count, desc } from "drizzle-orm";
import {
	User,
	Mail,
	Shield,
	Building2,
	Calendar,
	CreditCard,
	TrendingUp,
	Scale,
	FileText,
	Briefcase,
	History,
	ArrowLeft,
	Sparkles,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CreateOrganizationClient } from "@/components/auth/CreateOrganizationClient";

export default async function ProfilePage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		redirect("/login");
	}

	const user = session.user;
	const cookieStore = await cookies();
	const viewAs = cookieStore.get("viewAs")?.value;
	const role = user.industryRole;
	const effectiveRole = role === "ADMIN" && viewAs === "user" ? "LEGAL" : role;

	// ── Fetch Activity Stats ───────────────────────────────────
	// We use the user's ID to fetch personal activity
	const [
		analysisCount,
		contractCount,
		projectCount,
		recentActions,
		orgDetails,
	] = await Promise.all([
		db
			.select({ value: count() })
			.from(caseAnalyses)
			.where(eq(caseAnalyses.userId, user.id)),
		db
			.select({ value: count() })
			.from(generatedContracts)
			.where(eq(generatedContracts.userId, user.id)),
		user.activeOrganizationId
			? db
					.select({ value: count() })
					.from(workSessions)
					.where(eq(workSessions.organizationId, user.activeOrganizationId))
			: Promise.resolve([{ value: 0 }]),
		db
			.select()
			.from(auditLogs)
			.where(eq(auditLogs.userId, user.id))
			.orderBy(desc(auditLogs.createdAt))
			.limit(5),
		user.activeOrganizationId
			? db
					.select()
					.from(organizations)
					.where(eq(organizations.id, user.activeOrganizationId))
					.limit(1)
			: Promise.resolve([]),
	]);

	const stats = {
		analyses: Number(analysisCount[0]?.value || 0),
		contracts: Number(contractCount[0]?.value || 0),
		projects: Number(projectCount[0]?.value || 0),
	};

	const organization = orgDetails[0];

	return (
		<div
			className="max-w-6xl mx-auto space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700 rtl text-right"
			dir="rtl"
		>
			{/* Navigation Header */}
			<div className="flex items-center justify-between">
				<Link href="/dashboard">
					<Button
						variant="ghost"
						className="rounded-2xl gap-2 text-slate-500 hover:text-slate-900 pr-1 pl-4 h-11 border border-transparent hover:border-slate-100 hover:bg-white shadow-sm transition-all duration-300"
					>
						<ArrowLeft className="h-4 w-4" />
						<span className="font-bold text-sm">العودة للرئيسية</span>
					</Button>
				</Link>
				<div className="flex items-center gap-3">
					<span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[11px] font-black rounded-lg border border-indigo-100 tracking-tight">
						الملف الشخصي (Profile)
					</span>
				</div>
			</div>

			{/* Hero Profile Section */}
			<div className="relative group">
				<div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 rounded-[3rem] blur-3xl -z-10 opacity-50 group-hover:opacity-100 transition-opacity duration-1000" />
				<Card className="border-slate-100 shadow-[0_20px_50px_rgba(31,41,55,0.08)] bg-white/80 backdrop-blur-xl rounded-[3rem] overflow-hidden border-none ring-1 ring-slate-100">
					<div className="h-40 bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-900 relative">
						<div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]" />
						<div className="absolute -bottom-16 right-12 flex items-end gap-8">
							<div className="relative group/avatar">
								<div className="absolute inset-0 bg-indigo-500 rounded-full blur-2xl opacity-20 group-hover/avatar:opacity-40 transition-opacity" />
								<Avatar className="h-36 w-36 border-[6px] border-white shadow-2xl rounded-full ring-1 ring-slate-100 relative">
									<AvatarImage src={user.image || ""} />
									<AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-4xl font-black">
										{user.name.charAt(0).toUpperCase()}
									</AvatarFallback>
								</Avatar>
							</div>
							<div className="mb-6 flex flex-col gap-1">
								<h1 className="text-3xl font-black text-white tracking-tight drop-shadow-sm">
									{user.name}
								</h1>
								<div className="flex items-center gap-3">
									<Badge className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold font-sans">
										{user.email}
									</Badge>
									<Badge className="bg-indigo-500 text-white border-none px-3 py-1 rounded-lg text-xs font-black tracking-wide">
										{role === "ADMIN" ? "مدير النظام" : "عضو نشط"}
									</Badge>
								</div>
							</div>
						</div>
					</div>
					<div className="pt-24 pb-12 px-12 grid grid-cols-1 md:grid-cols-3 gap-12">
						{organization ? (
							<div className="flex items-center gap-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 group/item hover:bg-white hover:shadow-xl transition-all duration-300">
								<div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100 group-hover/item:scale-110 transition-transform">
									<Building2 className="h-5 w-5" />
								</div>
								<div className="flex flex-col">
									<span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
										المؤسسة / المكتب
									</span>
									<span className="text-base font-bold text-slate-900">
										{organization.name}
									</span>
								</div>
							</div>
						) : (
							<div className="md:col-span-1">
								<div className="h-full bg-indigo-50/30 border border-dashed border-indigo-200 rounded-3xl flex items-center justify-center p-6 group/cta hover:bg-indigo-600 transition-all duration-500">
									<div className="flex flex-col items-center text-center gap-2">
										<span className="text-[10px] font-black text-indigo-400 group-hover:text-white uppercase tracking-widest">
											لم يتم ربط مكتب
										</span>
										<Link href="/dashboard/settings/team">
											<span className="text-xs font-bold text-indigo-900 group-hover:text-white underline underline-offset-4">
												إنشاء مساحة عمل الآن
											</span>
										</Link>
									</div>
								</div>
							</div>
						)}
						<div className="flex items-center gap-4 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 group/item hover:bg-white hover:shadow-xl transition-all duration-300">
							<div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-amber-600 shadow-sm border border-slate-100 group-hover/item:scale-110 transition-transform">
								<Calendar className="h-5 w-5" />
							</div>
							<div className="flex flex-col">
								<span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
									عضو منذ
								</span>
								<span className="text-base font-bold text-slate-900" dir="ltr">
									{new Date(user.createdAt).toLocaleDateString("ar-KW", {
										year: "numeric",
										month: "long",
									})}
								</span>
							</div>
						</div>
						<div className="flex items-center gap-4 bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 group/item hover:bg-indigo-600 hover:text-white transition-all duration-300 shadow-sm">
							<div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm group-hover/item:bg-white/20 group-hover/item:text-white transition-colors">
								<CreditCard className="h-5 w-5" />
							</div>
							<div className="flex flex-col">
								<span className="text-[10px] font-black text-indigo-400 group-hover/item:text-indigo-100 uppercase tracking-widest">
									رصيد النقاط
								</span>
								<span className="text-xl font-black text-indigo-900 group-hover/item:text-white leading-none mt-1">
									{organization?.creditBalance || user.creditBalance || 0} PTS
								</span>
							</div>
						</div>
					</div>
				</Card>

				{/* Create Organization Section - Only if none exists */}
				{!organization && (
					<div className="mt-8">
						<CreateOrganizationClient />
					</div>
				)}
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				{/* Left Column: Activity Stats */}
				<div className="lg:col-span-2 space-y-8">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						<Card className="rounded-[2rem] border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden group">
							<CardHeader className="pb-2 p-6 flex flex-row items-center justify-between">
								<div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
									<Scale className="h-5 w-5" />
								</div>
								<TrendingUp className="h-4 w-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
							</CardHeader>
							<CardContent className="p-6 pt-0">
								<div className="text-3xl font-black text-slate-900">
									{stats.analyses}
								</div>
								<p className="text-xs font-bold text-slate-500 mt-1">
									عمليات التحليل الذكي
								</p>
							</CardContent>
						</Card>

						<Card className="rounded-[2rem] border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden group">
							<CardHeader className="pb-2 p-6 flex flex-row items-center justify-between">
								<div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
									<FileText className="h-5 w-5" />
								</div>
							</CardHeader>
							<CardContent className="p-6 pt-0">
								<div className="text-3xl font-black text-slate-900">
									{stats.contracts}
								</div>
								<p className="text-xs font-bold text-slate-500 mt-1">
									وثائق تمت صياغتها
								</p>
							</CardContent>
						</Card>

						<Card className="rounded-[2rem] border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden group">
							<CardHeader className="pb-2 p-6 flex flex-row items-center justify-between">
								<div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
									<Briefcase className="h-5 w-5" />
								</div>
							</CardHeader>
							<CardContent className="p-6 pt-0">
								<div className="text-3xl font-black text-slate-900">
									{stats.projects}
								</div>
								<p className="text-xs font-bold text-slate-500 mt-1">
									مشاريع وملفات نشطة
								</p>
							</CardContent>
						</Card>
					</div>

					<Card className="rounded-[2rem] border-slate-100 shadow-sm overflow-hidden">
						<CardHeader className="p-8 border-b border-slate-50 flex flex-row items-center justify-between bg-slate-50/30">
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm">
									<History className="h-5 w-5" />
								</div>
								<div>
									<CardTitle className="text-lg font-black text-slate-900">
										سجل النشاط الأخير
									</CardTitle>
									<CardDescription className="text-xs font-medium">
										متابعة آخر العمليات التي قمت بها على النظام
									</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent className="p-0">
							{recentActions.length > 0 ? (
								<div className="divide-y divide-slate-50">
									{recentActions.map((log) => (
										<div
											key={log.id}
											className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between group"
										>
											<div className="flex items-center gap-4">
												<div className="h-9 w-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-black border border-indigo-100 self-start">
													{log.action.charAt(0)}
												</div>
												<div className="flex flex-col gap-0.5">
													<span className="text-sm font-bold text-slate-800 tracking-tight">
														{log.action}
													</span>
													<span className="text-[11px] text-slate-500 font-medium leading-relaxed max-w-sm truncate whitespace-normal">
														{log.details || "بدون تفاصيل إضافية"}
													</span>
												</div>
											</div>
											<span
												className="text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
												dir="ltr"
											>
												{new Date(log.createdAt).toLocaleTimeString("ar-KW", {
													hour: "2-digit",
													minute: "2-digit",
												})}
											</span>
										</div>
									))}
								</div>
							) : (
								<div className="p-20 text-center flex flex-col items-center gap-4">
									<div className="h-16 w-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200">
										<Sparkles className="h-8 w-8" />
									</div>
									<p className="text-slate-400 text-sm font-bold tracking-tight">
										لا يوجد نشاط مسجل مؤخراً
									</p>
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Right Column: Identity & Security */}
				<div className="space-y-8">
					<Card className="rounded-[2.5rem] border-slate-100 shadow-[0_15px_40px_rgba(31,41,55,0.04)] overflow-hidden bg-white group hover:shadow-xl transition-all duration-500">
						<div className="p-8 pb-4">
							<h3 className="text-base font-black text-slate-900 mb-6 flex items-center gap-2">
								<Shield className="h-4 w-4 text-indigo-600" />
								هوية الحساب والنظام
							</h3>

							<div className="space-y-6">
								<div className="flex flex-col gap-2">
									<span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
										سياق النظام الموحد (Industry)
									</span>
									<div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between group-hover:bg-indigo-600 group-hover:border-indigo-600 transition-all duration-500">
										<span className="text-sm font-black text-indigo-900 group-hover:text-white">
											{user.industryRole === "MEDICAL"
												? "الطبي (Medical)"
												: user.industryRole === "VOICE"
													? "الصوتي (Voice)"
													: "القانوني (Legal)"}
										</span>
										{user.industryRole === "MEDICAL" ? (
											<Briefcase className="h-4 w-4 text-emerald-400" />
										) : (
											<Scale className="h-4 w-4 text-indigo-400" />
										)}
									</div>
								</div>

								<div className="flex flex-col gap-2">
									<span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
										نوع الاشتراك
									</span>
									<div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
										<span className="text-sm font-bold text-slate-700">
											{user.subscriptionTier || "بروفيسيونال (Professional)"}
										</span>
										<Badge
											variant="outline"
											className="text-[9px] font-black border-slate-200"
										>
											ACTIVE
										</Badge>
									</div>
								</div>

								<div className="flex flex-col gap-2 pt-4">
									<div className="flex items-center gap-3 p-3 text-slate-500 text-xs font-bold bg-slate-50/50 rounded-xl hover:bg-white hover:text-slate-900 transition-colors">
										<Mail className="h-4 w-4 opacity-50" />
										<span>{user.email}</span>
									</div>
									<div className="flex items-center gap-3 p-3 text-slate-500 text-xs font-bold bg-slate-50/50 rounded-xl hover:bg-white hover:text-slate-900 transition-colors">
										<User className="h-4 w-4 opacity-50" />
										<span>{user.id}</span>
									</div>
								</div>
							</div>
						</div>
						<div className="p-6 pt-4 bg-slate-50/50">
							<p className="text-[9px] text-center text-slate-400 font-bold tracking-tight">
								هذه البيانات للقراءة فقط ضمن إصدار MVP
							</p>
						</div>
					</Card>

					<Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-slate-900 text-white p-8 space-y-6 relative group">
						<div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/20 blur-3xl -z-0 rounded-full" />
						<div className="relative z-10 flex flex-col gap-4">
							<h3 className="text-lg font-black tracking-tight">
								تحتاج للمساعدة؟
							</h3>
							<p className="text-slate-400 text-xs font-medium leading-relaxed">
								إذا كنت تلاحظ أي خطأ في بياناتك الشخصية أو سجل النشاط، يرجى
								التواصل مع الدعم الفني.
							</p>
							<Link href="/dashboard/support">
								<Button className="w-full rounded-2xl bg-white text-slate-900 hover:bg-indigo-50 font-black h-12 shadow-lg shadow-indigo-500/10 transition-all active:scale-95">
									فتح تذكرة دعم
								</Button>
							</Link>
						</div>
					</Card>
				</div>
			</div>
		</div>
	);
}
