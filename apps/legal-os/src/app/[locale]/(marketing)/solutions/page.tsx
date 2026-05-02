import { getTranslations, setRequestLocale } from "next-intl/server";
import { Building2, Scale, Stethoscope, Zap, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { DemoRequestModal } from "@/components/marketing/DemoRequestModal";
import Image from "next/image";

export async function generateMetadata({
	params,
}: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	const t = await getTranslations({ locale, namespace: "SolutionsPage" });
	return {
		title: `${t("title")} | SmarTekAI`,
		description: t("subtitle"),
	};
}

export default async function SolutionsPage({
	params,
}: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "SolutionsPage" });
	const th = await getTranslations({ locale, namespace: "Header" });
	const isRtl = locale === "ar";

	const solutions = [
		{
			title: t("lawFirms"),
			desc: t("lawFirmsDesc"),
			icon: Scale,
			color: "indigo",
			href: "/products/legal-assistant-os",
			productName: "Legal Assistant OS",
			solutions: [
				isRtl ? "استراتيجيات تقاضي مؤتمتة" : "Automated Litigation Strategy",
				isRtl ? "تحليل مخاطر العقود" : "Contractual Risk Analysis",
				isRtl ? "بحث قانوني عبر الحدود" : "Cross-Border Legal Research",
				isRtl ? "إدارة القضايا الذكية" : "Smart Case Management"
			]
		},
		{
			title: t("healthcare"),
			desc: t("healthcareDesc"),
			icon: Stethoscope,
			color: "emerald",
			href: "/products/medical-scribe",
			productName: "Medical Scribe AI",
			solutions: [
				isRtl ? "تدوين سريري فوري" : "Real-time Clinical Scribing",
				isRtl ? "أتمتة ملاحظات SOAP" : "SOAP Note Automation",
				isRtl ? "تحليل البيانات المخبرية" : "Lab Data Insights",
				isRtl ? "تحسين رحلة المريض" : "Patient Journey Optimization"
			]
		},
		{
			title: t("finance"),
			desc: t("financeDesc"),
			icon: Building2,
			color: "slate",
			href: "/products/business",
			productName: "Business Ops OS",
			solutions: [
				isRtl ? "أتمتة التدقيق التشغيلي" : "Operational Audit Automation",
				isRtl ? "استخراج البيانات المالية" : "Financial Data Extraction",
				isRtl ? "وكلاء إدارة المكاتب" : "Back-office Ops Agents",
				isRtl ? "توقع التدفق النقدي" : "Cash-flow Forecasting"
			]
		}
	];

	return (
		<main
			className="pt-32 pb-20 bg-white min-h-screen"
			dir={isRtl ? "rtl" : "ltr"}
		>
			<div className="container mx-auto px-6 max-w-6xl space-y-24">
				{/* Header */}
				<header className="text-center space-y-6 max-w-4xl mx-auto">
					<div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-full text-indigo-600 text-[10px] font-black tracking-widest uppercase">
						<Zap className="h-3 w-3" />
						{t("badge")}
					</div>
					<h1 className="text-5xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.1]">
						{t("title")}
					</h1>
					<p className="text-slate-500 text-lg font-medium mx-auto leading-relaxed max-w-2xl">
						{t("subtitle")}
					</p>
				</header>

				{/* Solutions Grid */}
				<div className="grid grid-cols-1 gap-12">
					{solutions.map((sol, idx) => (
						<section 
							key={sol.href}
							className={cn(
								"flex flex-col lg:flex-row items-center gap-12 p-8 lg:p-12 rounded-[3rem] border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-2xl transition-all duration-700 group",
								idx % 2 === 1 && "lg:flex-row-reverse"
							)}
						>
							<div className="lg:w-1/2 space-y-8">
								<div className={cn(
									"h-16 w-16 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500",
									sol.color === "indigo" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" :
									sol.color === "emerald" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" :
									"bg-slate-900 text-white shadow-lg shadow-slate-200"
								)}>
									<sol.icon className="h-8 w-8" />
								</div>
								
								<div className="space-y-4">
									<h3 className="text-3xl font-black text-slate-900 tracking-tight">
										{sol.title}
									</h3>
									<p className="text-slate-500 text-lg font-medium leading-relaxed">
										{sol.desc}
									</p>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									{sol.solutions.map((s) => (
										<div key={s} className="flex items-center gap-3">
											<div className={cn(
												"h-2 w-2 rounded-full",
												sol.color === "indigo" ? "bg-indigo-500" :
												sol.color === "emerald" ? "bg-emerald-500" :
												"bg-slate-500"
											)} />
											<span className="text-sm font-bold text-slate-700">{s}</span>
										</div>
									))}
								</div>

								<div className="pt-4">
									<Link href={sol.href}>
										<Button 
											variant="outline" 
											className="h-12 px-8 rounded-xl font-black border-slate-200 hover:bg-slate-900 hover:text-white transition-all gap-2"
										>
											{t("exploreProduct", { product: sol.productName })}
											{isRtl ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
										</Button>
									</Link>
								</div>
							</div>

								<div className="lg:w-1/2 w-full aspect-video rounded-[2.5rem] bg-slate-50 border border-slate-200 shadow-xl overflow-hidden relative group-hover:scale-[1.02] transition-transform duration-700">
									{/* Fallback Background */}
									<div className={cn(
										"absolute inset-0 flex items-center justify-center opacity-20",
										sol.color === "indigo" ? "bg-indigo-500" : sol.color === "emerald" ? "bg-emerald-500" : "bg-slate-500"
									)}>
										<sol.icon className="h-40 w-40 text-white" />
									</div>

									{/* Real Image */}
									<Image
										src={sol.color === "indigo" ? "/images/solutions/legal.png" : 
											 sol.color === "emerald" ? "/images/solutions/healthcare.png" : 
											 "/images/solutions/business.png"}
										alt={sol.title}
										fill
										className="object-cover transition-transform duration-700 group-hover:scale-105 z-10"
										sizes="(max-width: 1024px) 100vw, 50vw"
									/>
									
									{/* Premium Overlay */}
									<div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-20" />
									
									{/* Badge Label (Fallback Visible) */}
									<div className="absolute inset-0 flex items-center justify-center z-0">
										<span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">
											{sol.productName}
										</span>
									</div>
								</div>
						</section>
					))}
				</div>

				{/* Global CTA */}
				<section className="bg-slate-950 rounded-[4rem] p-12 md:p-24 relative overflow-hidden text-center text-white shadow-2xl shadow-slate-900/20">
					<div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] -mr-64 -mt-64" />
					<div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] -ml-64 -mb-64" />
					
					<div className="relative z-10 space-y-10 max-w-3xl mx-auto">
						<div className="space-y-4">
							<h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
								{t("ctaTitle")}
							</h2>
							<p className="text-slate-400 text-xl font-medium">
								{t("ctaSubtitle")}
							</p>
						</div>

						<div className="flex flex-col sm:flex-row items-center justify-center gap-6">
							<DemoRequestModal
								trigger={
									<Button className="h-16 px-12 rounded-[2rem] bg-white text-slate-950 hover:bg-slate-100 font-black text-lg shadow-xl shadow-white/5 transition-all">
										{t("requestDemo")}
									</Button>
								}
							/>
							<Link href="/contact" className="text-slate-400 hover:text-white font-bold transition-colors">
								{isRtl ? "تحدث مع المبيعات" : "Talk to Sales"}
							</Link>
						</div>
					</div>
				</section>
			</div>
		</main>
	);
}
