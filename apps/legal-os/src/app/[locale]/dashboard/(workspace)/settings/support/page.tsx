"use client";

import { useState } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	HelpCircle,
	MessageSquare,
	Mail,
	Send,
	CheckCircle2,
	ChevronDown,
	Sparkles,
	LifeBuoy,
	Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { submitSupportRequest } from "@/app/[locale]/actions/support";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { DashboardBreadcrumbs } from "@/components/dashboard/DashboardBreadcrumbs";

const FAQS = [
	{
		questionKey: "q1",
		answerKey: "a1",
	},
	{
		questionKey: "q2",
		answerKey: "a2",
	},
	{
		questionKey: "q3",
		answerKey: "a3",
	},
	{
		questionKey: "q4",
		answerKey: "a4",
	},
];

export default function SupportPage() {
	const t = useTranslations("Support");
	const locale = useLocale();
	const [formType, setFormType] = useState<string>("support");
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [openFaq, setOpenFaq] = useState<number | null>(null);

	const { data: session } = authClient.useSession();
	const userName = session?.user.name || "";
	const userEmail = session?.user.email || "";

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setIsSubmitting(true);

		const formData = new FormData(e.currentTarget);
		const name = formData.get("name") as string;
		const message = formData.get("message") as string;

		try {
			const result = await submitSupportRequest({
				name,
				type: formType,
				product: "legal",
				message,
			});

			if (result.success) {
				setIsSubmitted(true);
				toast.success(t("form.successTitle"));
				setTimeout(() => setIsSubmitted(false), 5000);
			} else {
				toast.error(result.error || "فشل إرسال الطلب");
			}
		} catch (err) {
			toast.error("حدث خطأ أثناء الاتصال بالخادم");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div
			className={cn(
				"max-w-[1400px] mx-auto space-y-10 animate-in fade-in duration-700 pb-20 p-4 md:p-8",
				locale === "ar" ? "rtl" : "ltr",
			)}
			dir={locale === "ar" ? "rtl" : "ltr"}
		>
			{/* Hero Section */}
			<div className="bg-slate-900 p-12 rounded-[3.5rem] text-white relative overflow-hidden group shadow-2xl">
				<div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(45deg,rgba(79,70,229,0.1)_0%,transparent_100%)]" />
				<div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
					<div
						className={cn(
							"space-y-4",
							locale === "ar" ? "text-right" : "text-left",
						)}
					>
						<div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full text-indigo-200 text-xs font-black tracking-widest uppercase mb-4">
							<LifeBuoy className="h-3 w-3" />
							{t("hero.badge")}
						</div>
						<h1 className="text-5xl font-black tracking-tight leading-tight">
							{t("hero.title")}
						</h1>
						<p className="text-slate-400 text-xl font-medium max-w-xl">
							{t("hero.subtitle")}
						</p>
					</div>
					<div className="h-24 w-24 bg-white/5 backdrop-blur-md rounded-[2.5rem] flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-500 shrink-0">
						<MessageSquare className="h-10 w-10 text-indigo-400" />
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
				{/* Support Form Card */}
				<Card className="rounded-[3rem] border-slate-100 shadow-xl overflow-hidden bg-white group border-t-8 border-t-indigo-600">
					<CardHeader className="p-10">
						<div className="flex items-center gap-4 mb-2">
							<div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100">
								<Mail className="h-6 w-6" />
							</div>
							<div className={cn("text-right", locale === "en" && "text-left")}>
								<CardTitle className="text-2xl font-black text-slate-900">
									{t("form.title")}
								</CardTitle>
								<CardDescription className="text-slate-500 font-bold">
									{t("form.subtitle")}
								</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent className="p-10 pt-0">
						{isSubmitted ? (
							<div className="p-12 text-center bg-emerald-50 rounded-[2rem] border border-emerald-100 flex flex-col items-center gap-4">
								<div className="h-16 w-16 bg-white rounded-full flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-100">
									<CheckCircle2 className="h-8 w-8" />
								</div>
								<h4 className="text-xl font-black text-emerald-900">
									{t("form.successTitle")}
								</h4>
								<p className="text-emerald-700 font-bold mb-4">
									{t("form.successSubtitle")}
								</p>
								<Button
									variant="outline"
									className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-100"
									onClick={() => setIsSubmitted(false)}
								>
									{locale === "ar"
										? "إرسال رسالة أخرى"
										: "Send another message"}
								</Button>
							</div>
						) : (
							<form onSubmit={handleSubmit} className="space-y-6">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-1">
										<label
											htmlFor="support-name"
											className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1"
										>
											{t("form.nameLabel")}
										</label>
										<Input
											id="support-name"
											key={userName || "anonymous"}
											name="name"
											defaultValue={userName}
											placeholder={t("form.namePlaceholder")}
											className="rounded-2xl h-14 border-slate-100 bg-slate-50 focus:bg-white focus:ring-0 transition-all font-bold px-5"
											required
											disabled={isSubmitting}
										/>
									</div>
									<div className="space-y-1">
										<label 
											htmlFor="support-type"
											className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1"
										>
											{t("form.typeLabel")}
										</label>
										<Select
											value={formType}
											onValueChange={(val) => val && setFormType(val)}
											disabled={isSubmitting}
										>
											<SelectTrigger
												id="support-type"
												className={cn(
													"rounded-2xl h-14 border-slate-100 bg-slate-50 focus:bg-white transition-all font-bold px-5",
													locale === "ar"
														? "text-right flex-row-reverse"
														: "text-left flex-row",
												)}
											>
												<SelectValue>{t(`form.types.${formType}`)}</SelectValue>
											</SelectTrigger>
											<SelectContent
												className="rounded-2xl border-slate-100 shadow-xl"
												dir={locale === "ar" ? "rtl" : "ltr"}
											>
												<SelectItem value="support" className="font-bold py-3">
													{t("form.types.support")}
												</SelectItem>
												<SelectItem value="feedback" className="font-bold py-3">
													{t("form.types.feedback")}
												</SelectItem>
												<SelectItem value="feature" className="font-bold py-3">
													{t("form.types.feature")}
												</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>

								<div
									className={cn(
										"space-y-1",
										locale === "ar" ? "text-right" : "text-left",
									)}
								>
									<label
										htmlFor="support-message"
										className="text-[11px] font-black text-slate-500 uppercase tracking-widest px-1"
									>
										{t("form.messageLabel")}
									</label>
									<Textarea
										id="support-message"
										name="message"
										placeholder={t("form.messagePlaceholder")}
										className="rounded-[2rem] min-h-[160px] border-slate-100 bg-slate-50 focus:bg-white focus:ring-0 transition-all font-bold p-6 leading-relaxed"
										required
										disabled={isSubmitting}
									/>
									<p className="text-[10px] text-slate-400 font-bold px-3">
										{locale === "ar"
											? `سيصلك الرد على البريد الإلكتروني المرتبط: ${userEmail}`
											: `Response will be sent to: ${userEmail}`}
									</p>
								</div>
								<Button
									type="submit"
									disabled={isSubmitting}
									className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-xl shadow-indigo-100 group transition-all"
								>
									{isSubmitting ? (
										<>
											<Loader2 className="animate-spin h-5 w-5 ml-2" />
											{t("form.submitting")}
										</>
									) : (
										<>
											<span>{t("form.submit")}</span>
											<Send
												className={cn(
													"mx-2 h-5 w-5 transition-transform",
													locale === "ar"
														? "rotate-180 group-hover:-translate-x-1"
														: "group-hover:translate-x-1",
												)}
											/>
										</>
									)}
								</Button>
							</form>
						)}
					</CardContent>
				</Card>

				{/* FAQ Section Column */}
				<div className="space-y-8 text-right">
					<div
						className={cn(
							"flex items-center justify-between mb-2",
							locale === "ar" ? "flex-row" : "flex-row-reverse",
						)}
					>
						<h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
							<HelpCircle className="h-7 w-7 text-amber-500" />
							{t("faq.title")}
						</h3>
						<Sparkles className="h-5 w-5 text-indigo-400" />
					</div>

					<div className="space-y-4">
						{[
							{
								q:
									locale === "ar"
										? "كيف يمكنني شحن رصيد النقاط؟"
										: "How can I top up my credit balance?",
								a:
									locale === "ar"
										? "يمكنك شحن الرصيد من خلال صفحة 'الباقات والرصيد' في قائمة المستخدم."
										: "You can top up your balance through the 'Billing & Credits' page in the user menu.",
							},
							{
								q:
									locale === "ar"
										? "هل يمكنني دعوة أعضاء فريق آخرين؟"
										: "Can I invite other team members?",
								a:
									locale === "ar"
										? "نعم، من خلال صفحة 'إدارة الفريق' المتوفرة للمسؤولين في قائمة المستخدم."
										: "Yes, via the 'Team Management' page available for admins in the user menu.",
							},
						].map((faq, index) => (
							<div
								key={faq.q}
								className={cn(
									"rounded-[2rem] border border-slate-100 overflow-hidden transition-all duration-500 group",
									openFaq === index
										? "bg-white shadow-xl ring-2 ring-indigo-50"
										: "bg-white/50 hover:bg-white hover:shadow-lg",
								)}
							>
								<button
									type="button"
									onClick={() => setOpenFaq(openFaq === index ? null : index)}
									className={cn(
										"w-full p-8 flex items-center justify-between",
										locale === "ar" ? "text-right" : "text-left",
									)}
								>
									<span className="text-lg font-black text-slate-800 group-hover:text-indigo-600 transition-colors">
										{faq.q}
									</span>
									<ChevronDown
										className={cn(
											"h-5 w-5 text-slate-400 transition-transform duration-500",
											openFaq === index && "rotate-180 text-indigo-500",
										)}
									/>
								</button>
								<div
									className={cn(
										"overflow-hidden transition-all duration-500 ease-in-out",
										openFaq === index
											? "max-h-[300px] opacity-100"
											: "max-h-0 opacity-0",
									)}
								>
									<div className="p-8 pt-0 text-slate-500 font-bold leading-relaxed text-sm bg-slate-50/30">
										{faq.a}
									</div>
								</div>
							</div>
						))}
					</div>

					<Card className="rounded-[2.5rem] border-slate-100 bg-indigo-600 p-8 text-white mt-12 relative overflow-hidden">
						<div className="relative z-10 space-y-4">
							<h4 className="text-xl font-black">{t("contact.title")}</h4>
							<p className="text-indigo-100 font-bold opacity-80">
								{t("contact.subtitle")}
							</p>
						</div>
						<div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-2xl rounded-full translate-x-10 -translate-y-10" />
					</Card>
				</div>
			</div>
		</div>
	);
}
