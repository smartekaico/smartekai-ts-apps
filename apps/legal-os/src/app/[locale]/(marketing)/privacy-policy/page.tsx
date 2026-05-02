import { getTranslations, setRequestLocale } from "next-intl/server";
import { Eye, ShieldCheck, Mail, Lock, History } from "lucide-react";

export const metadata = {
	title: "Privacy Policy | Data Protection and AI SaaS Privacy Practices",
	description:
		"Read our privacy policy to understand how we collect, use, protect, and process data across our AI SaaS products for legal and healthcare professionals.",
};

export default async function PrivacyPage({
	params,
}: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "Privacy" });
	const isRtl = locale === "ar";

	return (
		<div className="pt-32 pb-20 bg-white min-h-screen">
			<div className="container mx-auto px-6 max-w-4xl">
				<div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-16 p-10 bg-slate-50 rounded-[3rem] border border-slate-100 relative overflow-hidden">
					<div className="space-y-4 relative z-10 text-start">
						<div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-lg border border-emerald-100 tracking-tight uppercase">
							<ShieldCheck className="h-3 w-3" />
							{t("badge")}
						</div>
						<h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
							{t("title")}
						</h1>
						<p className="text-slate-500 text-lg font-medium max-w-xl leading-relaxed">
							{t("subtitle")}
						</p>
					</div>
					<div className="h-24 w-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl shrink-0 relative z-10 transition-transform hover:scale-105">
						<Eye className="h-10 w-10 text-emerald-400" />
					</div>
					<div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/5 blur-3xl -z-0 rounded-full" />
				</div>

				<div
					className="prose prose-slate max-w-none space-y-12 mb-20"
					dir={isRtl ? "rtl" : "ltr"}
				>
					<section className="space-y-6 text-start">
						<h3 className="text-2xl font-black text-slate-900 flex items-center gap-4">
							<span className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-lg font-black shrink-0">
								1
							</span>
							{t("section1")}
						</h3>
						<p className="text-slate-600 text-lg leading-relaxed font-medium">
							{t("section1Desc")}
						</p>
					</section>

					<section className="space-y-6 text-start">
						<h3 className="text-2xl font-black text-slate-900 flex items-center gap-4">
							<span className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-lg font-black shrink-0">
								2
							</span>
							{t("section2")}
						</h3>
						<p className="text-slate-600 text-lg leading-relaxed font-medium">
							{t("section2Desc")}
						</p>
					</section>

					<section className="space-y-6 text-start">
						<h3 className="text-2xl font-black text-slate-900 flex items-center gap-4">
							<span className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-lg font-black shrink-0">
								3
							</span>
							{t("section3")}
						</h3>
						<p className="text-slate-600 text-lg leading-relaxed font-medium">
							{t("section3Desc")}
						</p>
					</section>

					<section className="space-y-6 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 text-start">
						<h3 className="text-2xl font-black text-slate-900 flex items-center gap-4">
							<span className="h-10 w-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-lg font-black shrink-0">
								4
							</span>
							{t("section4")}
						</h3>
						<p className="text-slate-600 text-lg leading-relaxed font-medium">
							{t("section4Desc")}
						</p>
					</section>

					<section className="space-y-6 p-8 bg-rose-50 border border-rose-100 rounded-[2.5rem] text-start">
						<h3 className="text-2xl font-black text-rose-900 flex items-center gap-4">
							<span className="h-10 w-10 bg-rose-600 text-white rounded-xl flex items-center justify-center text-lg font-black shrink-0">
								5
							</span>
							{t("section5")}
						</h3>
						<p className="text-rose-900/70 text-lg leading-relaxed font-medium">
							{t("section5Desc")}
						</p>
					</section>

					<div className="p-10 bg-indigo-50 border border-indigo-100 rounded-[3rem] flex flex-col md:flex-row items-center gap-6 shadow-sm text-start">
						<div className="h-14 w-14 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
							<Lock className="h-7 w-7" />
						</div>
						<div className="space-y-1">
							<p className="text-indigo-900 text-lg font-black">
								{t("controlTitle")}
							</p>
							<p className="text-indigo-700/80 font-bold">{t("controlDesc")}</p>
						</div>
					</div>
				</div>

				<div
					className="grid grid-cols-1 md:grid-cols-2 gap-8 text-center md:text-start"
					dir={isRtl ? "rtl" : "ltr"}
				>
					<div className="p-8 bg-slate-50 rounded-[2rem] space-y-3 text-start">
						<History className="h-6 w-6 text-slate-400" />
						<h4 className="font-black text-slate-900">
							{t("transparentUpdates")}
						</h4>
						<p className="text-slate-500 text-sm font-bold">
							{t("transparentUpdatesDesc")}
						</p>
					</div>
					<div className="p-8 bg-slate-50 rounded-[2rem] space-y-3 text-start">
						<Mail className="h-6 w-6 text-slate-400" />
						<h4 className="font-black text-slate-900">{t("privacyCenter")}</h4>
						<p className="text-slate-500 text-sm font-bold">
							privacy@smartekai.com
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
