import { getTranslations, setRequestLocale } from "next-intl/server";
import { DemoRequestModal } from "@/components/marketing/DemoRequestModal";
import { Mic, PhoneCall, ArrowLeft, BarChart, Globe } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";

export default async function VoiceLandingPage({
	params,
}: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "VoiceProduct" });
	const th = await getTranslations({ locale, namespace: "Header" });
	const isRtl = locale === "ar";

	return (
		<main
			className="min-h-screen bg-slate-900 text-white font-sans overflow-hidden relative"
			dir={isRtl ? "rtl" : "ltr"}
		>
			{/* Background Decoration */}
			<div className="absolute top-0 right-0 w-[800px] h-[800px] bg-amber-600/10 rounded-full blur-[120px] rounded-bl-[100px] opacity-50 point-events-none" />

			{/* Navigation */}
			<nav className="relative z-10 container mx-auto px-6 py-6 flex items-center justify-between border-b border-white/10">
				<div className="flex items-center gap-3">
					<div className="h-10 w-10 bg-amber-500 rounded-xl flex items-center justify-center shrink-0">
						<Mic className="h-6 w-6 text-slate-900" />
					</div>
					<span className="text-xl font-black tracking-widest text-white">
						Voice Ops
					</span>
				</div>
				<div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-400">
					<Link href="/" className="hover:text-amber-500 transition-colors">
						{t("nav.intro")}
					</Link>
					<Link
						href="/about"
						className="hover:text-amber-500 transition-colors"
					>
						{t("nav.company")}
					</Link>
				</div>
				<div className="flex items-center gap-4">
					<Link
						href="/login"
						className="text-sm font-bold text-slate-400 hover:text-amber-500 transition-colors hidden sm:block"
					>
						{t("nav.login")}
					</Link>
					<DemoRequestModal
						defaultIndustry="VOICE"
						trigger={
							<Button className="rounded-xl bg-amber-500 hover:bg-amber-600 font-bold px-6 text-slate-900 shadow-lg shadow-amber-900/50">
								{t("nav.cta")}
							</Button>
						}
					/>
				</div>
			</nav>

			{/* Hero Section */}
			<section className="relative z-10 container mx-auto px-6 pt-24 pb-32 max-w-5xl">
				<div className="flex flex-col md:flex-row items-center gap-12">
					<div className="flex-1 space-y-8">
						<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-500">
							<span className="relative flex h-2 w-2">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
								<span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
							</span>
							{t("badge")}
						</div>

						<h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight">
							{t("headline")}
							<br />
							<span className="text-amber-500">{t("headlineHighlight")}</span>
						</h1>

						<p className="text-lg md:text-xl text-slate-400 font-medium max-w-lg leading-relaxed">
							{t("desc")}
						</p>

						<DemoRequestModal
							defaultIndustry="VOICE"
							trigger={
								<Button
									size="lg"
									className="rounded-xl h-14 bg-white hover:bg-slate-200 text-slate-900 font-bold px-8 shadow-xl shadow-slate-900/50 gap-2"
								>
									{t("cta")}
									{isRtl ? (
										<ArrowLeft className="h-5 w-5" />
									) : (
										<Globe className="h-5 w-5" />
									)}
								</Button>
							}
						/>
					</div>

					<div className="flex-1">
						<div className="bg-slate-800 rounded-3xl p-8 border border-white/5 shadow-2xl relative transform -rotate-2">
							<div className="absolute -top-6 -right-6 h-16 w-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg border border-white/10">
								<PhoneCall className="h-8 w-8 text-amber-500" />
							</div>
							<div className="space-y-6">
								<div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-2xl">
									<div className="h-10 w-10 bg-amber-500/20 rounded-full flex items-center justify-center shrink-0">
										<Mic className="h-5 w-5 text-amber-500" />
									</div>
									<div>
										<div className="h-3 w-32 bg-slate-700 rounded mb-2" />
										<div className="h-2 w-24 bg-slate-600 rounded" />
									</div>
								</div>

								<div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10 mt-6">
									<div className="bg-slate-900 p-4 rounded-xl text-center">
										<BarChart className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
										<span className="text-xs font-bold text-slate-400">
											{t("stats.responseRate")}
										</span>
									</div>
									<div className="bg-slate-900 p-4 rounded-xl text-center">
										<PhoneCall className="h-6 w-6 text-indigo-400 mx-auto mb-2" />
										<span className="text-xs font-bold text-slate-400">
											{t("stats.savings")}
										</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>
		</main>
	);
}
