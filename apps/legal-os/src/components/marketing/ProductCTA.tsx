import { getTranslations } from "next-intl/server";
import { Sparkles, ArrowRight, ArrowLeft } from "lucide-react";
import { DemoRequestModal } from "./DemoRequestModal";
import { Button } from "@/components/ui/button";

interface ProductCTAProps {
	locale: string;
	industry?: "LEGAL" | "MEDICAL" | "VOICE";
}

export async function ProductCTA({
	locale,
	industry = "LEGAL",
}: ProductCTAProps) {
	const t = await getTranslations({ locale, namespace: "ProductCTA" });
	const isRtl = locale === "ar";

	return (
		<section className="py-24 px-6">
			<div className="max-w-7xl mx-auto">
				<div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 border border-white/10 shadow-2xl">
					{/* Decorative Elements */}
					<div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] -mr-64 -mt-64" />
					<div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] -ml-64 -mb-64" />

					<div className="relative z-10 p-12 lg:p-20 text-center flex flex-col items-center">
						<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-indigo-300 text-sm font-bold mb-8 backdrop-blur-sm">
							<Sparkles className="h-4 w-4" />
							<span>{t("product_cta_button")}</span>
						</div>

						<h2 className="text-4xl lg:text-6xl font-black text-white mb-6 tracking-tight max-w-4xl">
							{t("product_cta_title")}
						</h2>

						<p className="text-xl lg:text-2xl text-slate-400 font-medium mb-12 max-w-2xl leading-relaxed">
							{t("product_cta_subtitle")}
						</p>

						<DemoRequestModal
							defaultIndustry={industry}
							trigger={
								<Button
									size="lg"
									className="h-16 px-10 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-black text-xl shadow-2xl transition-all hover:scale-105 active:scale-95 group flex items-center gap-3 border-none ring-0 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
								>
									{t("product_cta_button")}
									{isRtl ? (
										<ArrowLeft className="h-6 w-6 transition-transform group-hover:-translate-x-1" />
									) : (
										<ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
									)}
								</Button>
							}
						/>

						{/* Trust Badges placeholder or micro-copy */}
						<div className="mt-12 flex flex-wrap justify-center gap-8 opacity-40 grayscale contrast-125">
							{/* Add small partner logos here if available */}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
