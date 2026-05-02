import { getTranslations, setRequestLocale } from "next-intl/server";
import { Scale, ShieldCheck, AlertCircle, Clock, FileText } from "lucide-react";

export const metadata = {
	title: "Terms of Service | AI SaaS Platform Terms and Conditions",
	description:
		"Review the terms and conditions for using our AI SaaS platform, products, services, subscriptions, and website.",
};

export default async function TermsPage({
	params,
}: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "Terms" });
	const isRtl = locale === "ar";

	return (
		<div className="pt-32 pb-20 bg-white min-h-screen">
			<div className="container mx-auto px-6 max-w-4xl">
				<div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-16 p-10 bg-indigo-50/50 rounded-[3rem] border border-indigo-100/50 relative overflow-hidden">
					<div className="space-y-4 relative z-10 text-start">
						<div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-lg border border-indigo-200 tracking-tight uppercase">
							<Scale className="h-3 w-3" />
							{t("badge")}
						</div>
						<h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
							{t("title")}
						</h1>
						<p className="text-slate-600 text-lg font-medium max-w-xl leading-relaxed">
							{t("subtitle")}
						</p>
					</div>
					<div className="h-24 w-24 bg-white rounded-[2.5rem] flex items-center justify-center text-indigo-600 shadow-xl border border-indigo-50 relative z-10 shrink-0 transition-transform hover:rotate-3">
						<FileText className="h-10 w-10" />
					</div>
					<div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-3xl -z-0 rounded-full" />
				</div>

				<div
					className="prose prose-slate max-w-none space-y-12 mb-20"
					dir={isRtl ? "rtl" : "ltr"}
				>
					<section className="space-y-6 text-start">
						<h3 className="text-2xl font-black text-slate-900 flex items-center gap-4">
							<span className="h-10 w-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-lg font-black shrink-0">
								1
							</span>
							{t("acceptance")}
						</h3>
						<p className="text-slate-600 text-lg leading-relaxed font-medium">
							{t("acceptanceDesc")}
						</p>
					</section>

					<section className="space-y-6 text-start">
						<h3 className="text-2xl font-black text-slate-900 flex items-center gap-4">
							<span className="h-10 w-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-lg font-black shrink-0">
								2
							</span>
							{t("privacy")}
						</h3>
						<p className="text-slate-600 text-lg leading-relaxed font-medium">
							{t("privacyDesc")}
						</p>
					</section>

					<section className="space-y-6 text-start">
						<h3 className="text-2xl font-black text-slate-900 flex items-center gap-4">
							<span className="h-10 w-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-lg font-black shrink-0">
								3
							</span>
							{t("liability")}
						</h3>
						<p className="text-slate-600 text-lg leading-relaxed font-medium">
							{t("liabilityDesc")}
						</p>
					</section>

					<section className="space-y-6 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 text-start">
						<h3 className="text-2xl font-black text-slate-900 flex items-center gap-4">
							<span className="h-10 w-10 bg-slate-900 text-white rounded-xl flex items-center justify-center text-lg font-black shrink-0">
								4
							</span>
							{t("use")}
						</h3>
						<p className="text-slate-600 text-lg leading-relaxed font-medium">
							{t("useDesc")}
						</p>
					</section>

					<section className="space-y-6 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 text-start">
						<h3 className="text-2xl font-black text-slate-900 flex items-center gap-4">
							<span className="h-10 w-10 bg-slate-900 text-white rounded-xl flex items-center justify-center text-lg font-black shrink-0">
								5
							</span>
							{t("support")}
						</h3>
						<p className="text-slate-600 text-lg leading-relaxed font-medium">
							{t("supportDesc")}
						</p>
					</section>

					<div className="p-10 bg-amber-50 border border-amber-100 rounded-[3rem] flex items-start gap-6 shadow-sm text-start">
						<AlertCircle className="h-8 w-8 text-amber-600 shrink-0 mt-1" />
						<div className="space-y-2">
							<p className="text-amber-900 text-lg font-black leading-relaxed">
								{t("notice")}
							</p>
							<p className="text-amber-800/80 font-bold leading-relaxed text-base">
								{t("noticeDesc")}
							</p>
						</div>
					</div>
				</div>

				<div className="flex flex-col md:flex-row items-center justify-between gap-6 border-t border-slate-100 pt-10">
					<div className="flex items-center gap-4 text-slate-400 font-bold text-sm">
						<Clock className="h-4 w-4" />
						{t("lastUpdated")}
					</div>
					<p className="text-slate-400 font-bold text-sm">
						legal@smartekai.com
					</p>
				</div>
			</div>
		</div>
	);
}
