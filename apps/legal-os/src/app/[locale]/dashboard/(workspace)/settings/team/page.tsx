import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { members, users, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
	Users,
	UserPlus,
	Shield,
	Mail,
	MoreHorizontal,
	Crown,
	Lock,
	Search,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { TeamManagementHeader } from "@/components/dashboard/settings/TeamManagementHeader";
import { MemberRoleActions } from "@/components/dashboard/settings/MemberRoleActions";

export default async function SettingsTeamPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		redirect("/login");
	}

	const activeOrgId =
		session.session.activeOrganizationId || session.user.activeOrganizationId;
	const t = await getTranslations("Settings");

	if (!activeOrgId) {
		return (
			<div className="p-20 text-center">
				<p className="text-slate-400 font-bold">لا توجد مؤسسة مرتبطة بحسابك.</p>
			</div>
		);
	}

	// Fetch organization members with user details
	const orgMembers = await db
		.select({
			id: members.id,
			role: members.role,
			userId: users.id,
			userName: users.name,
			userEmail: users.email,
			userImage: users.image,
			industryRole: users.industryRole,
		})
		.from(members)
		.innerJoin(users, eq(members.userId, users.id))
		.where(eq(members.organizationId, activeOrgId));

	const isAdmin =
		session.user.industryRole === "ADMIN" ||
		orgMembers.find((m) => m.userId === session.user.id)?.role === "owner";

	return (
		<div
			className="space-y-10 animate-in fade-in duration-700 rtl text-right"
			dir="rtl"
		>
			<TeamManagementHeader memberCount={orgMembers.length} />

			<div className="space-y-6">
				{/* Search & Utility Bar */}
				<div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
					<div className="relative flex-1">
						<Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
						<Input
							placeholder="ابحث عن عضو بالمكتب..."
							className="border-none bg-transparent h-10 pr-11 font-bold focus-visible:ring-0"
						/>
					</div>
					<Badge
						variant="outline"
						className="h-10 px-4 rounded-xl border-slate-100 text-slate-400 font-bold bg-slate-50"
					>
						{orgMembers.length} أعضاء
					</Badge>
				</div>

				{/* Team Table Card */}
				<Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-white">
					<div className="overflow-x-auto">
						<table className="w-full text-right border-collapse">
							<thead>
								<tr className="bg-slate-50/50 border-b border-slate-100">
									<th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
										العضو
									</th>
									<th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
										الدور المكتبي
									</th>
									<th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
										الإجراءات
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-50">
								{orgMembers.map((member) => (
									<tr
										key={member.id}
										className="hover:bg-slate-50/50 transition-all group"
									>
										<td className="p-6">
											<div className="flex items-center gap-4">
												<Avatar className="h-11 w-11 rounded-2xl border-2 border-white shadow-sm overflow-hidden shrink-0">
													<AvatarImage src={member.userImage || ""} />
													<AvatarFallback className="bg-indigo-600 text-white font-black">
														{member.userName.charAt(0).toUpperCase()}
													</AvatarFallback>
												</Avatar>
												<div className="flex flex-col min-w-0">
													<span className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
														{member.userName}
														{member.userId === session.user.id && (
															<Badge className="bg-slate-100 text-slate-400 text-[8px] font-black uppercase px-1.5 py-0 border-none">
																أنت
															</Badge>
														)}
													</span>
													<span className="text-[11px] text-slate-400 font-medium truncate tracking-tight">
														{member.userEmail}
													</span>
												</div>
											</div>
										</td>
										<td className="p-6 text-center">
											<MemberRoleActions
												memberId={member.id}
												currentRole={member.role}
												canEdit={isAdmin && member.userId !== session.user.id}
												isOwner={member.role === "owner"}
											/>
										</td>
										<td className="p-6 text-left">
											<Button
												variant="ghost"
												size="icon"
												className="h-9 w-9 rounded-xl text-slate-300 hover:text-slate-600 hover:bg-white transition-all shadow-sm border border-transparent hover:border-slate-100"
												disabled={
													!isAdmin ||
													member.userId === session.user.id ||
													member.role === "owner"
												}
											>
												<MoreHorizontal className="h-4 w-4" />
											</Button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</Card>

				{/* Access Rights Note */}
				<div className="flex items-center gap-3 p-6 bg-slate-50 rounded-2xl border border-slate-100">
					<div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center text-slate-400 shadow-sm">
						<Lock className="h-4 w-4" />
					</div>
					<p className="text-[11px] text-slate-500 font-bold leading-relaxed">
						تحكم في صلاحيات الوصول لأعضاء فريقك. الأدوار تحدد من يمكنه إدارة
						الفواتير، إضافة الأعضاء، أو الإشراف على قاعدة المعرفة الموحدة
						للمكتب.
					</p>
				</div>
			</div>
		</div>
	);
}
