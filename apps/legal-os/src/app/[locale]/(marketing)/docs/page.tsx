import { getTranslations, setRequestLocale } from "next-intl/server";
import { BookOpen, Code, Cpu, Globe, ShieldCheck, Zap } from "lucide-react";

export async function generateMetadata({
	params,
}: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	const t = await getTranslations({ locale, namespace: "Docs" });
	return {
		title: `${t("title")} | SmarTekAI`,
		description: t("subtitle"),
	};
}

export default async function DocsPage({
	params,
}: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "Docs" });
	const isRtl = locale === "ar";

	return (
		<main
			className="pt-32 pb-24 bg-slate-50 min-h-screen"
			dir={isRtl ? "rtl" : "ltr"}
		>
			<div className="container mx-auto px-6 max-w-5xl">
				<header className="mb-16">
					<div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100/50 rounded-full text-indigo-700 text-sm font-black tracking-widest uppercase border border-indigo-200 mb-6">
						<BookOpen className="h-4 w-4" />
						{t("title")}
					</div>
					<h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
						{t("headline")}
					</h1>
					<p className="text-lg text-slate-500 font-medium">{t("subtitle")}</p>
				</header>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
					<div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
						<div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-6">
							<Cpu className="h-6 w-6" />
						</div>
						<h3 className="text-xl font-black text-slate-900 mb-2">
							{t("archTitle")}
						</h3>
						<p className="text-slate-500 font-medium text-sm leading-relaxed">
							{t("archDesc")}
						</p>
					</div>

					<div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
						<div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-6">
							<Code className="h-6 w-6" />
						</div>
						<h3 className="text-xl font-black text-slate-900 mb-2">
							{t("apiTitle")}
						</h3>
						<p className="text-slate-500 font-medium text-sm leading-relaxed">
							{t("apiDesc")}
						</p>
					</div>

					<div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
						<div className="h-12 w-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-6">
							<ShieldCheck className="h-6 w-6" />
						</div>
						<h3 className="text-xl font-black text-slate-900 mb-2">
							{t("securityTitle")}
						</h3>
						<p className="text-slate-500 font-medium text-sm leading-relaxed">
							{t("securityDesc")}
						</p>
					</div>

					<div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
						<div className="h-12 w-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center mb-6">
							<Globe className="h-6 w-6" />
						</div>
						<h3 className="text-xl font-black text-slate-900 mb-2">
							{t("globalTitle")}
						</h3>
						<p className="text-slate-500 font-medium text-sm leading-relaxed">
							{t("globalDesc")}
						</p>
					</div>
				</div>

				<div className="mt-20 p-10 bg-slate-900 rounded-[3rem] text-white relative overflow-hidden text-center">
					<Zap className="h-12 w-12 text-indigo-400 mb-6 mx-auto" />
					<h2 className="text-2xl font-black mb-4">{t("comingSoon")}</h2>
					<p className="text-slate-400 font-medium max-w-xl mx-auto">
						{t("comingSoonDesc")}
					</p>
					<div className="absolute -bottom-24 -end-24 w-64 h-64 bg-indigo-600/20 rounded-full blur-[100px]" />
				</div>
			</div>
		</main>
	);
}
