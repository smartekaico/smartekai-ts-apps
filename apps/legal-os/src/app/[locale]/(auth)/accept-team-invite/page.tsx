"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import {
	Loader2,
	UserPlus,
	CheckCircle2,
	AlertCircle,
	Building2,
	ArrowRight,
	Mail,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { fetchInvitationDetails } from "@/lib/actions/team-actions";

function AcceptInviteContent() {
	const t = useTranslations("Auth");
	const st = useTranslations("Settings");
	const locale = useLocale();
	const router = useRouter();
	const searchParams = useSearchParams();
	const inviteId = searchParams.get("id");

	const [loading, setLoading] = useState(true);
	const [invitation, setInvitation] = useState<any>(null);
	const [error, setError] = useState<string | null>(null);
	const [accepting, setAccepting] = useState(false);
	const [success, setSuccess] = useState(false);
	const [magicSent, setMagicSent] = useState(false);

	const { data: session } = authClient.useSession();

	useEffect(() => {
		if (inviteId) {
			fetchInvitation();
		} else {
			setError(
				locale === "ar" ? "رابط دعوة غير صالح" : "Invalid invitation link",
			);
			setLoading(false);
		}
	}, [inviteId, locale]);

	const fetchInvitation = async () => {
		try {
			const data = await fetchInvitationDetails(inviteId as string);

			if (!data) {
				setError(
					locale === "ar"
						? "لم يتم العثور على الدعوة أو انتهت صلاحيتها"
						: "Invitation not found or expired",
				);
				return;
			}
			setInvitation(data);
		} catch (err) {
			console.error("FETCH INVITE ERROR:", err);
			setError(
				locale === "ar"
					? "فشل تحميل تفاصيل الدعوة"
					: "Failed to load invitation details",
			);
		} finally {
			setLoading(false);
		}
	};

	const handleMagicLink = async () => {
		if (!invitation?.email) return;
		setAccepting(true);
		try {
			const { error } = await authClient.signIn.magicLink({
				email: invitation.email,
				callbackURL: `/accept-team-invite?id=${inviteId}`,
			});
			if (error) throw error;
			setMagicSent(true);
			toast.success(
				locale === "ar"
					? "تم إرسال رابط الدخول لبريدك"
					: "Magic link sent to your email",
			);
		} catch (err) {
			const msg = err instanceof Error ? (err instanceof Error ? err.message : "Unknown error") : "Error sending link";
			toast.error(msg);
		} finally {
			setAccepting(false);
		}
	};

	const handleAccept = async () => {
		if (!session) {
			toast.error(
				locale === "ar"
					? "يجب تسجيل الدخول أولاً"
					: "You must be logged in first",
			);
			router.push(`/login?callbackUrl=/accept-team-invite?id=${inviteId}`);
			return;
		}

		setAccepting(true);
		try {
			// Cast to any to bypass inferred type errors for organization plugin if TS fails to find it
			const { error } = await (authClient as any).organization.acceptInvitation(
				{
					invitationId: inviteId as string,
				},
			);

			if (error) throw error;

			setSuccess(true);
			toast.success(
				locale === "ar"
					? "تم الانضمام للفريق بنجاح"
					: "Joined team successfully",
			);

			// Redirect to dashboard after a short delay
			setTimeout(() => {
				router.push("/dashboard");
			}, 2000);
		} catch (err) {
			console.error("ACCEPT INVITE ERROR:", err);
			const errorMessage =
				err instanceof Error
					? (err instanceof Error ? err.message : "Unknown error")
					: (locale === "ar" ? "فشل قبول الدعوة" : "Failed to accept invitation");
			toast.error(errorMessage);
		} finally {
			setAccepting(false);
		}
	};

	if (loading) {
		return (
			<div className="flex flex-col items-center justify-center p-12 gap-4">
				<Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
				<p className="font-bold text-slate-500">
					{locale === "ar"
						? "جاري التحقق من الدعوة..."
						: "Verifying invitation..."}
				</p>
			</div>
		);
	}

	if (error || !invitation) {
		return (
			<Card className="max-w-md mx-auto rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white">
				<div className="p-10 text-center space-y-6">
					<div className="h-20 w-20 bg-red-50 rounded-[2rem] flex items-center justify-center text-red-500 mx-auto">
						<AlertCircle className="h-10 w-10" />
					</div>
					<div className="space-y-2">
						<h2 className="text-2xl font-black text-slate-900">
							{locale === "ar" ? "عذراً، حدث خطأ" : "Oops, something went wrong"}
						</h2>
						<p className="text-slate-500 font-medium leading-relaxed">
							{error}
						</p>
					</div>
					<Button
						onClick={() => router.push("/")}
						className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black transition-all"
					>
						{locale === "ar" ? "العودة للرئيسية" : "Back to Home"}
					</Button>
				</div>
			</Card>
		);
	}

	if (success) {
		return (
			<Card className="max-w-md mx-auto rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white">
				<div className="p-10 text-center space-y-6">
					<div className="h-20 w-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center text-emerald-500 mx-auto animate-bounce">
						<CheckCircle2 className="h-10 w-10" />
					</div>
					<div className="space-y-2">
						<h2 className="text-2xl font-black text-slate-900">
							{locale === "ar" ? "مرحباً بك في الفريق!" : "Welcome to the Team!"}
						</h2>
						<p className="text-slate-500 font-medium leading-relaxed">
							{locale === "ar"
								? "جاري توجيهك إلى لوحة التحكم الخاصة بك..."
								: "Redirecting you to your dashboard..."}
						</p>
					</div>
				</div>
			</Card>
		);
	}

	return (
		<Card
			className="max-w-md mx-auto rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white"
			dir={locale === "ar" ? "rtl" : "ltr"}
		>
			<div className="bg-indigo-600 p-10 text-white relative overflow-hidden text-center">
				<div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
				<div className="relative z-10 space-y-4">
					<div className="h-16 w-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto border border-white/20">
						<Building2 className="h-8 w-8" />
					</div>
					<div>
						<h2 className="text-2xl font-black">
							{invitation.organizationName}
						</h2>
						<p className="text-indigo-100 font-medium opacity-80">
							{locale === "ar" ? "دعوة انضمام للمكتب" : "Law Office Invitation"}
						</p>
					</div>
				</div>
			</div>

			<CardContent className="p-10 space-y-8">
				<div className="space-y-4 text-center">
					<p className="text-slate-600 font-bold leading-relaxed">
						{locale === "ar"
							? `لقد دعاك ${invitation.inviterEmail} للانضمام إلى مكتب ${invitation.organizationName} بصفتك ${invitation.role === "admin" ? "مشرف" : "محامي"}.`
							: `${invitation.inviterEmail} has invited you to join ${invitation.organizationName} as a ${invitation.role === "admin" ? "Supervisor" : "Lawyer"}.`}
					</p>
				</div>

				<div className="space-y-4">
					<Button
						onClick={handleAccept}
						disabled={accepting}
						className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-3"
					>
						{accepting && !magicSent ? (
							<Loader2 className="h-5 w-5 animate-spin" />
						) : (
							<UserPlus className="h-5 w-5" />
						)}
						{locale === "ar" ? "قبول الدعوة والانضمام" : "Accept & Join Team"}
					</Button>

					{!session && (
						<div className="space-y-4">
							<div className="relative">
								<div className="absolute inset-0 flex items-center">
									<span className="w-full border-t border-slate-100" />
								</div>
								<div className="relative flex justify-center text-[10px] uppercase tracking-widest font-black text-slate-300">
									<span className="bg-white px-4">
										{locale === "ar" ? "أو" : "OR"}
									</span>
								</div>
							</div>

							{magicSent ? (
								<div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-center animate-in fade-in slide-in-from-top-2">
									<p className="text-emerald-700 text-xs font-bold">
										{locale === "ar"
											? "تم إرسال الرابط! يرجى التحقق من بريدك."
											: "Link sent! Please check your email."}
									</p>
								</div>
							) : (
								<Button
									variant="outline"
									onClick={handleMagicLink}
									disabled={accepting}
									className="w-full h-12 rounded-2xl border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-black flex items-center justify-center gap-2"
								>
									{accepting ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<Mail className="h-4 w-4" />
									)}
									{locale === "ar"
										? "الدخول السريع بالبريد (Magic Link)"
										: "Quick Login via Magic Link"}
								</Button>
							)}
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

export default function AcceptInvitePage() {
	return (
		<div className="min-h-[80vh] flex items-center justify-center p-6 bg-slate-50/50">
			<Suspense
				fallback={
					<Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
				}
			>
				<AcceptInviteContent />
			</Suspense>
		</div>
	);
}
