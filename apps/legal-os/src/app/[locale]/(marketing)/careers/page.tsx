import { getTranslations, setRequestLocale } from "next-intl/server";
import {
	Briefcase,
	Zap,
	Globe,
	Heart,
	Sparkles,
	ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function CareersPage({
	params,
}: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	setRequestLocale(locale);

	const t = await getTranslations({ locale, namespace: "Careers" });

	return (
		<div className="pt-32 pb-20 bg-white min-h-screen overflow-hidden">
			<div className="container mx-auto px-6 max-w-5xl text-center space-y-12">
				<div className="space-y-6">
					<div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-full text-emerald-700 text-sm font-black tracking-widest uppercase">
						<Briefcase className="h-4 w-4" />
						{t("badge")}
					</div>
					<h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 leading-tight">
						{t("title")}
					</h1>
					<p className="text-slate-500 text-xl font-medium max-w-3xl mx-auto leading-relaxed">
						{t("subtitle")}
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-12">
					<div className="p-10 bg-slate-50 rounded-[3rem] border border-slate-100 space-y-4 hover:bg-slate-900 hover:text-white transition-all duration-500 group">
						<div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
							<Zap className="h-6 w-6" />
						</div>
						<h3 className="text-xl font-black">{t("growth")}</h3>
						<p className="text-slate-500 font-bold group-hover:text-slate-400">
							{t("growthDesc")}
						</p>
					</div>
					<div className="p-10 bg-slate-50 rounded-[3rem] border border-slate-100 space-y-4 hover:bg-slate-900 hover:text-white transition-all duration-500 group">
						<div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
							<Globe className="h-6 w-6" />
						</div>
						<h3 className="text-xl font-black">{t("remote")}</h3>
						<p className="text-slate-500 font-bold group-hover:text-slate-400">
							{t("remoteDesc")}
						</p>
					</div>
					<div className="p-10 bg-slate-50 rounded-[3rem] border border-slate-100 space-y-4 hover:bg-slate-900 hover:text-white transition-all duration-500 group">
						<div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-pink-500 shadow-sm">
							<Heart className="h-6 w-6" />
						</div>
						<h3 className="text-xl font-black">{t("benefits")}</h3>
						<p className="text-slate-500 font-bold group-hover:text-slate-400">
							{t("benefitsDesc")}
						</p>
					</div>
				</div>

				<div className="mt-20 p-12 bg-indigo-600 rounded-[4rem] text-white flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group">
					<div className="space-y-4 text-right md:text-left">
						<h3 className="text-3xl font-black tracking-tight leading-tight">
							{t("readyToScale")}
						</h3>
						<p className="text-indigo-100 font-bold text-lg">
							{t("readyToScaleDesc")}
						</p>
					</div>
					<Button
						className="h-16 px-10 rounded-[2rem] bg-white text-indigo-600 font-black text-lg hover:bg-indigo-50 transition-all shadow-2xl relative z-10"
						disabled
					>
						{t("exploreSoon")}
						<ArrowRight className="ml-2 h-5 w-5" />
					</Button>
					<Sparkles className="absolute bottom-[-10px] left-[-20px] h-32 w-32 text-white/5 animate-pulse" />
				</div>
			</div>
		</div>
	);
}
