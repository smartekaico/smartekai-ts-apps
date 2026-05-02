import { getTranslations, setRequestLocale } from "next-intl/server";
import { HelpCircle, Sparkles, Mail } from "lucide-react";
import { FaqClient } from "@/components/marketing/FaqClient";

export const metadata = {
	title: "FAQs | Common Questions About Our AI SaaS Products",
	description:
		"Find answers to common questions about our AI SaaS products, pricing, security, onboarding, workflows, and support for legal and healthcare teams.",
};

export default async function FAQsPage({
	params,
}: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "FAQS" });
	const faqs = t.raw("list") as { question: string; answer: string }[];

	return (
		<div className="pt-32 pb-20 bg-slate-50 min-h-screen">
			<div className="container mx-auto px-6 max-w-4xl">
				<div className="text-center mb-16 space-y-6">
					<div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100/50 rounded-full text-indigo-700 text-sm font-black tracking-widest uppercase border border-indigo-200">
						<HelpCircle className="h-4 w-4" />
						{t("badge")}
					</div>
					<h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight">
						{t("title")}
					</h1>
					<p className="text-slate-500 text-lg font-medium max-w-2xl mx-auto">
						{t("subtitle")}
					</p>
				</div>

				<FaqClient faqs={faqs} locale={locale} />

				<div className="mt-16 p-10 bg-slate-900 rounded-[3rem] text-white relative overflow-hidden group shadow-2xl">
					<div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
						<div className="space-y-4">
							<h4 className="text-2xl font-black">{t("noAnswer")}</h4>
							<p className="text-slate-400 font-bold text-lg opacity-80">
								{t("noAnswerDesc")}
							</p>
							<div className="flex flex-wrap gap-4 pt-2">
								<div className="px-5 py-2.5 bg-white/10 rounded-xl font-black text-sm border border-white/10 flex items-center gap-2">
									<Mail className="h-4 w-4 text-indigo-400" />
									Contact via form
								</div>
							</div>
						</div>
						<Sparkles className="h-16 w-16 text-indigo-500/20 absolute bottom-[-20px] right-20 group-hover:scale-125 transition-transform" />
					</div>
				</div>
			</div>
		</div>
	);
}
