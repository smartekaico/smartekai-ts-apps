import { ProductCTA } from "@/components/marketing/ProductCTA";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
	Stethoscope,
	Activity,
	ShieldCheck,
	Zap,
	TrendingUp,
	Building2,
	Lock,
	CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoRequestModal } from "@/components/marketing/DemoRequestModal";

export const metadata = {
	title:
		"Medical Scribe | AI Medical Documentation and Clinical Note Assistant",
	description:
		"Medical Scribe helps healthcare professionals automate clinical notes, medical documentation, summaries, and workflow tasks with secure AI built for modern healthcare teams.",
};

export default async function MedicalProductPage({
	params,
}: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "MedicalProduct" });
	const th = await getTranslations({ locale, namespace: "Header" });

	return (
		<div className="relative pt-32 pb-24 bg-white min-h-screen overflow-hidden">
			<div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-emerald-50/50 to-transparent -z-10" />
			<section className="container mx-auto px-6 max-w-6xl">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-32">
					<div className="space-y-8">
						<div className="h-16 w-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-100">
							<Stethoscope className="h-10 w-10" />
						</div>
						<h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight animate-in fade-in slide-in-from-bottom-4 duration-700">
							{t("title")}
						</h1>
						<p className="text-xl text-slate-500 font-bold leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
							{t("subtitle")}
						</p>
						<div className="flex flex-col sm:flex-row gap-4 pt-4">
							<DemoRequestModal
								trigger={
									<Button className="h-14 px-10 rounded-xl font-black text-lg bg-emerald-600 shadow-xl shadow-emerald-100/50">
										{th("requestDemo")}
									</Button>
								}
							/>
						</div>
					</div>
					<div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 relative overflow-hidden group">
						<p className="text-lg font-bold text-slate-600 relative z-10 leading-relaxed">
							{t("desc")}
						</p>
						<Activity className="absolute bottom-[-20px] right-[-20px] h-32 w-32 text-emerald-500/10 group-hover:scale-110 transition-transform" />
					</div>
				</div>
			</section>

			{/* Industries & Core Solutions Block (SEO Dominance) */}
			<section className="bg-slate-50 py-32 border-t border-slate-100">
				<div className="container mx-auto px-6 max-w-6xl">
					<div className="text-center mb-20 space-y-4">
						<h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
							{t("industriesTitle")}
						</h2>
						<p className="text-lg text-slate-500 font-bold max-w-2xl mx-auto">
							{t("industriesSubtitle")}
						</p>
					</div>

					{/* Industries Served */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
						<div className="bg-white p-8 rounded-3xl border border-slate-200">
							<Building2 className="h-10 w-10 text-emerald-600 mb-6" />
							<h3 className="text-xl font-black text-slate-900 mb-3">
								{t("hospitals")}
							</h3>
							<p className="text-slate-500 font-medium leading-relaxed">
								{t("hospitalsDesc")}
							</p>
						</div>
						<div className="bg-white p-8 rounded-3xl border border-slate-200">
							<Stethoscope className="h-10 w-10 text-emerald-600 mb-6" />
							<h3 className="text-xl font-black text-slate-900 mb-3">
								{t("independent")}
							</h3>
							<p className="text-slate-500 font-medium leading-relaxed">
								{t("independentDesc")}
							</p>
						</div>
					</div>

					{/* Workflows */}
					<div className="bg-white rounded-[3rem] p-10 md:p-16 relative overflow-hidden shadow-xl border border-emerald-100">
						<div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
						<h3 className="text-2xl md:text-3xl font-black mb-12 relative z-10 text-slate-900">
							{t("workflow")}
						</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
							<div className="space-y-4">
								<div className="flex items-start gap-4">
									<div className="mt-1 h-8 w-8 min-w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-black">
										1
									</div>
									<div>
										<h4 className="font-black text-lg text-slate-900">
											{t("notes")}
										</h4>
										<p className="text-slate-600 text-sm mt-1 leading-relaxed">
											{t("notesDesc")}
										</p>
									</div>
								</div>
							</div>
							<div className="space-y-4">
								<div className="flex items-start gap-4">
									<div className="mt-1 h-8 w-8 min-w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-black">
										2
									</div>
									<div>
										<h4 className="font-black text-lg text-slate-900">
											{t("sync")}
										</h4>
										<p className="text-slate-600 text-sm mt-1 leading-relaxed">
											{t("syncDesc")}
										</p>
									</div>
								</div>
							</div>
							<div className="space-y-4">
								<div className="flex items-start gap-4">
									<div className="mt-1 h-8 w-8 min-w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-black">
										3
									</div>
									<div>
										<h4 className="font-black text-lg text-slate-900">
											{t("aiSupport")}
										</h4>
										<p className="text-slate-600 text-sm mt-1 leading-relaxed">
											{t("aiSupportDesc")}
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Case Studies / ROI Metrics */}
			<section className="bg-slate-900 py-32 text-emerald-50 relative overflow-hidden">
				<div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[120px] mix-blend-screen opacity-50" />
				<div className="container mx-auto px-6 max-w-6xl relative z-10">
					<div className="text-center mb-20 space-y-6">
						<div className="inline-flex h-16 w-16 bg-emerald-500/20 rounded-2xl items-center justify-center text-emerald-300 border border-emerald-400/30 mb-4">
							<TrendingUp className="h-8 w-8" />
						</div>
						<h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
							{t("caseTitle")}
						</h2>
						<p className="text-lg font-medium text-emerald-200/80 max-w-2xl mx-auto">
							{t("caseSubtitle")}
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
						{/* Case Study Card 1 */}
						<div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[2.5rem] hover:bg-white/10 transition-colors">
							<div className="flex items-center gap-4 mb-8">
								<div className="h-14 w-14 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
									<Building2 className="h-6 w-6 text-slate-300" />
								</div>
								<div>
									<h4 className="text-white font-black text-xl">
										{t("caseName")}
									</h4>
									<span className="text-emerald-400 font-bold text-sm tracking-widest uppercase">
										{t("caseStudy")}
									</span>
								</div>
							</div>
							<blockquote className="text-xl font-medium text-emerald-100/90 leading-relaxed mb-10 italic">
								&quot;{t("caseQuote")}&quot;
							</blockquote>
							<div className="flex items-center justify-between border-t border-white/10 pt-8 mt-auto">
								<div className="space-y-1">
									<div className="text-3xl font-black text-white">
										{t("metric1Value")}
									</div>
									<div className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
										{t("metric1Label")}
									</div>
								</div>
								<div className="space-y-1 text-end">
									<div className="text-3xl font-black text-blue-400">
										{t("metric2Value")}
									</div>
									<div className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
										{t("metric2Label")}
									</div>
								</div>
							</div>
						</div>

						{/* Metric Highlights */}
						<div className="flex flex-col gap-8">
							<div className="bg-gradient-to-br from-emerald-600 to-teal-800 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden h-full flex flex-col justify-center">
								<h3 className="text-4xl lg:text-5xl font-black text-white mb-4">
									{t("metrics1")}
								</h3>
								<p className="text-emerald-100 text-lg md:text-xl font-bold leading-relaxed">
									{t("metricsDesc1")}
								</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Privacy & Security Section */}
			<section className="py-24 bg-white">
				<div className="container mx-auto px-6 max-w-6xl">
					<div className="bg-slate-50 rounded-[3rem] p-12 lg:p-20 border border-slate-100 flex flex-col lg:flex-row items-center gap-16 animate-in fade-in scale-95 duration-1000">
						<div className="flex-1 space-y-8">
							<div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-bold border border-emerald-100">
								<ShieldCheck className="h-4 w-4" />
								{t("privacyTitle")}
							</div>
							<h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
								{t("privacySubtitle")}
							</h2>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="flex items-start gap-4">
									<div className="bg-white p-2 rounded-lg shadow-sm">
										<Lock className="h-5 w-5 text-emerald-600" />
									</div>
									<div>
										<h5 className="font-black text-slate-900">
											{t("secureHosting")}
										</h5>
										<p className="text-slate-500 text-sm">
											{t("secureHostingDesc")}
										</p>
									</div>
								</div>
								<div className="flex items-start gap-4">
									<div className="bg-white p-2 rounded-lg shadow-sm">
										<CheckCircle2 className="h-5 w-5 text-emerald-600" />
									</div>
									<div>
										<h5 className="font-black text-slate-900">
											{t("zeroRetention")}
										</h5>
										<p className="text-slate-500 text-sm">
											{t("zeroRetentionDesc")}
										</p>
									</div>
								</div>
							</div>
						</div>
						<div className="lg:w-1/3 flex justify-center">
							<ShieldCheck className="w-48 h-48 lg:w-64 lg:h-64 text-emerald-100" />
						</div>
					</div>
				</div>
			</section>

			{/* Large CTA Section */}
			<ProductCTA locale={locale} industry="MEDICAL" />
		</div>
	);
}
