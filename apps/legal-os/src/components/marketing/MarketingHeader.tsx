"use client";

import { useState, useEffect } from "react";
import { Link, useRouter, usePathname } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import {
	ChevronDown,
	Scale,
	Stethoscope,
	Building2,
	FileText,
	Zap,
	Menu,
	X,
	ArrowRight,
	Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { DemoRequestModal } from "./DemoRequestModal";

export function MarketingHeader() {
	const t = useTranslations("Header");
	const locale = useLocale();
	const router = useRouter();
	const pathname = usePathname();
	const [isScrolled, setIsScrolled] = useState(false);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
	const [mobileResourcesOpen, setMobileResourcesOpen] = useState(false);

	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 20);
		};
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	const toggleLanguage = () => {
		const newLocale = locale === "ar" ? "en" : "ar";
		router.replace(pathname, { locale: newLocale });
	};

	const navItems = [
		{
			label: t("products"),
			dropdown: [
				{
					href: "/products/legal-assistant-os",
					label: t("lawFirms"),
					icon: Scale,
					desc: t("legalIntelligence"),
					color: "indigo",
				},
				{
					href: "/products/medical-scribe",
					label: t("healthcare"),
					icon: Stethoscope,
					desc: t("clinicalDocumentation"),
					color: "emerald",
				},
				{
					href: "/products/business",
					label: t("businessesFinance"),
					icon: Building2,
					desc: t("financialAi"),
					color: "slate",
				},
			],
		},
		{
			label: t("resources"),
			dropdown: [
				{
					href: "/blog",
					label: t("blog"),
					icon: FileText,
					desc: t("platformNews"),
					color: "indigo",
				},
				{
					href: "/docs",
					label: t("docs"),
					icon: FileText,
					desc: t("apiUsage"),
					color: "slate",
				},
			],
		},
	];

	const topLevelLinks = [
		{ href: "/solutions", label: t("solutions") },
		{ href: "/about", label: t("about") },
		{ href: "/contact", label: t("contact") },
	];

	return (
		<header
			className={cn(
				"fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b",
				isScrolled
					? "bg-white/80 backdrop-blur-lg border-slate-200 py-3 shadow-sm"
					: "bg-transparent border-transparent py-5",
			)}
		>
			<nav className="container mx-auto px-6 flex items-center justify-between">
				{/* Logo */}
				<Link href="/" className="flex items-center group relative z-10">
					<div className="relative h-12 w-48 transition-all group-hover:scale-105">
						<Image
							src="/logo-horizontal.svg"
							alt="SmarTekAI"
							fill
							priority
							sizes="200px"
							className="object-contain"
						/>
					</div>
				</Link>

				{/* Desktop Nav */}
				<div className="hidden lg:flex items-center gap-1">
					{/* 1. Products Dropdown */}
					<div className="relative group/menu py-2">
						<button className="px-4 py-2 flex items-center gap-1.5 text-sm font-black text-slate-700 hover:text-indigo-600 transition-all rounded-full hover:bg-slate-50 group-hover/menu:bg-slate-50 group-hover/menu:text-indigo-600">
							{navItems[0].label}
							<ChevronDown className="h-3 w-3 opacity-50 group-hover/menu:rotate-180 transition-transform duration-300" />
						</button>

						<div className="absolute top-[calc(100%-4px)] start-0 pt-2 opacity-0 translate-y-2 pointer-events-none group-hover/menu:opacity-100 group-hover/menu:translate-y-0 group-hover/menu:pointer-events-auto transition-all duration-300">
							<div className="bg-white border border-slate-100 shadow-2xl rounded-3xl p-3 w-80 backdrop-blur-xl">
								<div className="grid grid-cols-1 gap-1">
									{navItems[0].dropdown.map((item, iIdx) => (
										<Link
											key={iIdx}
											href={item.href}
											className="flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all group/item"
										>
											<div
												className={cn(
													"h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover/item:scale-110",
													item.color === "indigo"
														? "bg-indigo-50 text-indigo-600"
														: item.color === "emerald"
															? "bg-emerald-50 text-emerald-600"
															: "bg-slate-100 text-slate-600",
												)}
											>
												<item.icon className="h-5 w-5" />
											</div>
											<div className="flex-1 space-y-1">
												<div className="text-sm font-black text-slate-900 flex items-center gap-1">
													{item.label}
													<ArrowRight className="h-3 w-3 opacity-0 -translate-x-2 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all" />
												</div>
												<p className="text-xs text-slate-400 font-bold leading-tight">
													{item.desc}
												</p>
											</div>
										</Link>
									))}
								</div>
							</div>
						</div>
					</div>

					{/* 2. Solutions Link */}
					<Link
						href="/solutions"
						className="px-4 py-2 text-sm font-black text-slate-700 hover:text-indigo-600 transition-all rounded-full hover:bg-slate-50"
					>
						{t("solutions")}
					</Link>

					{/* 3. Resources Dropdown */}
					<div className="relative group/menu py-2">
						<button className="px-4 py-2 flex items-center gap-1.5 text-sm font-black text-slate-700 hover:text-indigo-600 transition-all rounded-full hover:bg-slate-50 group-hover/menu:bg-slate-50 group-hover/menu:text-indigo-600">
							{navItems[1].label}
							<ChevronDown className="h-3 w-3 opacity-50 group-hover/menu:rotate-180 transition-transform duration-300" />
						</button>

						<div className="absolute top-[calc(100%-4px)] start-0 pt-2 opacity-0 translate-y-2 pointer-events-none group-hover/menu:opacity-100 group-hover/menu:translate-y-0 group-hover/menu:pointer-events-auto transition-all duration-300">
							<div className="bg-white border border-slate-100 shadow-2xl rounded-3xl p-3 w-80 backdrop-blur-xl">
								<div className="grid grid-cols-1 gap-1">
									{navItems[1].dropdown.map((item, iIdx) => (
										<Link
											key={iIdx}
											href={item.href}
											className="flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all group/item"
										>
											<div
												className={cn(
													"h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover/item:scale-110",
													item.color === "indigo"
														? "bg-indigo-50 text-indigo-600"
														: item.color === "emerald"
															? "bg-emerald-50 text-emerald-600"
															: "bg-slate-100 text-slate-600",
												)}
											>
												<item.icon className="h-5 w-5" />
											</div>
											<div className="flex-1 space-y-1">
												<div className="text-sm font-black text-slate-900 flex items-center gap-1">
													{item.label}
													<ArrowRight className="h-3 w-3 opacity-0 -translate-x-2 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all" />
												</div>
												<p className="text-xs text-slate-400 font-bold leading-tight">
													{item.desc}
												</p>
											</div>
										</Link>
									))}
								</div>
							</div>
						</div>
					</div>

					{/* 4. Other Top Level Links */}
					{topLevelLinks.slice(1).map((link, idx) => (
						<Link
							key={`tl-${idx}`}
							href={link.href}
							className="px-4 py-2 text-sm font-black text-slate-700 hover:text-indigo-600 transition-all rounded-full hover:bg-slate-50"
						>
							{link.label}
						</Link>
					))}
				</div>

				{/* Right Side Actions */}
				<div className="hidden lg:flex items-center gap-4">
					<button
						onClick={toggleLanguage}
						className="flex items-center gap-2 px-3 py-2 rounded-full border border-slate-200 text-xs font-black text-slate-600 hover:bg-slate-50 transition-all active:scale-95"
					>
						<Globe className="h-3.5 w-3.5" />
						{locale === "ar" ? "EN" : "عربي"}
					</button>

					<Link
						href="/login"
						className="text-sm font-black text-slate-900 hover:text-indigo-600 px-2 transition-colors"
					>
						{t("login")}
					</Link>

					<DemoRequestModal
						trigger={
							<Button className="rounded-full bg-slate-950 hover:bg-indigo-600 text-white px-6 font-black text-sm h-11 shadow-lg shadow-slate-200 hover:shadow-indigo-500/10 transition-all active:scale-95">
								{t("requestDemo")}
							</Button>
						}
					/>
				</div>

				{/* Mobile Toggle */}
				<button
					className="lg:hidden p-2 text-slate-900 relative z-10"
					onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
				>
					{mobileMenuOpen ? (
						<X className="h-6 w-6" />
					) : (
						<Menu className="h-6 w-6" />
					)}
				</button>
			</nav>

			{/* Mobile Menu */}
			{mobileMenuOpen && (
				<div className="lg:hidden fixed top-[72px] inset-x-0 bottom-0 z-40 bg-white border-t border-slate-100 overflow-y-auto animate-in slide-in-from-top-2 duration-300">
					<div className="p-6 space-y-8 pb-32">
						{/* 1. Products */}
						<div className="space-y-2">
							<button 
								onClick={() => setMobileProductsOpen(!mobileProductsOpen)}
								className="w-full flex items-center justify-between px-2 py-3 text-slate-900 font-black text-lg border-b border-slate-50"
							>
								{navItems[0].label}
								<ChevronDown className={cn("h-5 w-5 text-slate-400 transition-transform", mobileProductsOpen && "rotate-180")} />
							</button>
							
							{mobileProductsOpen && (
								<div className="grid grid-cols-1 gap-1 pt-2 animate-in fade-in slide-in-from-top-2">
									{navItems[0].dropdown.map((item, iIdx) => (
										<Link
											key={iIdx}
											href={item.href}
											className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all"
											onClick={() => setMobileMenuOpen(false)}
										>
											<div className={cn(
												"h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
												item.color === "indigo" ? "bg-indigo-50 text-indigo-600" :
												item.color === "emerald" ? "bg-emerald-50 text-emerald-600" :
												"bg-slate-100 text-slate-600"
											)}>
												<item.icon className="h-5 w-5" />
											</div>
											<div>
												<div className="text-sm font-black text-slate-900">{item.label}</div>
												<p className="text-[11px] text-slate-400 font-bold">{item.desc}</p>
											</div>
										</Link>
									))}
								</div>
							)}
						</div>

						{/* 2. Solutions Link */}
						<div>
							<Link
								href="/solutions"
								className="px-2 py-3 font-black text-slate-900 text-lg border-b border-slate-50 flex items-center justify-between group"
								onClick={() => setMobileMenuOpen(false)}
							>
								{t("solutions")}
								<ArrowRight className={cn("h-5 w-5 text-slate-300 group-hover:text-indigo-600 transition-all", locale === "ar" && "rotate-180")} />
							</Link>
						</div>

						{/* 3. Resources */}
						<div className="space-y-2">
							<button 
								onClick={() => setMobileResourcesOpen(!mobileResourcesOpen)}
								className="w-full flex items-center justify-between px-2 py-3 text-slate-900 font-black text-lg border-b border-slate-50"
							>
								{navItems[1].label}
								<ChevronDown className={cn("h-5 w-5 text-slate-400 transition-transform", mobileResourcesOpen && "rotate-180")} />
							</button>
							
							{mobileResourcesOpen && (
								<div className="grid grid-cols-1 gap-1 pt-2 animate-in fade-in slide-in-from-top-2">
									{navItems[1].dropdown.map((item, iIdx) => (
										<Link
											key={iIdx}
											href={item.href}
											className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all"
											onClick={() => setMobileMenuOpen(false)}
										>
											<div className={cn(
												"h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
												item.color === "indigo" ? "bg-indigo-50 text-indigo-600" :
												item.color === "emerald" ? "bg-emerald-50 text-emerald-600" :
												"bg-slate-100 text-slate-600"
											)}>
												<item.icon className="h-5 w-5" />
											</div>
											<div>
												<div className="text-sm font-black text-slate-900">{item.label}</div>
												<p className="text-[11px] text-slate-400 font-bold">{item.desc}</p>
											</div>
										</Link>
									))}
								</div>
							)}
						</div>

						{/* 4. Other Top Level Links */}
						<div className="space-y-1">
							{topLevelLinks.slice(1).map((link, idx) => (
								<Link
									key={`mtl-${idx}`}
									href={link.href}
									className="block px-2 py-3 font-black text-slate-900 text-lg border-b border-slate-50"
									onClick={() => setMobileMenuOpen(false)}
								>
									{link.label}
								</Link>
							))}
						</div>

						{/* Bottom Actions */}
						<div className="pt-4 space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<button
									onClick={toggleLanguage}
									className="flex items-center justify-center gap-2 h-14 rounded-2xl border border-slate-200 text-sm font-black text-slate-600 hover:bg-slate-50 transition-all"
								>
									<Globe className="h-4 w-4" />
									{locale === "ar" ? "EN" : "عربي"}
								</button>

								<Link
									href="/login"
									className="flex items-center justify-center h-14 text-sm font-black text-slate-900 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all"
									onClick={() => setMobileMenuOpen(false)}
								>
									{t("login")}
								</Link>
							</div>

							<DemoRequestModal
								trigger={
									<Button className="w-full h-16 rounded-2xl bg-slate-950 hover:bg-indigo-600 text-white font-black text-lg shadow-xl shadow-slate-200 transition-all">
										{t("requestDemo")}
									</Button>
								}
							/>
						</div>
					</div>
				</div>
			)}
		</header>
	);
}
