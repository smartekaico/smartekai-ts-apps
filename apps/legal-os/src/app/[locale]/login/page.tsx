"use client";

import { useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import { authClient } from "@/lib/auth-client";
import { 
	Mail, 
	Lock, 
	ArrowRight, 
	ArrowLeft, 
	Loader2, 
	Sparkles,
	CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
	Card, 
	CardContent, 
	CardDescription, 
	CardFooter, 
	CardHeader, 
	CardTitle 
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { toast } from "sonner";
import { posthog } from "posthog-js";
import { checkEmailApprovedAction } from "../actions/auth-check";

export default function LoginPage() {
	const t = useTranslations("Auth");
	const locale = useLocale();
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [method, setMethod] = useState<"password" | "magicLink">("password");
	const [magicLinkSent, setMagicLinkSent] = useState(false);

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		
		const { error } = await authClient.signIn.email({
			email,
			password,
			callbackURL: "/dashboard",
		});

		setLoading(false);
		if (!error) {
			posthog.capture("login_success", { method: "password" });
			router.push("/dashboard");
		} else {
			toast.error(error.message || t("errorGeneric"));
		}
	};

	const handleMagicLink = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		// 1. Check if email is approved
		const approved = await checkEmailApprovedAction(email);
		
		if (!approved) {
			setLoading(false);
			toast.error(t("emailNotApproved"));
			return;
		}

		// 2. Proceed with magic link request
		const { error } = await authClient.signIn.magicLink({
			email,
			callbackURL: "/dashboard",
		});
		setLoading(false);
		if (!error) {
			setMagicLinkSent(true);
			posthog.capture("magic_link_requested", { email });
			toast.success(t("magicLinkSent"));
		} else {
			toast.error(error.message || t("errorGeneric"));
		}
	};

	return (
		<div className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-white px-4 selection:bg-indigo-500/30">
			{/* Background Decor */}
			<div className="absolute inset-0 w-full h-full z-0 opacity-40 pointer-events-none" aria-hidden="true">
				<div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] -mr-24 -mt-24 animate-blob" />
				<div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] -ml-24 -mb-24 animate-blob animation-delay-4000" />
			</div>

			<div className="relative z-10 w-full max-w-sm animate-in fade-in zoom-in-95 duration-500">
				<div className="flex flex-col items-center mb-6">
					<Link href="/" className="transition-transform hover:scale-105 duration-300">
						<div className="relative h-20 w-48">
							<Image
								src="/logo-horizontal.svg"
								alt="SmarTekAI"
								fill
								priority
								sizes="200px"
								className="object-contain"
							/>
						</div>
					</Link>
				</div>

				<Card className="border-slate-100 bg-white/80 backdrop-blur-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] rounded-[2rem] overflow-hidden">
					<CardHeader
						className="pt-6 pb-2 px-8 text-center"
						dir={locale === "ar" ? "rtl" : "ltr"}
					>
						<CardTitle className="text-lg font-black text-slate-900">
							{method === "password" ? t("loginTitle") : t("magicLinkButton")}
						</CardTitle>
						<CardDescription className="text-slate-400 font-bold mt-0.5 text-xs">
							{t("loginSubtitle")}
						</CardDescription>
					</CardHeader>
					
					<CardContent className="px-8 py-4">
						{magicLinkSent ? (
							<div
								className="text-center space-y-3 py-6 animate-in fade-in slide-in-from-bottom-2"
								dir={locale === "ar" ? "rtl" : "ltr"}
							>
								<div className="h-14 w-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 border border-emerald-100">
									<Mail className="h-7 w-7" />
								</div>
								<h3 className="text-base font-black text-slate-900">
									{t("magicLinkSent")}
								</h3>
								<Button
									variant="ghost"
									onClick={() => setMagicLinkSent(false)}
									className="text-slate-500 font-bold h-8 text-xs"
								>
									{t("loginLink")}
								</Button>
							</div>
						) : (
							<div className="space-y-4">
								<div className="flex p-1 bg-slate-100/50 rounded-xl mb-1">
									<button
										type="button"
										onClick={() => setMethod("password")}
										className={cn(
											"flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all",
											method === "password"
												? "bg-white text-indigo-600 shadow-sm"
												: "text-slate-500 hover:text-slate-700",
										)}
									>
										{t("usePassword")}
									</button>
									<button
										type="button"
										onClick={() => setMethod("magicLink")}
										className={cn(
											"flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all",
											method === "magicLink"
												? "bg-white text-indigo-600 shadow-sm"
												: "text-slate-500 hover:text-slate-700",
										)}
									>
										{t("useMagicLink")}
									</button>
								</div>

								<form
									onSubmit={method === "password" ? handleLogin : handleMagicLink}
									className="space-y-4"
									dir={locale === "ar" ? "rtl" : "ltr"}
								>
									<div className="space-y-1.5">
										<Label
											htmlFor="email"
											className="text-slate-900 text-[9px] font-black uppercase tracking-widest ps-1 opacity-60"
										>
											{t("emailLabel")}
										</Label>
										<div className="relative group">
											<div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none">
												<Mail className="h-4 w-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
											</div>
											<Input
												id="email"
												type="email"
												placeholder="name@company.com"
												value={email}
												onChange={(e) => setEmail(e.target.value)}
												required
												className="h-10 ps-10 rounded-xl bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500/5 focus:border-indigo-500/20 transition-all text-sm font-medium"
												dir="ltr"
											/>
										</div>
									</div>

									<div className={cn(
										"space-y-4 overflow-hidden transition-all duration-300 ease-in-out",
										method === "password" ? "max-h-40 opacity-100" : "max-h-0 opacity-0 pointer-events-none"
									)}>
										<div className="space-y-1.5 text-start">
											<div className="flex items-center justify-between px-1">
												<Label
													htmlFor="password"
													className="text-slate-900 text-[9px] font-black uppercase tracking-widest opacity-60"
												>
													{t("passwordLabel")}
												</Label>
												<Link
													href="/forgot-password"
													className="text-[9px] font-black uppercase tracking-wider text-indigo-600 hover:text-slate-950 transition-colors"
												>
													{t("forgotPassword")}
												</Link>
											</div>
											<div className="relative group">
												<div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none">
													<Lock className="h-4 w-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
												</div>
												<Input
													id="password"
													type="password"
													value={password}
													onChange={(e) => setPassword(e.target.value)}
													required={method === "password"}
													className="h-10 ps-10 rounded-xl bg-slate-50 border-slate-100 text-slate-900 focus:ring-2 focus:ring-indigo-500/5 focus:border-indigo-500/20 transition-all text-sm font-medium"
													dir="ltr"
												/>
											</div>
										</div>
									</div>

									<Button
										type="submit"
										className="w-full h-11 rounded-xl bg-slate-950 hover:bg-indigo-600 text-white font-black text-sm shadow-lg shadow-slate-100 hover:shadow-indigo-500/10 transition-all group mt-2"
										disabled={loading}
									>
										{loading ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<div className="flex items-center gap-2">
												{method === "password" ? t("loginButton") : t("magicLinkButton")}
												{locale === "ar" ? (
													<ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
												) : (
													<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
												)}
											</div>
										)}
									</Button>
								</form>
							</div>
						)}
					</CardContent>
					
					<CardFooter className="bg-slate-50/30 border-t border-slate-100 py-4 px-8 flex flex-col items-center gap-1">
						<div className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5">
							<span>{locale === "ar" ? "ليس لديك حساب؟" : "Don't have an account?"}</span>
							<Link
								href="/#demo"
								className="text-indigo-600 hover:text-slate-950 font-black transition-colors flex items-center gap-1 underline decoration-indigo-200 underline-offset-2 decoration-1"
							>
								{locale === "ar" ? "طلب ديمو" : "Request Demo"}
								<Sparkles className="h-3 w-3" />
							</Link>
						</div>
					</CardFooter>
				</Card>
			</div>
		</div>
	);
}
