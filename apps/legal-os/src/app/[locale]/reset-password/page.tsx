"use client";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { useState, Suspense } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, Lock, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/routing";

function ResetPasswordForm() {
	const t = useTranslations("Auth");
	const locale = useLocale();
	const router = useRouter();
	const searchParams = useSearchParams();
	const token = searchParams.get("token");

	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);

	const handleResetPassword = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!token) {
			alert("Invalid or missing token");
			return;
		}

		if (password !== confirmPassword) {
			alert("Passwords do not match");
			return;
		}

		setLoading(true);
		const { error } = await authClient.resetPassword({
			newPassword: password,
			token: token,
		});
		setLoading(false);

		if (error) {
			alert((error instanceof Error ? error.message : null) || t("errorGeneric"));
		} else {
			setSuccess(true);
			setTimeout(() => {
				router.push("/login?message=reset_successful");
			}, 3000);
		}
	};

	if (!token) {
		return (
			<div className="text-center p-6 space-y-4">
				<div className="h-16 w-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
					<ShieldCheck className="h-8 w-8" />
				</div>
				<CardTitle className="text-red-600">رابط غير صالح</CardTitle>
				<CardDescription>عذراً، هذا الرابط مفقود أو غير صحيح.</CardDescription>
			</div>
		);
	}

	return (
		<CardContent className="px-10 py-5">
			{success ? (
				<div
					className="flex flex-col items-center justify-center py-6 text-center space-y-4"
					dir={locale === "ar" ? "rtl" : "ltr"}
				>
					<div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
						<CheckCircle2 className="h-8 w-8" />
					</div>
					<p className="text-slate-600 font-black text-lg">
						{t("resetSuccess")}
					</p>
					<p className="text-slate-400 text-sm font-medium">
						جاري توجيهك لصفحة تسجيل الدخول...
					</p>
				</div>
			) : (
				<form
					onSubmit={handleResetPassword}
					className="space-y-5"
					dir={locale === "ar" ? "rtl" : "ltr"}
				>
					<div className="space-y-2 text-start">
						<Label
							htmlFor="password"
							className="text-slate-900 text-[10px] font-black uppercase tracking-widest ps-1 opacity-60"
						>
							{t("newPassword")}
						</Label>
						<div className="relative group">
							<div className="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none">
								<Lock className="h-5 w-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
							</div>
							<Input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								className="h-12 ps-12 rounded-2xl bg-slate-50 border-slate-100 text-slate-900 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/20 transition-all text-base font-medium"
								dir="ltr"
							/>
						</div>
					</div>

					<div className="space-y-2 text-start">
						<Label
							htmlFor="confirmPassword"
							className="text-slate-900 text-[10px] font-black uppercase tracking-widest ps-1 opacity-60"
						>
							{t("confirmPassword")}
						</Label>
						<div className="relative group">
							<div className="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none">
								<Lock className="h-5 w-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
							</div>
							<Input
								id="confirmPassword"
								type="password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								required
								className="h-12 ps-12 rounded-2xl bg-slate-50 border-slate-100 text-slate-900 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/20 transition-all text-base font-medium"
								dir="ltr"
							/>
						</div>
					</div>

					<Button
						type="submit"
						className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-slate-900 text-white font-black text-lg shadow-xl shadow-indigo-100 transition-all mt-4"
						disabled={loading}
					>
						{loading ? t("loggingIn") : t("resetButton")}
					</Button>
				</form>
			)}
		</CardContent>
	);
}

export default function ResetPasswordPage() {
	const t = useTranslations("Auth");
	const locale = useLocale();

	return (
		<div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-white px-4 py-8 selection:bg-indigo-500/30">
			{/* Background Decor */}
			<div
				className="absolute inset-0 w-full h-full z-0 opacity-40 pointer-events-none"
				aria-hidden="true"
			>
				<div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] -mr-32 -mt-32" />
				<div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] -ml-32 -mb-32" />
			</div>

			<div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
				<div className="flex flex-col items-center mb-8">
					<Link href="/" className="transition-transform hover:scale-105 duration-300">
						<div className="relative h-48 w-48">
							<Image
								src="/logo-full.svg"
								alt="SmarTekAI"
								fill
								priority
								sizes="256px"
								className="object-contain"
							/>
						</div>
					</Link>
				</div>

				<Card className="border-slate-100 bg-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.08)] rounded-[2.5rem] overflow-hidden">
					<CardHeader
						className="pt-8 pb-3 px-10 text-center"
						dir={locale === "ar" ? "rtl" : "ltr"}
					>
						<CardTitle className="text-xl font-black text-slate-900">
							{t("resetTitle")}
						</CardTitle>
					</CardHeader>

					<Suspense
						fallback={
							<div className="p-10 text-center font-bold text-slate-400">
								Loading reset verification...
							</div>
						}
					>
						<ResetPasswordForm />
					</Suspense>
				</Card>
			</div>
		</div>
	);
}
