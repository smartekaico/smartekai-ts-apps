import { getTranslations, setRequestLocale } from "next-intl/server";
import {
	ShieldCheck,
	Scale,
	FileText,
	Search,
	ArrowLeft,
	CheckCircle2,
	Zap,
	Globe,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { DemoRequestModal } from "@/components/marketing/DemoRequestModal";

export const metadata = {
	title: "Legal AI Assistant | Smart OS for Boutique Law Firms",
	description:
		"Empower your law firm with intelligent contract analysis, drafting, and jurisdictional research. Purpose-built for boutique firms and independent practitioners.",
};

export default async function LegalMarketingPage({
	params,
}: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "LegalProduct" });
	const th = await getTranslations({ locale, namespace: "Header" });
	const isRtl = locale === "ar";

	return (
		<main
			className="min-h-screen bg-white text-slate-900 font-sans overflow-hidden"
			dir={isRtl ? "rtl" : "ltr"}
		>
			{/* Navigation */}
			<nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
				<div className="container mx-auto px-6 h-20 flex items-center justify-between">
					<div className="flex items-center gap-8">
						<Link href="/" className="flex items-center gap-2 group">
							<div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform">
								<Scale className="h-6 w-6" />
							</div>
							<span className="text-xl font-black tracking-tight text-slate-900">
								Legal OS
							</span>
						</Link>

						<div className="hidden md:flex items-center gap-6 text-sm font-bold text-slate-500">
							<a
								href="#features"
								className="hover:text-indigo-600 transition-colors"
							>
								{th("solutions")}
							</a>
							<a
								href="#privacy"
								className="hover:text-indigo-600 transition-colors"
							>
								{t("privacyTitle")}
							</a>
						</div>
					</div>

					<div className="flex items-center gap-4">
						<Link
							href="/login"
							className="text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors hidden sm:block"
						>
							{th("login")}
						</Link>
						<DemoRequestModal
							defaultIndustry="LEGAL"
							trigger={
								<Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold px-6 text-white shadow-lg shadow-indigo-200">
									{th("requestDemo")}
								</Button>
							}
						/>
					</div>
				</div>
			</nav>

			{/* Hero Section */}
			<section className="relative pt-40 pb-32 overflow-hidden bg-slate-50/50">
				<div className="absolute inset-0 z-0">
					<div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-100/50 rounded-full blur-3xl opacity-30" />
				</div>

				<div className="container mx-auto px-6 relative z-10">
					<div className="max-w-4xl mx-auto text-center space-y-8">
						<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-600 animate-in fade-in slide-in-from-bottom-4 duration-700">
							<Globe className="h-4 w-4" />
							{t("multiJurisdiction")}
						</div>

						<h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
							{t("title")}
							<br />
							<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400">
								{t("ultimatePower")}
							</span>
						</h1>

						<p className="text-lg md:text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-12 duration-700 delay-200">
							{t("subtitle")}
						</p>

						<div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 animate-in fade-in slide-in-from-bottom-16 duration-700 delay-300">
							<DemoRequestModal
								defaultIndustry="LEGAL"
								trigger={
									<Button
										size="lg"
										className="rounded-2xl h-14 px-10 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-2xl shadow-indigo-200/50 group"
									>
										{th("requestDemo")}
										{isRtl ? (
											<ArrowLeft className="mr-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
										) : (
											<Globe className="ml-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
										)}
									</Button>
								}
							/>
							<Button
								variant="ghost"
								size="lg"
								className="rounded-2xl h-14 px-8 font-bold text-slate-600 hover:bg-white hover:text-indigo-600"
							>
								{t("smartReview")}
							</Button>
						</div>
					</div>
				</div>
			</section>

			{/* Features Bento Grid */}
			<section id="features" className="py-32 container mx-auto px-6">
				<div className="text-center mb-20 space-y-4">
					<h2 className="text-3xl md:text-5xl font-black text-slate-900">
						{t("industriesTitle")}
					</h2>
					<p className="text-slate-500 font-medium max-w-lg mx-auto">
						{t("industriesSubtitle")}
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[240px]">
					{/* Feature 1: Large */}
					<div className="md:col-span-2 md:row-span-2 bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden group">
						<div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl group-hover:bg-indigo-600/40 transition-colors duration-700" />
						<div className="relative z-10 flex flex-col h-full justify-between">
							<div className="h-16 w-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform cursor-pointer">
								<FileText className="h-8 w-8 text-indigo-400" />
							</div>
							<div className="space-y-4">
								<h3 className="text-3xl font-black">{t("smartReview")}</h3>
								<p className="text-slate-400 font-medium max-w-md leading-relaxed">
									{t("smartReviewDesc")}
								</p>
								<div className="flex gap-2 pt-4">
									{[t("tagRisk"), t("tagSummary"), t("tagCompliance")].map(
										(tag) => (
											<span
												key={tag}
												className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black uppercase tracking-wider border border-white/5"
											>
												{tag}
											</span>
										),
									)}
								</div>
							</div>
						</div>
					</div>

					{/* Feature 2: Small */}
					<div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white group hover:shadow-2xl hover:shadow-indigo-200 transition-all duration-500">
						<div className="h-12 w-12 bg-white/10 rounded-xl flex items-center justify-center mb-6">
							<Zap className="h-6 w-6 text-white" />
						</div>
						<h3 className="text-xl font-black mb-3">{t("readyDrafts")}</h3>
						<p className="text-indigo-100 text-sm font-medium leading-relaxed">
							{t("readyDraftsDesc")}
						</p>
					</div>

					{/* Feature 3: Small */}
					<div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm group hover:border-indigo-100 transition-all duration-500">
						<div className="h-12 w-12 bg-slate-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-indigo-50 transition-colors">
							<Search className="h-6 w-6 text-slate-900 group-hover:text-indigo-600" />
						</div>
						<h3 className="text-xl font-black mb-3">{t("instantInfo")}</h3>
						<p className="text-slate-500 text-sm font-medium leading-relaxed">
							{t("instantInfoDesc")}
						</p>
					</div>
				</div>
			</section>

			{/* Trust & Security */}
			<section id="privacy" className="py-24 bg-slate-50/50">
				<div className="container mx-auto px-6">
					<div className="bg-white rounded-[3rem] p-12 md:p-20 border border-slate-100 shadow-xl flex flex-col md:flex-row items-center gap-16">
						<div className="flex-1 space-y-8">
							<h2 className="text-4xl font-black text-slate-900 leading-tight">
								{t("privacyTitle")}
								<br />
								{t("privacyNote")}
							</h2>
							<div className="space-y-6">
								{[
									{ title: t("secureHosting"), desc: t("security") },
									{
										title: t("corporateMemory"),
										desc: t("corporateMemoryDesc"),
									},
									{
										title: t("isolatedWorkspaces"),
										desc: t("isolatedWorkspacesDesc"),
									},
								].map((item, i) => (
									<div key={i} className="flex gap-4">
										<div className="mt-1">
											<CheckCircle2 className="h-6 w-6 text-indigo-600" />
										</div>
										<div>
											<h4 className="font-black text-slate-900">
												{item.title}
											</h4>
											<p className="text-sm text-slate-500 font-medium">
												{item.desc}
											</p>
										</div>
									</div>
								))}
							</div>
						</div>
						<div className="flex-1 relative">
							<div className="absolute inset-0 bg-indigo-600/5 blur-3xl rounded-full" />
							<div className="relative bg-slate-900 p-8 rounded-[2rem] shadow-2xl border border-white/5 transform rotate-2">
								<div className="flex items-center gap-3 mb-6">
									<div className="h-3 w-3 bg-red-500 rounded-full" />
									<div className="h-3 w-3 bg-amber-500 rounded-full" />
									<div className="h-3 w-3 bg-emerald-500 rounded-full" />
								</div>
								<div className="space-y-4 opacity-70">
									<div className="h-2 w-3/4 bg-slate-700 rounded-full" />
									<div className="h-2 w-1/2 bg-slate-700 rounded-full" />
									<div className="h-2 w-full bg-slate-700 rounded-full" />
									<div className="h-32 w-full bg-indigo-600/10 rounded-2xl border border-indigo-500/20 flex items-center justify-center">
										<Globe className="h-10 w-10 text-indigo-500 animate-pulse" />
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Footer / Final CTA */}
			<footer className="py-32 bg-white text-center">
				<div className="container mx-auto px-6 space-y-12">
					<div className="space-y-4">
						<h2 className="text-4xl md:text-6xl font-black text-slate-900">
							{t("ultimatePower")}
						</h2>
						<p className="text-slate-500 font-medium text-lg">
							{t("industriesSubtitle")}
						</p>
					</div>

					<DemoRequestModal
						defaultIndustry="LEGAL"
						trigger={
							<Button
								size="lg"
								className="rounded-2xl h-16 px-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xl shadow-2xl shadow-indigo-100 transition-all hover:scale-105"
							>
								{th("requestDemo")}
							</Button>
						}
					/>

					<div className="pt-20 border-t border-slate-100 mt-20 flex flex-col md:flex-row items-center justify-between gap-6 text-sm font-bold text-slate-400">
						<div className="flex items-center gap-3">
							<div className="h-8 w-8 bg-slate-100 rounded-lg flex items-center justify-center">
								<Scale className="h-4 w-4 text-slate-400" />
							</div>
							<span>SmarTekAI © {new Date().getFullYear()}</span>
						</div>
						<div className="flex items-center gap-8">
							<Link
								href="/terms-of-service"
								className="hover:text-indigo-600 transition-colors"
							>
								{th("faqs")}
							</Link>
							<Link
								href="/privacy-policy"
								className="hover:text-indigo-600 transition-colors"
							>
								{th("about")}
							</Link>
						</div>
					</div>
				</div>
			</footer>
		</main>
	);
}
