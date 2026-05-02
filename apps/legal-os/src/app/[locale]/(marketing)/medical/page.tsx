import { DemoRequestModal } from "@/components/marketing/DemoRequestModal";
import {
	Stethoscope,
	Mic,
	FileText,
	ArrowLeft,
	HeartPulse,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function MedicalLandingPage() {
	return (
		<main
			className="min-h-screen bg-slate-50 text-slate-900 font-sans rtl overflow-hidden relative"
			dir="rtl"
		>
			{/* Navigation */}
			<nav className="relative z-10 container mx-auto px-6 py-6 flex items-center justify-between border-b border-slate-200">
				<div className="flex items-center gap-3">
					<div className="h-10 w-10 bg-emerald-600 rounded-xl flex items-center justify-center shrink-0">
						<HeartPulse className="h-6 w-6 text-white" />
					</div>
					<span className="text-xl font-black tracking-widest text-emerald-900">
						العيادة الذكية
					</span>
				</div>
				<div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-500">
					<Link href="/" className="hover:text-emerald-600 transition-colors">
						مقدمة Hub
					</Link>
					<Link
						href="/legal"
						className="hover:text-emerald-600 transition-colors"
					>
						عن الشركة
					</Link>
				</div>
				<div className="flex items-center gap-4">
					<Link
						href="/login"
						className="text-sm font-bold text-slate-600 hover:text-emerald-600 transition-colors hidden sm:block"
					>
						تسجيل الدخول
					</Link>
					<DemoRequestModal
						defaultIndustry="MEDICAL"
						trigger={
							<Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold px-6 text-white shadow-lg shadow-emerald-200">
								طلب وصول للعيادة
							</Button>
						}
					/>
				</div>
			</nav>

			{/* Hero Section */}
			<section className="relative z-10 container mx-auto px-6 pt-24 pb-32 max-w-5xl">
				<div className="flex flex-col md:flex-row items-center gap-12">
					<div className="flex-1 space-y-8">
						<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-xs font-bold text-emerald-600">
							<span className="relative flex h-2 w-2">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
								<span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
							</span>
							مستقبل العمل السريري الذكي
						</div>

						<h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 leading-tight">
							لا مزيد من
							<br />
							<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
								الطباعة اليدوية.
							</span>
						</h1>

						<p className="text-lg md:text-xl text-slate-600 font-medium max-w-lg leading-relaxed">
							تحدث فقط بشكل طبيعي أثناء الفحص. يقوم سكرتيرك الطبي الذكي
							بالاستماع وتحويل المحادثة فوراً إلى تقارير SOAP وملاحظات سريرية
							دقيقة.
						</p>

						<DemoRequestModal
							defaultIndustry="MEDICAL"
							trigger={
								<Button
									size="lg"
									className="rounded-xl h-14 bg-slate-900 hover:bg-slate-800 text-white font-bold px-8 shadow-xl shadow-slate-200 gap-2"
								>
									احصل على حساب تجريبي
									<ArrowLeft className="h-5 w-5 rtl:rotate-180" />
								</Button>
							}
						/>
					</div>

					<div className="flex-1">
						<div className="bg-white rounded-3xl p-8 border shadow-2xl shadow-emerald-900/5 relative transform rotate-3">
							<div className="absolute -top-6 -right-6 h-16 w-16 bg-emerald-100 rounded-2xl flex items-center justify-center animate-bounce shadow-lg border border-emerald-200">
								<Mic className="h-8 w-8 text-emerald-600" />
							</div>
							<div className="space-y-4">
								<div className="h-10 w-3/4 bg-slate-100 rounded-lg animate-pulse" />
								<div className="h-4 w-full bg-slate-50 rounded animate-pulse" />
								<div className="h-4 w-5/6 bg-slate-50 rounded animate-pulse" />
								<div className="h-4 w-4/6 bg-slate-50 rounded animate-pulse" />
								<div className="pt-4 border-t mt-6 flex gap-3">
									<div className="h-12 w-12 bg-emerald-50 rounded-xl" />
									<div className="h-12 w-full bg-emerald-50 rounded-xl" />
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>
		</main>
	);
}
