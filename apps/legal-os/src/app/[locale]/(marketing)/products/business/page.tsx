import { getTranslations, setRequestLocale } from "next-intl/server";
import {
	Building2,
	Bot,
	PieChart,
	Sparkles,
	ShieldCheck,
	Zap,
	TrendingUp,
	Target,
	Layers,
	BarChart3,
	Search,
	CheckCircle2,
	Lock,
} from "lucide-react";
import { ProductCTA } from "@/components/marketing/ProductCTA";

export const metadata = {
	title: "Business & Finance AI | SMB Operations OS",
	description:
		"Automate bill readings, financial management, and agent-level assistance with our highly accurate Business Operations platform designed for SMBs and entrepreneurs.",
};

export default async function BusinessPage({
	params,
}: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "BusinessProduct" });
	const th = await getTranslations({ locale, namespace: "Header" });
	const isRtl = locale === "ar";

	const industries = [
		{
			title: t("accountingFirms"),
			desc: t("accountingFirmsDesc"),
			icon: Building2,
			color: "indigo",
		},
		{
			title: t("financeDepts"),
			desc: t("financeDeptsDesc"),
			icon: Target,
			color: "blue",
		},
		{
			title: t("smes"),
			desc: t("smesDesc"),
			icon: TrendingUp,
			color: "emerald",
		},
	];

	const workflows = [
		{
			title: t("workflow1"),
			desc: t("workflow1Desc"),
			icon: Search,
		},
		{
			title: t("workflow2"),
			desc: t("workflow2Desc"),
			icon: Layers,
		},
		{
			title: t("workflow3"),
			desc: t("workflow3Desc"),
			icon: BarChart3,
		},
	];

	return (
		<div className="flex flex-col w-full min-h-screen">
			{/* Hero Section */}
			<section className="relative pt-32 pb-24 overflow-hidden bg-white">
				<div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-indigo-50/50 to-transparent -z-10" />
				<div className="container mx-auto px-6 max-w-7xl">
					<header className="text-center max-w-4xl mx-auto space-y-8">
						<div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full text-indigo-700 text-sm font-black tracking-widest uppercase border border-indigo-100 animate-in fade-in slide-in-from-top-4 duration-1000">
							<Sparkles className="h-4 w-4" />
							{th("businessesFinance")}
						</div>
						<h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-slate-900 tracking-tight leading-[1.1] animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-100">
							{t("title")}
						</h1>
						<p className="text-xl md:text-2xl text-slate-500 font-medium leading-relaxed max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
							{t("subtitle")}
						</p>
					</header>

					<div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
						{/* Agent Assistant */}
						<div className="group bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col">
							<div className="w-16 h-16 bg-slate-50 text-indigo-600 rounded-3xl flex items-center justify-center border border-slate-100 mb-8 transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
								<Bot className="h-8 w-8" />
							</div>
							<h3 className="text-2xl lg:text-3xl font-black text-slate-900 mb-4">
								{t("agentTitle")}
							</h3>
							<p className="text-lg text-slate-500 font-medium leading-relaxed mb-4">
								{t("agentDesc")}
							</p>
						</div>

						{/* Bills Reader / Scanner */}
						<div className="group bg-slate-900 text-white p-10 rounded-[2.5rem] shadow-2xl scale-105 relative overflow-hidden flex flex-col justify-center min-h-[400px]">
							<div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-[80px] -mr-32 -mt-32" />
							<div className="relative z-10">
								<div className="w-16 h-16 bg-white/10 text-emerald-400 rounded-3xl flex items-center justify-center border border-white/20 mb-8 font-black text-xl backdrop-blur-sm">
									OCR
								</div>
								<h3 className="text-3xl lg:text-4xl font-black mb-4 leading-tight">
									{t("readerTitle")}
								</h3>
								<p className="text-lg lg:text-xl text-slate-400 font-medium leading-relaxed">
									{t("readerDesc")}
								</p>
							</div>
							<div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-slate-900 to-indigo-900/40 -z-10" />
						</div>

						{/* Finance Manager */}
						<div className="group bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col">
							<div className="w-16 h-16 bg-slate-50 text-amber-600 rounded-3xl flex items-center justify-center border border-slate-100 mb-8 transform group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500">
								<PieChart className="h-8 w-8" />
							</div>
							<h3 className="text-2xl lg:text-3xl font-black text-slate-900 mb-4">
								{t("managerTitle")}
							</h3>
							<p className="text-lg text-slate-500 font-medium leading-relaxed mb-4">
								{t("managerDesc")}
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* Industries Served */}
			<section className="py-24 bg-slate-50">
				<div className="container mx-auto px-6 max-w-7xl">
					<div className="text-center mb-20 space-y-4">
						<h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
							{t("industriesTitle")}
						</h2>
						<p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto">
							{t("industriesSubtitle")}
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-12">
						{industries.map((ind, i) => {
							const Icon = ind.icon;
							return (
								<div
									key={i}
									className="flex flex-col text-start p-10 rounded-[2rem] bg-indigo-900/5 border border-indigo-900/10 hover:bg-white hover:shadow-xl transition-all h-full"
								>
									<div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-indigo-600 mb-6 font-bold border border-slate-100">
										<Icon className="h-6 w-6" />
									</div>
									<h4 className="text-2xl font-black mb-4 text-slate-900">
										{ind.title}
									</h4>
									<p className="text-slate-500 font-medium leading-relaxed">
										{ind.desc}
									</p>
								</div>
							);
						})}
					</div>
				</div>
			</section>

			{/* Workflow Section */}
			<section className="py-24 bg-white overflow-hidden">
				<div className="container mx-auto px-6 max-w-7xl">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
						<div className="space-y-12">
							<div className="space-y-6">
								<h2 className="text-5xl font-black text-slate-900 tracking-tight leading-tight">
									{t("workflowTitle")}
								</h2>
								<div className="w-24 h-2 bg-indigo-600 rounded-full" />
							</div>

							<div className="space-y-8">
								{workflows.map((wf, i) => {
									const Icon = wf.icon;
									return (
										<div
											key={i}
											className="group flex gap-6 p-6 rounded-3xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
										>
											<div className="flex-shrink-0 w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold">
												{i + 1}
											</div>
											<div className="space-y-2">
												<h4 className="text-2xl font-black text-slate-900 flex items-center gap-3">
													<Icon className="h-6 w-6 text-indigo-400 group-hover:text-indigo-600 transition-colors" />
													{wf.title}
												</h4>
												<p className="text-slate-500 font-medium leading-relaxed">
													{wf.desc}
												</p>
											</div>
										</div>
									);
								})}
							</div>
						</div>

						<div className="relative">
							<div className="absolute inset-0 bg-indigo-600/10 blur-[100px] scale-150 rotate-12" />
							<div className="relative bg-slate-900 rounded-[3rem] p-8 lg:p-12 border border-white/10 shadow-3xl text-white">
								<div className="space-y-8">
									<div className="h-8 w-full bg-white/5 rounded-full overflow-hidden">
										<div className="h-full w-2/3 bg-indigo-500" />
									</div>
									<div className="space-y-4">
										<div className="h-4 w-3/4 bg-white/10 rounded-full" />
										<div className="h-4 w-1/2 bg-white/10 rounded-full" />
										<div className="h-4 w-5/6 bg-white/10 rounded-full" />
									</div>
									<div className="grid grid-cols-2 gap-4">
										<div className="h-24 bg-white/5 rounded-[2rem] border border-white/5 flex flex-col items-center justify-center">
											<span className="text-indigo-400 font-black text-2xl">
												99.9%
											</span>
											<span className="text-[10px] uppercase font-bold text-white/40 tracking-widest">
												{t("maxPrecision")}
											</span>
										</div>
										<div className="h-24 bg-indigo-600/20 rounded-[2rem] border border-indigo-500/20 flex flex-col items-center justify-center">
											<span className="text-emerald-400 font-black text-2xl">
												{t("fastProcessing")}
											</span>
											<span className="text-[10px] uppercase font-bold text-white/40 tracking-widest">
												{t("processingLabel")}
											</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Case Study / Trust Section */}
			<section className="py-24 bg-slate-900 text-white overflow-hidden relative">
				<div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[150px] -mr-96 -mb-96" />

				<div className="container mx-auto px-6 max-w-7xl relative z-10">
					<div className="mb-20 text-center space-y-4">
						<span className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-indigo-300 text-xs font-black tracking-widest uppercase">
							{t("caseStudy")}
						</span>
						<h2 className="text-4xl lg:text-6xl font-black">
							{t("caseTitle")}
						</h2>
						<p className="text-xl text-slate-400 max-w-2xl mx-auto">
							{t("caseSubtitle")}
						</p>
					</div>

					<div className="bg-white/5 backdrop-blur-md rounded-[3rem] p-12 lg:p-20 border border-white/10 shadow-2xl">
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
							<div className="space-y-8">
								<div className="flex items-center gap-4">
									<div className="w-16 h-16 bg-white text-slate-900 rounded-2xl flex items-center justify-center font-black text-2xl">
										{t("caseName")[0]}
									</div>
									<div>
										<h4 className="text-2xl font-black">{t("caseName")}</h4>
										<div className="flex gap-1 text-amber-400 mt-1">
											{[...Array(5)].map((_, i) => (
												<Sparkles key={i} className="h-4 w-4 fill-current" />
											))}
										</div>
									</div>
								</div>
								<blockquote className="text-3xl lg:text-4xl font-medium leading-tight italic text-slate-200">
									"{t("caseQuote")}"
								</blockquote>
							</div>

							<div className="grid grid-cols-2 gap-8">
								<div className="space-y-1">
									<div className="text-5xl lg:text-7xl font-black text-indigo-400">
										{t("metric1Value")}
									</div>
									<div className="text-slate-400 font-bold uppercase tracking-widest text-sm">
										{t("metric1Label")}
									</div>
								</div>
								<div className="space-y-1">
									<div className="text-5xl lg:text-7xl font-black text-indigo-400">
										{t("metric2Value")}
									</div>
									<div className="text-slate-400 font-bold uppercase tracking-widest text-sm">
										{t("metric2Label")}
									</div>
								</div>
								<div className="col-span-2 pt-8 border-t border-white/10 mt-8 space-y-1">
									<div className="text-4xl font-black text-white">
										{t("totalProcessed")}
									</div>
									<div className="text-slate-400 font-medium">
										{t("totalProcessedDesc")}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Privacy & Security Section */}
			<section className="py-24 bg-white">
				<div className="container mx-auto px-6 max-w-7xl">
					<div className="bg-slate-50 rounded-[3rem] p-12 lg:p-20 border border-slate-100 flex flex-col lg:flex-row items-center gap-16">
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
										<Lock className="h-5 w-5 text-indigo-600" />
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
							<ShieldCheck className="w-48 h-48 lg:w-64 lg:h-64 text-indigo-100" />
						</div>
					</div>
				</div>
			</section>

			{/* Standardized CTA */}
			<ProductCTA locale={locale} industry="VOICE" />
		</div>
	);
}
