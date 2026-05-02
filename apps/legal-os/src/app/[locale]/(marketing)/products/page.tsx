import { getTranslations, setRequestLocale } from "next-intl/server";
import { Scale, Stethoscope, ArrowRight, ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/routing";

export const metadata = {
	title: "AI Solutions Across Industries | SmarTekAI Platform",
	description:
		"Explore our unified AI platform's specialized solutions for legal and clinical sectors. Automate data workflows natively.",
};

export default async function ProductsOverviewPage({
	params,
}: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	setRequestLocale(locale);
	const isRtl = locale === "ar";

	return (
		<main className="pt-32 pb-32 bg-slate-50 min-h-screen relative overflow-hidden">
			{/* Background Decor */}
			<div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none -mr-64 -mt-32" />
			<div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none -ml-32 -mb-32" />

			<section className="container mx-auto px-6 max-w-6xl relative z-10">
				<header className="text-center mb-24 max-w-3xl mx-auto">
					<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100/50 text-xs font-black text-indigo-600 mb-8 tracking-widest uppercase">
						{locale === "ar" ? "منصة موحدة" : "Unified Platform"}
					</div>
					<h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-8 leading-tight tracking-tight">
						{locale === "ar"
							? "حلول ذكية لقطاعات متعددة"
							: "Intelligent Solutions"}
						<br />
						<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-emerald-500">
							{locale === "ar" ? "عبر منصة واحدة" : "Across Industries"}
						</span>
					</h1>
					<p className="text-xl text-slate-500 font-bold leading-relaxed">
						{locale === "ar"
							? "استكشف أدواتنا المخصصة لتسريع إنجاز أعمالك في القطاعات المهنية من خلال منصة واحدة سهلة الاستخدام."
							: "Explore our specialized tools designed to save time and speed up your workflow, all accessible through one unified login."}
					</p>
				</header>

				{/* Premium Grid layout for the Products */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
					{/* Legal Card */}
					<Link
						href="/products/legal-assistant-os"
						className="group rounded-[3rem] bg-white p-10 md:p-14 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-indigo-500/10 border border-slate-100 transition-all duration-500 flex flex-col h-full transform hover:-translate-y-2 relative overflow-hidden"
					>
						<div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] -mr-32 -mt-32 transition-opacity group-hover:opacity-100 opacity-50" />
						<div className="mb-10 h-24 w-24 bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-100 rounded-[1.5rem] flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform duration-500 relative z-10">
							<Scale className="h-12 w-12" />
						</div>
						<h2 className="text-3xl font-black text-slate-900 mb-4 relative z-10">
							{locale === "ar" ? "القطاع القانوني" : "Legal Sector OS"}
						</h2>
						<p className="text-slate-500 text-lg leading-relaxed font-medium mb-10 flex-grow relative z-10">
							{locale === "ar"
								? "مساعدك القانوني الذكي. صِغ مذكراتك آلياً، وابحث في القضايا بسرعة، وحلل العقود في ثوانٍ معدودة."
								: "Your smart legal assistant. Automatically draft memos, research cases instantly, and analyze complex contracts in seconds."}
						</p>
						<div className="flex items-center text-indigo-600 font-black text-lg group-hover:ms-2 transition-all gap-2 relative z-10">
							{locale === "ar" ? "تصفح الحلول القانونية" : "Explore Legal OS"}
							{isRtl ? (
								<ArrowLeft className="h-5 w-5" />
							) : (
								<ArrowRight className="h-5 w-5" />
							)}
						</div>
					</Link>

					{/* Medical Card */}
					<Link
						href="/products/medical-scribe"
						className="group rounded-[3rem] bg-white p-10 md:p-14 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-emerald-500/10 border border-slate-100 transition-all duration-500 flex flex-col h-full transform hover:-translate-y-2 relative overflow-hidden"
					>
						<div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] -mr-32 -mt-32 transition-opacity group-hover:opacity-100 opacity-50" />
						<div className="mb-10 h-24 w-24 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-100 rounded-[1.5rem] flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-500 relative z-10">
							<Stethoscope className="h-12 w-12" />
						</div>
						<h2 className="text-3xl font-black text-slate-900 mb-4 relative z-10">
							{locale === "ar" ? "القطاع الطبي" : "Medical Scribe"}
						</h2>
						<p className="text-slate-500 text-lg leading-relaxed font-medium mb-10 flex-grow relative z-10">
							{locale === "ar"
								? "ركز على رعاية مرضاك ودع النظام يكتب ملاحظاتك الطبية بدقة وسرية تامة دون أي جهد إضافي."
								: "Focus entirely on your patients while the platform securely and accurately writes your medical notes for you."}
						</p>
						<div className="flex items-center text-emerald-600 font-black text-lg group-hover:ms-2 transition-all gap-2 relative z-10">
							{locale === "ar" ? "تصفح الحلول الطبية" : "Explore Clinical AI"}
							{isRtl ? (
								<ArrowLeft className="h-5 w-5" />
							) : (
								<ArrowRight className="h-5 w-5" />
							)}
						</div>
					</Link>
				</div>
			</section>
		</main>
	);
}
