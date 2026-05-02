import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { Linkedin, Twitter } from "lucide-react";
import Image from "next/image";

export function MarketingFooter() {
	const t = useTranslations("Footer");
	const locale = useLocale();
	const year = new Date().getFullYear();

	return (
		<footer className="bg-slate-900 text-white border-t border-slate-800">
			<div className="container mx-auto px-6 py-10">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 lg:flex lg:justify-between">
					{/* Brand Col */}
					<div className="space-y-6 max-w-sm lg:col-span-2">
						<Link href="/" className="flex items-center group">
							<div className="relative h-16 w-64 transition-all group-hover:scale-105">
								<Image
									src="/logo-white-horizontal.svg"
									alt="SmarTekAI"
									fill
									sizes="240px"
									className="object-contain"
								/>
							</div>
						</Link>
						<p className="text-slate-400 text-sm leading-relaxed max-w-sm">
							{t("platformNews")}
						</p>
						<div className="flex flex-col gap-4 pt-2">
							<span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
								{t("connect")}
							</span>
							<div className="flex items-center gap-3">
								<a
									href="#"
									className="h-10 w-10 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-slate-400 hover:bg-indigo-600 hover:text-white hover:border-indigo-500 transition-all hover:scale-110 shadow-lg"
								>
									<Linkedin className="h-4 w-4" />
								</a>
								<a
									href="#"
									className="h-10 w-10 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-slate-400 hover:bg-indigo-600 hover:text-white hover:border-indigo-500 transition-all hover:scale-110 shadow-lg"
								>
									<Twitter className="h-4 w-4" />
								</a>
							</div>
						</div>
					</div>

					{/* Solutions Links Col */}
					<div className="space-y-6">
						<h4 className="text-sm font-black uppercase tracking-[0.2em] text-slate-300">
							{t("products")}
						</h4>
						<ul className="space-y-4">
							<li>
								<Link
									href="/products/legal-assistant-os"
									className="text-slate-400 hover:text-indigo-400 text-sm font-medium transition-colors flex items-center gap-2 group"
								>
									<span className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-indigo-500 transition-colors" />
									{t("legalSector")}
								</Link>
							</li>
							<li>
								<Link
									href="/products/medical-scribe"
									className="text-slate-400 hover:text-emerald-400 text-sm font-medium transition-colors flex items-center gap-2 group"
								>
									<span className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-emerald-500 transition-colors" />
									{t("healthcareSector")}
								</Link>
							</li>
							<li>
								<Link
									href="/solutions"
									className="text-slate-400 hover:text-white text-sm font-medium transition-colors flex items-center gap-2 group"
								>
									<span className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-slate-300 transition-colors" />
									{t("viewAllSolutions")}
								</Link>
							</li>
						</ul>
					</div>

					{/* Company Links Col */}
					<div className="space-y-6">
						<h4 className="text-sm font-black uppercase tracking-[0.2em] text-slate-300">
							{t("company")}
						</h4>
						<ul className="space-y-4">
							<li>
								<Link
									href="/about"
									className="text-slate-400 hover:text-white text-sm font-medium transition-colors"
								>
									{t("about")}
								</Link>
							</li>
							<li>
								<Link
									href="/faqs"
									className="text-slate-400 hover:text-white text-sm font-medium transition-colors"
								>
									{t("faqs")}
								</Link>
							</li>
							<li>
								<Link
									href="/privacy-policy"
									className="text-slate-400 hover:text-white text-sm font-medium transition-colors"
								>
									{t("privacy")}
								</Link>
							</li>
						</ul>
					</div>
				</div>

				{/* Bottom Bar */}
				<div className="mt-8 pt-6 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-500 text-xs font-bold uppercase tracking-widest">
					<div>
						© {year} SmarTekAI.{" "}
						{locale === "ar" ? "جميع الحقوق محفوظة." : "All rights reserved."}
					</div>
					<div className="flex items-center gap-6">
						<Link
							href="/privacy-policy"
							className="hover:text-white transition-colors"
						>
							{t("privacy")}
						</Link>
						<Link
							href="/terms-of-service"
							className="hover:text-white transition-colors"
						>
							{t("terms")}
						</Link>
					</div>
				</div>
			</div>
		</footer>
	);
}
