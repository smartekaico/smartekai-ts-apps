import { auth } from "@/lib/auth";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LegalDashboard } from "@/components/legal/LegalDashboard";
import { MedicalDashboard } from "@/components/medical/MedicalDashboard";
import { VoiceDashboard } from "@/components/voice/VoiceDashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage(props: {
	params: Promise<{ locale: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const params = await props.params;
	const locale = params.locale;
	const searchParams = await props.searchParams;
	const cookieStore = await cookies();
	const viewAsUser =
		searchParams.viewAs === "user" ||
		cookieStore.get("viewAs")?.value === "user";

	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<div className="text-center space-y-4">
					<p className="text-slate-500 font-medium">
						الرجاء تسجيل الدخول للوصول إلى لوحة التحكم.
					</p>
				</div>
			</div>
		);
	}

	const role = session.user.industryRole;
	const userId = session.user.id;
	const userName = session.user.name;

	// Traffic Cop Logic: Role-based Routing
	// (Condition: Show legal dashboard if user IS legal OR if Admin is viewing-as-user)
	if (role === "LEGAL" || (role === "ADMIN" && viewAsUser)) {
		// Cast to ensure type safety for extended better-auth fields
		const extendedSession = session as unknown as {
			session: { activeOrganizationId?: string };
			user: { activeOrganizationId?: string };
		};

		return (
			<LegalDashboard
				userId={userId}
				userName={userName}
				organizationId={
					extendedSession.session.activeOrganizationId ||
					extendedSession.user.activeOrganizationId ||
					""
				}
			/>
		);
	}

	if (role === "MEDICAL") {
		return <MedicalDashboard />;
	}

	if (role === "VOICE") {
		return <VoiceDashboard />;
	}

	// Traffic Cop Logic for Admin Role
	if (role === "ADMIN") {
		redirect(`/${locale}/dashboard/admin`);
	}

	// Fallback for undefined or new roles
	return (
		<div className="max-w-[1400px] mx-auto p-8 text-center space-y-6">
			<div className="bg-amber-50 border border-amber-200 p-8 rounded-3xl">
				<h1 className="text-2xl font-bold text-amber-900">حساب غير مخصص</h1>
				<p className="text-amber-700 mt-2">
					لم يتم تعيين دور صناعي لحسابك بعد. يرجى التواصل مع الإدارة.
				</p>
			</div>
		</div>
	);
}
