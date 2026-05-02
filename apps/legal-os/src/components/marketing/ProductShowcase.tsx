"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { 
	Scale, 
	Stethoscope, 
	ArrowRight, 
	ArrowLeft, 
	CheckCircle2, 
	MessageSquare, 
	FileText, 
	PenTool, 
	Calendar, 
	Mic, 
	Activity, 
	Beaker
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from "next/image";

export function ProductShowcase() {
	const t = useTranslations("Landing");
	const locale = useLocale();
	const isRtl = locale === "ar";
	const [activeSuite, setActiveSuite] = useState<"legal" | "medical">("legal");

	const suites = {
		legal: {
			id: "legal",
			eyebrow: t("legalOS.eyebrow"),
			headline: t("legalOS.headline"),
			subheadline: t("legalOS.subheadline"),
			color: "indigo",
			icon: Scale,
			image: "/images/marketing/legal-os-mockup.png", // Fallback path
			features: [
				{ icon: MessageSquare, title: t("legalOS.feature1Title"), desc: t("legalOS.feature1Desc") },
				{ icon: FileText, title: t("legalOS.feature2Title"), desc: t("legalOS.feature2Desc") },
				{ icon: PenTool, title: t("legalOS.feature3Title"), desc: t("legalOS.feature3Desc") },
				{ icon: Calendar, title: t("legalOS.feature4Title"), desc: t("legalOS.feature4Desc") },
			]
		},
		medical: {
			id: "medical",
			eyebrow: t("medicalOS.eyebrow"),
			headline: t("medicalOS.headline"),
			subheadline: t("medicalOS.subheadline"),
			color: "emerald",
			icon: Stethoscope,
			image: "/images/marketing/medical-os-mockup.png", // Fallback path
			features: [
				{ icon: Mic, title: t("medicalOS.feature1Title"), desc: t("medicalOS.feature1Desc") },
				{ icon: FileText, title: t("medicalOS.feature2Title"), desc: t("medicalOS.feature2Desc") },
				{ icon: Beaker, title: t("medicalOS.feature3Title"), desc: t("medicalOS.feature3Desc") },
				{ icon: Calendar, title: t("medicalOS.feature4Title"), desc: t("medicalOS.feature4Desc") },
			]
		}
	};

	const current = suites[activeSuite];

	return (
		<section id="solutions" className="py-24 relative overflow-hidden">
			<div className="container mx-auto px-6 relative z-10">
				{/* Industry Toggle */}
				<div className="flex justify-center mb-16">
					<div className="inline-flex p-1.5 bg-slate-100 rounded-[2rem] border border-slate-200 shadow-inner relative">
						<div 
							className={cn(
								"absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-[1.75rem] transition-all duration-500 ease-out shadow-lg",
								activeSuite === "legal" 
									? (isRtl ? "translate-x-full bg-slate-900" : "translate-x-0 bg-slate-900")
									: (isRtl ? "translate-x-0 bg-slate-900" : "translate-x-full bg-slate-900")
							)}
						/>
						<button
							onClick={() => setActiveSuite("legal")}
							className={cn(
								"relative z-10 px-8 py-3 rounded-[1.75rem] text-sm font-black transition-colors duration-300 flex items-center gap-2",
								activeSuite === "legal" ? "text-white" : "text-slate-500 hover:text-slate-700"
							)}
						>
							<Scale className="h-4 w-4" />
							{isRtl ? "أنا محترف قانوني" : "I am a Legal Professional"}
						</button>
						<button
							onClick={() => setActiveSuite("medical")}
							className={cn(
								"relative z-10 px-8 py-3 rounded-[1.75rem] text-sm font-black transition-colors duration-300 flex items-center gap-2",
								activeSuite === "medical" ? "text-white" : "text-slate-500 hover:text-slate-700"
							)}
						>
							<Stethoscope className="h-4 w-4" />
							{isRtl ? "أنا محترف طبي" : "I am a Medical Professional"}
						</button>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
					{/* Text Content */}
					<div className={cn(
						"transition-all duration-700 ease-in-out transform",
						activeSuite === "legal" ? "translate-y-0 opacity-100" : "translate-y-4 opacity-100"
					)}>
						<div className={cn(
							"inline-block px-4 py-1.5 rounded-full text-xs font-black mb-6 uppercase tracking-widest border",
							activeSuite === "legal" ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
						)}>
							{current.eyebrow}
						</div>
						<h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 leading-tight">
							{current.headline}
						</h2>
						<p className="text-lg text-slate-500 font-medium leading-relaxed mb-10">
							{current.subheadline}
						</p>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
							{current.features.map((feature, idx) => (
								<div key={idx} className="group p-4 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-md transition-all">
									<div className={cn(
										"h-10 w-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110",
										activeSuite === "legal" ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"
									)}>
										<feature.icon className="h-5 w-5" />
									</div>
									<h3 className="font-black text-slate-900 mb-2">{feature.title}</h3>
									<p className="text-sm text-slate-500 font-medium leading-relaxed">
										{feature.desc}
									</p>
								</div>
							))}
						</div>
					</div>

					{/* Mockup Preview */}
					<div className={cn(
						"relative transition-all duration-1000 ease-in-out",
						activeSuite === "legal" ? "rotate-0" : "rotate-0"
					)}>
						<div className={cn(
							"absolute -inset-4 rounded-[3rem] blur-3xl opacity-20",
							activeSuite === "legal" ? "bg-indigo-500" : "bg-emerald-500"
						)} />
						<div className="relative bg-slate-900 rounded-[2.5rem] p-4 shadow-2xl border border-white/10 overflow-hidden aspect-[4/3] flex items-center justify-center">
							{/* In a real app, these would be the actual images I moved to public/ */}
							{/* For now, I'll use a beautiful themed placeholder since I can't move the brain images */}
							<div className="w-full h-full relative overflow-hidden rounded-[2rem] bg-slate-950 flex flex-col">
								{/* Browser Header */}
								<div className="h-10 border-b border-white/10 flex items-center px-6 gap-2">
									<div className="flex gap-1.5">
										<div className="w-2.5 h-2.5 rounded-full bg-rose-500/50" />
										<div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
										<div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
									</div>
									<div className="mx-auto h-4 w-32 bg-white/5 rounded-full" />
								</div>
								
								{/* Mock Interface Content */}
								<div className="flex-1 p-6 flex gap-6">
									<div className="w-1/4 space-y-4">
										{[1,2,3,4].map(i => (
											<div key={i} className="h-12 bg-white/5 rounded-xl border border-white/5" />
										))}
									</div>
									<div className="flex-1 space-y-6">
										<div className="h-48 bg-white/5 rounded-[2rem] border border-white/5 relative overflow-hidden">
											<div className={cn(
												"absolute inset-0 opacity-10",
												activeSuite === "legal" ? "bg-indigo-500" : "bg-emerald-500"
											)} />
											<div className="absolute inset-0 flex items-center justify-center">
												<current.icon className={cn(
													"h-24 w-24 opacity-20",
													activeSuite === "legal" ? "text-indigo-400" : "text-emerald-400"
												)} />
											</div>
										</div>
										<div className="grid grid-cols-2 gap-6">
											<div className="h-32 bg-white/5 rounded-2xl border border-white/5" />
											<div className="h-32 bg-white/5 rounded-2xl border border-white/5" />
										</div>
									</div>
								</div>
							</div>

							{/* Overlay Badge */}
							<div className="absolute bottom-10 right-10 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white flex items-center gap-4 animate-bounce">
								<div className={cn(
									"h-10 w-10 rounded-xl flex items-center justify-center text-white",
									activeSuite === "legal" ? "bg-indigo-600" : "bg-emerald-600"
								)}>
									<Activity className="h-5 w-5" />
								</div>
								<div>
									<div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">System Active</div>
									<div className="text-sm font-black text-slate-900">
										{activeSuite === "legal" ? "Legal Core Engine" : "Clinical Core Engine"}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
