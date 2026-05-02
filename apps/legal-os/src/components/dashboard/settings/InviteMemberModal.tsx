"use client";

import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useTranslations, useLocale } from "next-intl";
import {
	Mail,
	UserPlus,
	Loader2,
	AlertCircle,
	Shield,
	Users,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface InviteMemberModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	memberCount: number;
	onSuccess?: () => void;
}

export function InviteMemberModal({
	open,
	onOpenChange,
	memberCount,
	onSuccess,
}: InviteMemberModalProps) {
	const t = useTranslations("Settings");
	const locale = useLocale();
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<"admin" | "member">("member");
	const [loading, setLoading] = useState(false);

	const isLimitReached = memberCount >= 3; // 1 owner + 2 invites = 3 total

	const handleInvite = async () => {
		if (!email) {
			toast.error(
				locale === "ar"
					? "يرجى إدخال البريد الإلكتروني"
					: "Please enter an email address",
			);
			return;
		}

		setLoading(true);
		try {
			const { data, error } = await (
				authClient as any
			).organization.inviteMember({
				email,
				role: role as any,
			});

			if (error) {
				throw error;
			}

			toast.success(
				locale === "ar"
					? "تم إرسال الدعوة بنجاح"
					: "Invitation sent successfully",
			);
			onOpenChange(false);
			setEmail("");
			onSuccess?.();
		} catch (error) {
			console.error("INVITE ERROR:", error);
			toast.error(
				(error instanceof Error ? error.message : null) ||
					(locale === "ar" ? "فشل إرسال الدعوة" : "Failed to send invitation"),
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="sm:max-w-[480px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white"
				dir={locale === "ar" ? "rtl" : "ltr"}
			>
				<div className="bg-indigo-600 p-8 text-white relative overflow-hidden">
					<div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
					<DialogHeader className="relative z-10">
						<DialogTitle className="text-2xl font-black flex items-center gap-3">
							<UserPlus className="h-6 w-6" />
							{t("team.invite")}
						</DialogTitle>
						<DialogDescription className="text-indigo-100 font-medium">
							{t("team.inviteSubtitle")}
						</DialogDescription>
					</DialogHeader>
				</div>

				<div className="p-8 space-y-6">
					{isLimitReached && (
						<div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
							<AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
							<p className="text-xs font-bold text-amber-700 leading-relaxed">
								{t("team.limitReached")}
							</p>
						</div>
					)}

					<div className="space-y-4">
						<div className="space-y-2">
							<Label
								htmlFor="email"
								className="font-black text-[11px] uppercase tracking-widest text-slate-400 px-1"
							>
								{t("team.emailLabel")}
							</Label>
							<div className="relative">
								<Input
									id="email"
									type="email"
									placeholder="lawyer@firm.com"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:ring-2 focus:ring-indigo-500/20 font-bold pr-11"
									disabled={isLimitReached || loading}
								/>
								<Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
							</div>
						</div>

						<div className="space-y-2">
							<Label className="font-black text-[11px] uppercase tracking-widest text-slate-400 px-1">
								{t("team.roleLabel")}
							</Label>
							<Select
								value={role}
								onValueChange={(val) => setRole(val as any)}
								disabled={isLimitReached || loading}
							>
								<SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold focus:ring-2 focus:ring-indigo-500/20">
									<SelectValue />
								</SelectTrigger>
								<SelectContent
									className="rounded-xl shadow-xl"
									dir={locale === "ar" ? "rtl" : "ltr"}
								>
									<SelectItem
										value="member"
										className="py-3 focus:bg-indigo-50 focus:text-indigo-700"
									>
										<div className="flex items-center gap-2">
											<Users className="h-4 w-4 opacity-50" />
											<span>{t("team.memberRole")}</span>
										</div>
									</SelectItem>
									<SelectItem
										value="admin"
										className="py-3 focus:bg-indigo-50 focus:text-indigo-700"
									>
										<div className="flex items-center gap-2">
											<Shield className="h-4 w-4 opacity-50" />
											<span>{t("team.adminRole")}</span>
										</div>
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>

				<DialogFooter className="p-8 bg-slate-50/50 border-t border-slate-50 flex-col sm:flex-row gap-3">
					<Button
						variant="ghost"
						onClick={() => onOpenChange(false)}
						className="rounded-xl h-12 font-black text-slate-500 hover:bg-white"
						disabled={loading}
					>
						{locale === "ar" ? "إلغاء" : "Cancel"}
					</Button>
					<Button
						onClick={handleInvite}
						disabled={loading || isLimitReached || !email}
						className="flex-1 rounded-xl h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-lg shadow-indigo-100 gap-2"
					>
						{loading ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<UserPlus className="h-4 w-4" />
						)}
						{t("team.sendInvite")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
