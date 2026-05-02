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
import { useState } from "react";
import { Link } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
import {
	ShieldCheck,
	Mail,
	ArrowRight,
	ArrowLeft,
	CheckCircle2,
} from "lucide-react";

export default function ForgotPasswordPage() {
	const t = useTranslations("Auth");
	const locale = useLocale();
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);

	const handleRequestReset = async (e: React.FormEvent) => {
		// v1. synchronization marker: 1713401000
		e.preventDefault();
		setLoading(true);
		const { error } = await authClient.requestPasswordReset({
			email,
			redirectTo: "/reset-password",
		});

		setLoading(false);

		if (error) {
			// Final resilient error reporting
			let errorMessage = error instanceof Error ? error.message : "An error occurred";
			if (!errorMessage) {
				try {
					// Absolute fallback logic
					errorMessage =
						t("errorGeneric") || "Something went wrong. Please try again.";
				} catch (e) {
					errorMessage = "Something went wrong. Please try again.";
				}
			}
			alert(errorMessage || "An unexpected error occurred.");
		} else {
			setSuccess(true);
		}
	};

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
							{t("forgotPassword")}
						</CardTitle>
						<CardDescription className="text-slate-400 font-bold mt-1 text-sm">
							{success ? t("checkYourEmail") : t("loginSubtitle")}
						</CardDescription>
					</CardHeader>

					<CardContent className="px-10 py-5">
						{success ? (
							<div
								className="flex flex-col items-center justify-center py-6 text-center space-y-4"
								dir={locale === "ar" ? "rtl" : "ltr"}
							>
								<div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
									<CheckCircle2 className="h-8 w-8" />
								</div>
								<p className="text-slate-600 font-medium leading-relaxed">
									{t("checkYourEmail")}
								</p>
								<Button
									asChild
									variant="outline"
									className="mt-4 rounded-xl h-12 px-8 border-slate-200 text-slate-600 font-bold"
								>
									<Link href="/login">{t("loginLink")}</Link>
								</Button>
							</div>
						) : (
							<form
								onSubmit={handleRequestReset}
								className="space-y-5"
								dir={locale === "ar" ? "rtl" : "ltr"}
							>
								<div className="space-y-2 text-start">
									<Label
										htmlFor="email"
										className="text-slate-900 text-[10px] font-black uppercase tracking-widest ps-1 opacity-60"
									>
										{t("emailLabel")}
									</Label>
									<div className="relative group">
										<div className="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none">
											<Mail className="h-5 w-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
										</div>
										<Input
											id="email"
											type="email"
											placeholder="name@company.com"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											required
											className="h-12 ps-12 rounded-2xl bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-300 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/20 transition-all text-base font-medium"
											dir="ltr"
										/>
									</div>
								</div>
								<Button
									type="submit"
									className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-slate-900 text-white font-black text-lg shadow-xl shadow-indigo-100 transition-all group mt-4"
									disabled={loading}
								>
									{loading ? (
										t("loggingIn")
									) : (
										<div className="flex items-center gap-2">
											{t("sendResetLink")}
											{locale === "ar" ? (
												<ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
											) : (
												<ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
											)}
										</div>
									)}
								</Button>
							</form>
						)}
					</CardContent>

					{!success && (
						<CardFooter className="bg-slate-50/50 border-t border-slate-100 py-6 px-10 flex flex-col items-center">
							<Link
								href="/login"
								className="text-sm text-slate-500 font-bold hover:text-indigo-600 transition-colors flex items-center gap-2"
							>
								{locale === "ar" ? (
									<ArrowRight className="h-4 w-4" />
								) : (
									<ArrowLeft className="h-4 w-4" />
								)}
								{t("loginLink")}
							</Link>
						</CardFooter>
					)}
				</Card>
			</div>
		</div>
	);
}
