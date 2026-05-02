"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations, useLocale } from "next-intl";
import { InviteMemberModal } from "./InviteMemberModal";

interface TeamManagementHeaderProps {
	memberCount: number;
}

export function TeamManagementHeader({
	memberCount,
}: TeamManagementHeaderProps) {
	const t = useTranslations("Settings");
	const locale = useLocale();
	const [isModalOpen, setIsModalOpen] = useState(false);

	return (
		<div className="flex flex-col md:flex-row md:items-center justify-between gap-6 no-print">
			<div className="space-y-2">
				<h1 className="text-3xl font-black text-slate-900 tracking-tight">
					{t("team.title")}
				</h1>
				<p className="text-slate-500 font-medium">{t("team.subtitle")}</p>
			</div>

			<div>
				<Button
					onClick={() => setIsModalOpen(true)}
					className="rounded-2xl px-8 h-12 font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-100 transition-all gap-3"
				>
					<UserPlus className="h-4 w-4" />
					{t("team.invite")}
				</Button>
			</div>

			<InviteMemberModal
				open={isModalOpen}
				onOpenChange={setIsModalOpen}
				memberCount={memberCount}
				onSuccess={() => {
					// Optional: refresh page logic is usually handled by Better Auth session sync
					// but here we can rely on manual refresh if needed
				}}
			/>
		</div>
	);
}
