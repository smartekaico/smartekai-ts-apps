import { db } from "@/db";
import { platformInvites } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { InviteRegistrationForm } from "@/components/global/InviteRegistrationForm";
import { ShieldCheck, Zap } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InvitePage({
	searchParams,
}: {
	searchParams: Promise<{ token?: string }>;
}) {
	const { token } = await searchParams;

	if (!token) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
				<Card className="w-full max-w-md rounded-3xl border-slate-200 shadow-xl text-center">
					<CardHeader>
						<div className="h-16 w-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
							<Zap className="h-8 w-8" />
						</div>
						<CardTitle className="text-2xl font-black text-slate-900">
							كود دعوة غير صالح
						</CardTitle>
						<CardDescription>
							هذا الرابط لا يحتوي على كود دعوة صحيح.
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	// Validate Token
	const invite = await db.query.platformInvites.findFirst({
		where: eq(platformInvites.token, token),
	});

	if (!invite || invite.status !== "unused") {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
				<Card className="w-full max-w-md rounded-3xl border-slate-200 shadow-xl text-center">
					<CardHeader>
						<div className="h-16 w-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
							<Zap className="h-8 w-8" />
						</div>
						<CardTitle className="text-2xl font-black text-slate-900">
							دعوة منتهية أو غير صالحة
						</CardTitle>
						<CardDescription>
							نعتذر، هذا الكود تم استخدامه مسبقاً أو أنه غير موجود في سجلاتنا.
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		);
	}

	return (
		<div
			className="flex min-h-screen items-center justify-center bg-[#FDFDFD] p-4 relative overflow-hidden"
			dir="rtl"
		>
			{/* Decorative Background Elements */}
			<div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-50 rounded-full blur-3xl opacity-50" />
			<div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-50 rounded-full blur-3xl opacity-50" />

			<Card className="w-full max-w-lg rounded-[2.5rem] border-slate-100 shadow-2xl shadow-indigo-100/50 z-10 overflow-hidden border-none translate-y-[-20px]">
				<div className="h-2 bg-indigo-600 w-full" />
				<CardHeader className="text-center space-y-4 pt-10 px-8">
					<div className="flex justify-center">
						<div className="h-20 w-20 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white rotate-3 shadow-xl shadow-slate-200">
							<ShieldCheck className="h-10 w-10" />
						</div>
					</div>
					<div>
						<CardTitle className="text-3xl font-black text-slate-900 tracking-tight">
							دعوة حصرية للانضمام
						</CardTitle>
						<CardDescription className="text-slate-500 text-lg mt-2 font-medium">
							مرحباً بك! لقد تمت دعوتك للانضمام إلى منصة{" "}
							{invite.industryRole === "LEGAL"
								? "المساعد القانوني"
								: invite.industryRole === "MEDICAL"
									? "المساعد الطبي"
									: "Smartek AI Hub"}
							.
						</CardDescription>
					</div>

					<div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 inline-flex items-center gap-3 mx-auto">
						<Zap className="h-5 w-5 text-indigo-600 fill-indigo-600" />
						<span className="text-indigo-900 font-bold">
							بانتظارك رصيد افتتاحي: {invite.initialCredits} نقطة
						</span>
					</div>
				</CardHeader>

				<CardContent className="p-8 pt-4">
					<InviteRegistrationForm
						token={token}
						role={invite.industryRole}
						credits={invite.initialCredits}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
