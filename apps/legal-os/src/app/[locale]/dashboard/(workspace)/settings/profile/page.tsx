import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { auditLogs, organizations } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { ProfileForm } from "@/components/dashboard/settings/ProfileForm";
import { WorkspaceForm } from "@/components/dashboard/settings/WorkspaceForm";
import { ShieldCheck, Building2, Calendar, History, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default async function SettingsProfilePage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		redirect("/login");
	}

	const user = session.user;
	const t = await getTranslations("Settings");

	const [orgDetails, recentActions] = await Promise.all([
		user.activeOrganizationId
			? db
				.select()
				.from(organizations)
				.where(eq(organizations.id, user.activeOrganizationId))
				.limit(1)
			: Promise.resolve([]),
		db
			.select()
			.from(auditLogs)
			.where(eq(auditLogs.userId, user.id))
			.orderBy(desc(auditLogs.createdAt))
			.limit(10),
	]);

	const organization = orgDetails[0];

	return (
		<div
			className="space-y-10 animate-in fade-in duration-700 rtl text-right"
			dir="rtl"
		>
			{/* Page Header */}
			<div className="flex flex-col gap-2">
				<h1 className="text-3xl font-black text-slate-900 tracking-tight">
					{t("profile.title")}
				</h1>
				<p className="text-slate-500 font-medium">{t("profile.subtitle")}</p>
			</div>

			{/* Profile Hero */}
			<Card className="border-slate-100 shadow-sm bg-white rounded-[2.5rem] overflow-hidden">
				<div className="h-32 bg-slate-900 relative">
					<div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]" />
					<div className="absolute -bottom-12 right-10 flex items-end gap-6">
						<Avatar className="h-24 w-24 border-4 border-white shadow-lg rounded-3xl">
							<AvatarImage src={user.image || ""} />
							<AvatarFallback className="bg-indigo-600 text-white text-3xl font-black rounded-3xl">
								{user.name.charAt(0).toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<div className="mb-4 flex flex-col gap-1">
							<h2 className="text-2xl font-black text-white drop-shadow-sm">
								{user.name}
							</h2>
							<p className="text-xs font-bold text-slate-400 bg-white/10 backdrop-blur-md px-2 py-0.5 rounded-lg w-fit">
								{user.email}
							</p>
						</div>
					</div>
				</div>
				<div className="pt-20 pb-8 px-10 grid grid-cols-1 md:grid-cols-2 gap-6">
					<div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
						<div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100">
							<Building2 className="h-5 w-5" />
						</div>
						<div className="flex flex-col">
							<span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
								المؤسسة
							</span>
							<span className="text-sm font-bold text-slate-900">
								{organization?.name || "بدون مؤسسة مرتبطة"}
							</span>
						</div>
					</div>
					<div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
						<div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-amber-600 shadow-sm border border-slate-100">
							<Calendar className="h-5 w-5" />
						</div>
						<div className="flex flex-col">
							<span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
								تاريخ الانضمام
							</span>
							<span className="text-sm font-bold text-slate-900" dir="ltr">
								{new Date(user.createdAt).toLocaleDateString("ar-KW", {
									year: "numeric",
									month: "long",
								})}
							</span>
						</div>
					</div>
				</div>
			</Card>

			{/* Edit Profile & Security Form */}
			<ProfileForm user={user} />

			{/* Workspace / Firm Settings */}
			<div className="space-y-6">
				<div className="flex flex-col gap-2">
					<h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
						<Building2 className="h-6 w-6 text-indigo-600" />
						{t("workspace.title")}
					</h2>
					<p className="text-slate-500 font-medium">{t("workspace.subtitle")}</p>
				</div>
				{organization ? (
					<WorkspaceForm organization={organization} />
				) : (
					<Card className="p-12 text-center bg-slate-50 rounded-[2.5rem] border border-slate-100">
						<p className="text-slate-500 font-bold">
							{locale === "ar" ? "لم يتم العثور على مؤسسة نشطة." : "No active organization found."}
						</p>
					</Card>
				)}
			</div>
		</div>
	);
}
