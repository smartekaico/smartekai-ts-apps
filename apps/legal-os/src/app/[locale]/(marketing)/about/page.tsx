import { getTranslations, setRequestLocale } from "next-intl/server";
import { Building2, Scale, Stethoscope } from "lucide-react";

export async function generateMetadata({
	params,
}: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	const t = await getTranslations({ locale, namespace: "About" });
	return {
		title: `${t("title")} | SmarTekAI`,
		description: t("subtitle"),
	};
}

export default async function AboutPage({
	params,
}: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "About" });
	const isRtl = locale === "ar";

	return (
		<main
			className="pt-32 pb-20 bg-slate-50 min-h-screen overflow-hidden"
			dir={isRtl ? "rtl" : "ltr"}
		>
			<div className="container mx-auto px-6 max-w-5xl space-y-24">
				{/* Header Section */}
				<header className="text-center space-y-6 max-w-3xl mx-auto">
					<div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100/50 rounded-full text-indigo-700 text-sm font-black tracking-widest uppercase border border-indigo-200">
						<Building2 className="h-4 w-4" />
						{t("mission")}
					</div>
					<h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 leading-tight">
						{t("title")}
					</h1>
					<p className="text-slate-500 text-xl font-medium mx-auto leading-relaxed">
						{t("subtitle")}
					</p>
				</header>

				{/* Narrative Section */}
				<section className="bg-white rounded-[3rem] p-8 md:p-16 border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden">
					<div className="absolute top-0 end-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -me-32 -mt-32" />
					<div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-center">
						<div className="space-y-6 text-lg text-slate-600 font-medium leading-relaxed">
							<h2 className="text-3xl font-black text-slate-900 mb-8">
								{t("journey")}
							</h2>
							<p>{t("journeyP1")}</p>
							<p>{t("journeyP2")}</p>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100/50">
								<Scale className="h-8 w-8 text-indigo-600 mb-4" />
								<h4 className="font-black text-slate-900 mb-2">
									{t("focusLegal")}
								</h4>
								<p className="text-sm text-slate-500 font-medium">
									{t("focusLegalDesc")}
								</p>
							</div>
							<div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100/50 sm:translate-y-8">
								<Stethoscope className="h-8 w-8 text-emerald-600 mb-4" />
								<h4 className="font-black text-slate-900 mb-2">
									{t("focusMedical")}
								</h4>
								<p className="text-sm text-slate-500 font-medium">
									{t("focusMedicalDesc")}
								</p>
							</div>
							<div className="bg-amber-50 p-6 rounded-3xl border border-amber-100/50 sm:col-span-2">
								<Building2 className="h-8 w-8 text-amber-600 mb-4" />
								<h4 className="font-black text-slate-900 mb-2">
									{t("focusBusiness")}
								</h4>
								<p className="text-sm text-slate-500 font-medium">
									{t("focusBusinessDesc")}
								</p>
							</div>
						</div>
					</div>
				</section>

				{/* Goals Section */}
				<section className="text-center space-y-12 max-w-4xl mx-auto">
					<div className="space-y-4">
						<h2 className="text-4xl font-black text-slate-900">
							{t("goals")}
						</h2>
						<p className="text-slate-500 text-xl font-medium leading-relaxed">
							{t("goalsSubtitle")}
						</p>
					</div>
					<div className="bg-slate-900 text-white rounded-[3rem] p-12 md:p-20 relative overflow-hidden text-start">
						<div className="absolute bottom-0 start-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl -ms-48 -mb-48" />
						<p className="text-2xl md:text-3xl font-medium leading-relaxed relative z-10 opacity-90">
							{t("goalsP1")}
						</p>
					</div>
				</section>

				{/* Objectives Section */}
				<section className="space-y-12">
					<h2 className="text-4xl font-black text-slate-900 text-center">
						{t("objectives")}
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						{[1, 2, 3].map((i) => (
							<div key={i} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-lg shadow-slate-200/40 space-y-4">
								<div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-xl">
									{i}
								</div>
								<h4 className="text-xl font-black text-slate-900">
									{t(`objective${i}Title`)}
								</h4>
								<p className="text-slate-500 font-medium leading-relaxed">
									{t(`objective${i}Desc`)}
								</p>
							</div>
						))}
					</div>
				</section>
			</div>
		</main>
	);
}
