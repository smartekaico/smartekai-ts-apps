import { ProductCTA } from "@/components/marketing/ProductCTA";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
	Scale,
	ShieldCheck,
	Zap,
	Search,
	FileText,
	CheckCircle2,
	Lock,
	TrendingUp,
	Building2,
	Briefcase,
	Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoRequestModal } from "@/components/marketing/DemoRequestModal";

export const metadata = {
	title: "Legal Assistant OS | AI Legal Assistant for Law Firms and Lawyers",
	description:
		"Legal Assistant OS helps law firms automate case analysis, legal drafting, reminders, contract generation, and client workflows with secure AI built for legal professionals.",
};

export default async function LegalProductPage({
	params,
}: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "LegalProduct" });
	const th = await getTranslations({ locale, namespace: "Header" });

	const features = [
		{ title: t("smartReview"), icon: FileText, desc: t("smartReviewDesc") },
		{ title: t("readyDrafts"), icon: Zap, desc: t("readyDraftsDesc") },
		{ title: t("instantInfo"), icon: Search, desc: t("instantInfoDesc") },
	];

	return (
		<div className="flex-grow pt-32 pb-24 bg-white font-sans">
			{/* Hero Section */}
			<section className="container mx-auto px-6 max-w-6xl mb-32">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
					<div className="space-y-8">
						<div className="h-16 w-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
							<Scale className="h-10 w-10" />
						</div>
						<h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight">
							{t("title")}
						</h1>
						<p className="text-xl text-slate-500 font-bold leading-relaxed">
							{t("subtitle")}
						</p>

						<div className="flex flex-col sm:flex-row gap-4 pt-4">
							<DemoRequestModal
								trigger={
									<Button className="h-14 px-10 rounded-xl font-black text-lg bg-indigo-600 shadow-xl shadow-indigo-100/50">
										{th("requestDemo")}
									</Button>
								}
							/>
							<Button
								variant="outline"
								className="h-14 px-10 rounded-xl font-black text-slate-600 border-slate-200 hover:bg-slate-50"
							>
								{t("viewSampleMemos", { defaultValue: "View Sample Memos" })}
							</Button>
						</div>
					</div>

					{/* Visual Element / Roadmap Note Card */}
					<div className="relative group">
						<div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden ring-1 ring-white/10 group-hover:scale-[1.02] transition-all duration-500">
							<div className="relative z-10 space-y-8">
								<div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 border border-white/5 text-[10px] font-black tracking-widest uppercase">
									<Zap className="h-3 w-3 text-amber-400" />
									{t("roadmapTitle")}
								</div>
								<p className="text-lg md:text-xl font-bold leading-relaxed text-indigo-100">
									{t("roadmapNote")}
								</p>
								<div className="flex items-center gap-4 text-xs font-black text-slate-400 uppercase tracking-widest">
									<CheckCircle2 className="h-4 w-4 text-emerald-400" />
									Global Multi-Jurisdiction Coverage
								</div>
							</div>
							<div className="absolute -bottom-24 -right-24 w-64 h-64 bg-indigo-600/30 rounded-full blur-[100px]" />
						</div>
					</div>
				</div>
			</section>
			{/* Industries & Core Solutions Block (SEO Dominance) */}
			<section className="bg-white py-32 border-t border-slate-100">
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
					<div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
						<div className="bg-slate-50 p-8 rounded-3xl border border-slate-200">
							<Scale className="h-10 w-10 text-indigo-600 mb-6" />
							<h3 className="text-xl font-black text-slate-900 mb-3">
								{t("lawFirms")}
							</h3>
							<p className="text-slate-500 font-medium leading-relaxed">
								{t("lawFirmsDesc")}
							</p>
						</div>
						<div className="bg-slate-50 p-8 rounded-3xl border border-slate-200">
							<Building className="h-10 w-10 text-indigo-600 mb-6" />
							<h3 className="text-xl font-black text-slate-900 mb-3">
								{t("corpCounsel")}
							</h3>
							<p className="text-slate-500 font-medium leading-relaxed">
								{t("corpCounselDesc")}
							</p>
						</div>
						<div className="bg-slate-50 p-8 rounded-3xl border border-slate-200">
							<Briefcase className="h-10 w-10 text-indigo-600 mb-6" />
							<h3 className="text-xl font-black text-slate-900 mb-3">
								{t("practitioners")}
							</h3>
							<p className="text-slate-500 font-medium leading-relaxed">
								{t("practitionersDesc")}
							</p>
						</div>
					</div>

					{/* Workflows */}
					<div className="bg-indigo-900 rounded-[3rem] p-10 md:p-16 text-white relative overflow-hidden shadow-2xl">
						<div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />
						<h3 className="text-2xl md:text-3xl font-black mb-12 relative z-10">
							{t("workflowTitle")}
						</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
							<div className="space-y-4">
								<div className="flex items-start gap-4">
									<div className="mt-1 h-8 w-8 min-w-8 rounded-full bg-indigo-500/30 flex items-center justify-center text-indigo-200 border border-indigo-400/50">
										1
									</div>
									<div>
										<h4 className="font-bold text-lg text-indigo-50">
											{t("workflow1")}
										</h4>
										<p className="text-indigo-200 text-sm mt-1 leading-relaxed">
											{t("workflow1Desc")}
										</p>
									</div>
								</div>
							</div>
							<div className="space-y-4">
								<div className="flex items-start gap-4">
									<div className="mt-1 h-8 w-8 min-w-8 rounded-full bg-indigo-500/30 flex items-center justify-center text-indigo-200 border border-indigo-400/50">
										2
									</div>
									<div>
										<h4 className="font-bold text-lg text-indigo-50">
											{t("workflow2")}
										</h4>
										<p className="text-indigo-200 text-sm mt-1 leading-relaxed">
											{t("workflow2Desc")}
										</p>
									</div>
								</div>
							</div>
							<div className="space-y-4">
								<div className="flex items-start gap-4">
									<div className="mt-1 h-8 w-8 min-w-8 rounded-full bg-indigo-500/30 flex items-center justify-center text-indigo-200 border border-indigo-400/50">
										3
									</div>
									<div>
										<h4 className="font-bold text-lg text-indigo-50">
											{t("workflow3")}
										</h4>
										<p className="text-indigo-200 text-sm mt-1 leading-relaxed">
											{t("workflow3Desc")}
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Feature Deep Dive */}
			<section className="bg-slate-50 py-32 border-y border-slate-100 overflow-hidden relative">
				<div className="container mx-auto px-6 max-w-6xl relative z-10">
					<h2 className="text-center text-3xl font-black text-slate-900 mb-16 uppercase tracking-wider underline underline-offset-[16px] decoration-indigo-500/30">
						{t("ultimatePower")}
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-12">
						{features.map((feature, idx) => (
							<div
								key={feature.title}
								className="bg-white p-10 rounded-[2.5rem] border border-slate-100 hover:shadow-xl hover:shadow-indigo-100/50 transition-all group"
							>
								<div className="h-14 w-14 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-8 border border-indigo-100 transition-colors group-hover:bg-indigo-600 group-hover:text-white group-hover:rotate-6">
									<feature.icon className="h-8 w-8" />
								</div>
								<h3 className="text-xl font-black text-slate-900 mb-4">
									{feature.title}
								</h3>
								<p className="text-slate-500 font-bold leading-relaxed text-sm h-16">
									{feature.desc}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Case Studies / ROI Metrics */}
			<section className="bg-indigo-900 py-32 text-indigo-50 relative overflow-hidden">
				<div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-500/20 rounded-full blur-[120px] mix-blend-screen opacity-50" />
				<div className="container mx-auto px-6 max-w-6xl relative z-10">
					<div className="text-center mb-20 space-y-6">
						<div className="inline-flex h-16 w-16 bg-indigo-500/20 rounded-2xl items-center justify-center text-indigo-300 border border-indigo-400/30 mb-4">
							<TrendingUp className="h-8 w-8" />
						</div>
						<h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
							{t("caseTitle")}
						</h2>
						<p className="text-lg font-medium text-indigo-200/80 max-w-2xl mx-auto">
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
									<span className="text-indigo-300 font-bold text-sm tracking-widest uppercase">
										{t("caseStudy")}
									</span>
								</div>
							</div>
							<blockquote className="text-xl font-medium text-indigo-100/90 leading-relaxed mb-10 italic">
								&quot;{t("caseQuote")}&quot;
							</blockquote>
							<div className="flex items-center justify-between border-t border-white/10 pt-8 mt-auto">
								<div className="space-y-1">
									<div className="text-3xl font-black text-white">
										{t("metric1Value")}
									</div>
									<div className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
										{t("metric1Label")}
									</div>
								</div>
								<div className="space-y-1 text-end">
									<div className="text-3xl font-black text-emerald-400">
										{t("metric2Value")}
									</div>
									<div className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
										{t("metric2Label")}
									</div>
								</div>
							</div>
						</div>

						{/* Metric Highlights */}
						<div className="flex flex-col gap-8">
							<div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden h-full flex flex-col justify-center">
								<h3 className="text-4xl lg:text-5xl font-black text-white mb-4">
									{t("totalProcessed")}
								</h3>
								<p className="text-indigo-200 text-lg md:text-xl font-bold leading-relaxed">
									{t("totalProcessedDesc")}
								</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Trust & Privacy Section */}
			<section className="container mx-auto px-6 max-w-5xl pt-32 text-center">
				<div className="inline-flex h-16 w-16 bg-emerald-50 rounded-2xl items-center justify-center text-emerald-600 mb-8 border border-emerald-100">
					<ShieldCheck className="h-8 w-8" />
				</div>
				<h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-8 leading-tight">
					{t("privacyTitle")}
				</h2>
				<p className="text-lg text-slate-500 font-bold max-w-2xl mx-auto mb-16">
					{t("privacyNote")}
				</p>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-start max-w-3xl mx-auto">
					<div className="bg-white border-l-4 border-emerald-500 p-8 rounded-2xl shadow-sm">
						<h4 className="font-black text-slate-900 mb-2 flex items-center gap-2">
							<Lock className="h-4 w-4" />
							{t("secureHosting")}
						</h4>
						<p className="text-slate-500 text-sm font-bold opacity-80">
							{t("security")}
						</p>
					</div>
					<div className="bg-white border-l-4 border-indigo-500 p-8 rounded-2xl shadow-sm">
						<h4 className="font-black text-slate-900 mb-2 flex items-center gap-2">
							<Scale className="h-4 w-4" />
							{t("maxPrecision")}
						</h4>
						<p className="text-slate-500 text-sm font-bold opacity-80">
							{t("maxPrecisionDesc")}
						</p>
					</div>
				</div>
			</section>
			{/* Large CTA Section */}
			<ProductCTA locale={locale} industry="LEGAL" />
		</div>
	);
}
