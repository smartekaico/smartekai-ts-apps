import React from "react";
import { getTranslations } from "next-intl/server";
import { getAuthenticatedSession } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { WorkspaceForm } from "@/components/dashboard/settings/WorkspaceForm";
import { Building2 } from "lucide-react";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function WorkspaceSettingsPage() {
	const session = await getAuthenticatedSession();

	if (!session || !session.session.activeOrganizationId) {
		redirect("/login");
	}

	const t = await getTranslations("Settings");

	// Fetch organization details
	const org = await db.query.organizations.findFirst({
		where: eq(organizations.id, session.session.activeOrganizationId),
	});

	if (!org) {
		redirect("/dashboard");
	}

	return (
		<div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
			{/* Header */}
			<div className="flex flex-col gap-2">
				<div className="flex items-center gap-3">
					<div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm">
						<Building2 className="h-5 w-5" />
					</div>
					<h1 className="text-3xl font-black text-slate-900 tracking-tight">
						{t("nav.firmDetails")}
					</h1>
				</div>
				<p className="text-slate-500 font-medium ps-1">
					{t("workspace.subtitle")}
				</p>
			</div>

			<WorkspaceForm
				organization={{
					id: org.id,
					name: org.name,
					logo: org.logo,
					defaultJurisdiction: org.defaultJurisdiction,
				}}
			/>
		</div>
	);
}
