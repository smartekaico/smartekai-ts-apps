import { getTranslations, setRequestLocale } from "next-intl/server";
import { Mail, MessageSquare } from "lucide-react";
import { ContactForm } from "@/components/marketing/ContactForm";

export const metadata = {
	title: "Contact Us | Talk to Our AI SaaS Team",
	description:
		"Contact our team to learn more about Legal Assistant OS, Medical Scribe, pricing, partnerships, or how our AI SaaS products can support your organization.",
};

export default async function ContactPage({
	params,
}: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "Contact" });

	return (
		<div className="pt-32 pb-20 bg-slate-50 min-h-screen">
			<div className="container mx-auto px-6 max-w-6xl">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
					<div className="space-y-10">
						<div className="space-y-6">
							<div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100/50 rounded-full text-indigo-700 text-sm font-black tracking-widest uppercase border border-indigo-200">
								<Mail className="h-4 w-4" />
								{t("badge")}
							</div>
							<h1 className="text-5xl md:text-6xl font-black tracking-tight text-slate-900 leading-tight">
								{t("headline")}
							</h1>
							<p className="text-slate-500 text-xl font-medium max-w-xl leading-relaxed">
								{t("desc")}
							</p>
						</div>

						<div className="space-y-8">
							<div className="flex items-start gap-5 p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-500">
								<div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100 shrink-0">
									<Mail className="h-6 w-6" />
								</div>
								<div>
									<h4 className="font-black text-slate-900 text-lg mb-1">
										{t("emailLabel")}
									</h4>
									<p className="text-slate-500 font-bold">{t("emailValue")}</p>
								</div>
							</div>
							<div className="flex items-start gap-5 p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-500">
								<div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100 shrink-0">
									<MessageSquare className="h-6 w-6" />
								</div>
								<div>
									<h4 className="font-black text-slate-900 text-lg mb-1">
										{t("helpTitle")}
									</h4>
									<p className="text-slate-500 font-bold">{t("helpDesc")}</p>
								</div>
							</div>
						</div>
					</div>

					<div className="bg-white p-10 md:p-14 rounded-[4rem] border border-slate-100 shadow-2xl shadow-slate-200/50 relative overflow-hidden">
						<div className="absolute top-0 right-0 w-full h-2 bg-indigo-600" />
						<div className="space-y-8 relative z-10">
							<div className="space-y-2">
								<h3 className="text-2xl font-black text-slate-900">
									{t("formTitle")}
								</h3>
								<p className="text-slate-400 font-bold text-sm">
									{t("formSubtitle")}
								</p>
							</div>

							<ContactForm />
						</div>
						<div className="absolute bottom-[-50px] right-[-50px] w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 pointer-events-none" />
					</div>
				</div>
			</div>
		</div>
	);
}
