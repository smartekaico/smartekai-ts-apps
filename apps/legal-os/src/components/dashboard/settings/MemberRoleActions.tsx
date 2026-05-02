"use client";

import { useState } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useTranslations, useLocale } from "next-intl";
import { Shield, Users, Crown, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MemberRoleActionsProps {
	memberId: string;
	currentRole: string;
	canEdit: boolean;
	isOwner: boolean;
}

export function MemberRoleActions({
	memberId,
	currentRole,
	canEdit,
	isOwner,
}: MemberRoleActionsProps) {
	const t = useTranslations("Settings");
	const locale = useLocale();
	const [loading, setLoading] = useState(false);
	const [role, setRole] = useState(currentRole);

	const handleRoleChange = async (newRole: string | null) => {
		if (!newRole || newRole === role) return;

		setLoading(true);
		try {
			const { error } = await (authClient as any).organization.updateMemberRole(
				{
					memberId,
					role: newRole as any,
				},
			);

			if (error) throw error;

			setRole(newRole);
			toast.success(
				locale === "ar" ? "تم تحديث الدور بنجاح" : "Role updated successfully",
			);
		} catch (error) {
			console.error("ROLE UPDATE ERROR:", error);
			toast.error(
				(error instanceof Error ? error.message : null) ||
					(locale === "ar" ? "فشل تحديث الدور" : "Failed to update role"),
			);
			// Revert on error
			setRole(currentRole);
		} finally {
			setLoading(false);
		}
	};

	// If it's an owner or the user can't edit, just show the badge
	if (isOwner || !canEdit) {
		return (
			<div
				className={cn(
					"flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-tight shadow-sm w-fit mx-auto",
					isOwner
						? "bg-amber-50 text-amber-600 border-amber-100"
						: "bg-slate-50 text-slate-600 border-slate-100",
				)}
			>
				{isOwner ? (
					<Crown className="h-3 w-3" />
				) : currentRole === "admin" ? (
					<Shield className="h-3 w-3" />
				) : (
					<Users className="h-3 w-3" />
				)}
				{isOwner
					? t("team.roleOwner")
					: currentRole === "admin"
						? t("team.roleAdmin")
						: t("team.roleMember")}
			</div>
		);
	}

	return (
		<div className="flex justify-center">
			<Select value={role} onValueChange={handleRoleChange} disabled={loading}>
				<SelectTrigger
					className={cn(
						"h-8 rounded-full text-[10px] font-black border uppercase tracking-tight shadow-sm transition-all focus:ring-2 focus:ring-indigo-500/20 px-3 w-fit gap-2",
						role === "admin"
							? "bg-indigo-50 text-indigo-700 border-indigo-100"
							: "bg-slate-50 text-slate-600 border-slate-100",
					)}
				>
					{loading ? (
						<Loader2 className="h-3 w-3 animate-spin" />
					) : role === "admin" ? (
						<Shield className="h-3 w-3" />
					) : (
						<Users className="h-3 w-3" />
					)}
					<SelectValue />
				</SelectTrigger>
				<SelectContent
					className="rounded-xl shadow-xl border-slate-100"
					dir={locale === "ar" ? "rtl" : "ltr"}
				>
					<SelectItem
						value="member"
						className="py-2.5 focus:bg-indigo-50 focus:text-indigo-700"
					>
						<div className="flex items-center gap-2">
							<Users className="h-3 w-3 opacity-50" />
							<span className="text-[11px] font-bold">
								{t("team.memberRole")}
							</span>
						</div>
					</SelectItem>
					<SelectItem
						value="admin"
						className="py-2.5 focus:bg-indigo-50 focus:text-indigo-700"
					>
						<div className="flex items-center gap-2">
							<Shield className="h-3 w-3 opacity-50" />
							<span className="text-[11px] font-bold">
								{t("team.adminRole")}
							</span>
						</div>
					</SelectItem>
				</SelectContent>
			</Select>
		</div>
	);
}
