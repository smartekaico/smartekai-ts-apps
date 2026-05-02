"use client";

import React, { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TourStep {
	target: string;
	title: { en: string; ar: string };
	content: { en: string; ar: string };
}

interface OnboardingTourProps {
	role: string;
	type?: "DASHBOARD" | "SESSION";
	onClose: () => void;
}

export function OnboardingTour({ role, type = "DASHBOARD", onClose }: OnboardingTourProps) {
	const locale = useLocale() as "en" | "ar";
	const [currentStep, setCurrentStep] = useState(0);
	const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

	const dashboardSteps: TourStep[] = [
		{
			target: "#sidebar-instant-session",
			title: { en: "Quick Start", ar: "بدء سريع" },
			content: {
				en: role === "LEGAL" 
					? "Start a new legal session instantly to upload documents and begin research."
					: "Start a new medical session to begin patient analysis.",
				ar: role === "LEGAL"
					? "ابدأ جلسة قانونية جديدة فوراً لرفع المستندات والبدء في البحث."
					: "ابدأ جلسة طبية جديدة للبدء في تحليل بيانات المريض."
			}
		},
		{
			target: "#sidebar-search",
			title: { en: "Global Search", ar: "البحث الشامل" },
			content: {
				en: "Search through all your previous cases, documents, and firm knowledge base.",
				ar: "ابحث في كافة قضاياك السابقة، المستندات، وقاعدة معرفة المكتب."
			}
		},
		{
			target: "#sidebar-nav-knowledge-base",
			title: { en: "Knowledge Base", ar: "قاعدة المعرفة" },
			content: {
				en: role === "LEGAL"
					? "Access our massive database of Kuwaiti laws and judicial precedents."
					: "Access specialized medical guidelines and research papers.",
				ar: role === "LEGAL"
					? "الوصول إلى قاعدة بيانات ضخمة من القوانين الكويتية والمبادئ القضائية."
					: "الوصول إلى الأدلة الطبية المتخصصة والأوراق البحثية."
			}
		},
		{
			target: "#sidebar-user-nav",
			title: { en: "Settings & Billing", ar: "الإعدادات والفوترة" },
			content: {
				en: "Manage your profile, team members, and check your credit balance.",
				ar: "إدارة ملفك الشخصي، أعضاء الفريق، والتحقق من رصيد النقاط."
			}
		}
	];

	const sessionSteps: TourStep[] = [
		{
			target: "#session-header",
			title: { en: "Workspace Info", ar: "معلومات الجلسة" },
			content: {
				en: "Assign a client, case title, or category to this session for better organization.",
				ar: "قم بتعيين موكل، عنوان قضية، أو تصنيف لهذه الجلسة لتنظيم عملك بشكل أفضل."
			}
		},
		{
			target: "#chat-textarea",
			title: { en: "Ask AI", ar: "اسأل الذكاء الاصطناعي" },
			content: {
				en: "Upload your case files and ask Lex to summarize, find loopholes, or draft arguments.",
				ar: "ارفع ملفات القضية واطلب من Lex تلخيصها، البحث عن ثغرات، أو صياغة دفوع قانونية."
			}
		},
		{
			target: "#sidebar-nav-sessions",
			title: { en: "Session Assets", ar: "ملفات الجلسة" },
			content: {
				en: "All chats you save and documents you draft will appear here in the sidebar.",
				ar: "كافة المحادثات والمستندات التي تقوم بحفظها ستظهر هنا في القائمة الجانبية."
			}
		}
	];

	const steps = type === "DASHBOARD" ? dashboardSteps : sessionSteps;

	useEffect(() => {
		const updateRect = () => {
			const target = document.querySelector(steps[currentStep].target);
			if (target) {
				setTargetRect(target.getBoundingClientRect());
				target.scrollIntoView({ behavior: "smooth", block: "center" });
			}
		};
		
		updateRect();
		window.addEventListener("resize", updateRect);
		return () => window.removeEventListener("resize", updateRect);
	}, [currentStep]);

	const handleNext = () => {
		if (currentStep < steps.length - 1) {
			setCurrentStep(currentStep + 1);
		} else {
			onClose();
		}
	};

	const handlePrev = () => {
		if (currentStep > 0) {
			setCurrentStep(currentStep - 1);
		}
	};

	if (!targetRect) return null;

	const isRtl = locale === "ar";

	return (
		<div className="fixed inset-0 z-[100] pointer-events-none">
			{/* Overlay with Cutout */}
			<div 
				className="absolute inset-0 bg-slate-900/60 transition-all duration-300 pointer-events-auto"
				style={{
					clipPath: `polygon(
						0% 0%, 0% 100%, 
						${targetRect.left - 8}px 100%, 
						${targetRect.left - 8}px ${targetRect.top - 8}px, 
						${targetRect.right + 8}px ${targetRect.top - 8}px, 
						${targetRect.right + 8}px ${targetRect.bottom + 8}px, 
						${targetRect.left - 8}px ${targetRect.bottom + 8}px, 
						${targetRect.left - 8}px 100%, 
						100% 100%, 100% 0%
					)`
				}}
				onClick={onClose}
			/>

			{/* Card */}
			<div 
				className="absolute bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 w-[320px] pointer-events-auto transition-all duration-300 animate-in fade-in zoom-in-95"
				style={{
					top: targetRect.bottom + 20 > window.innerHeight - 250 ? targetRect.top - 250 : targetRect.bottom + 20,
					left: isRtl ? targetRect.right - 320 : targetRect.left,
				}}
				dir={isRtl ? "rtl" : "ltr"}
			>
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-2">
						<div className="p-1.5 bg-indigo-50 rounded-lg">
							<Sparkles className="h-4 w-4 text-indigo-600" />
						</div>
						<h3 className="font-black text-slate-900">
							{steps[currentStep].title[locale]}
						</h3>
					</div>
					<button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
						<X className="h-4 w-4" />
					</button>
				</div>

				<p className="text-slate-600 text-sm font-medium leading-relaxed mb-6">
					{steps[currentStep].content[locale]}
				</p>

				<div className="flex items-center justify-between">
					<div className="flex gap-1">
						{steps.map((_, i) => (
							<div 
								key={i} 
								className={cn(
									"h-1.5 rounded-full transition-all duration-300",
									i === currentStep ? "w-4 bg-indigo-600" : "w-1.5 bg-slate-200"
								)}
							/>
						))}
					</div>
					<div className="flex gap-2">
						{currentStep > 0 && (
							<Button 
								variant="ghost" 
								size="sm" 
								onClick={handlePrev}
								className="h-9 px-3 rounded-xl font-bold"
							>
								{isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
							</Button>
						)}
						<Button 
							size="sm" 
							onClick={handleNext}
							className="h-9 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black"
						>
							{currentStep === steps.length - 1 ? (isRtl ? "إنهاء" : "Finish") : (isRtl ? "التالي" : "Next")}
						</Button>
					</div>
				</div>

				{/* Triangle Pointer */}
				<div 
					className="absolute w-4 h-4 bg-white border-t border-s border-slate-200 rotate-45"
					style={{
						top: targetRect.bottom + 20 > window.innerHeight - 250 ? 'calc(100% - 8px)' : '-8px',
						right: isRtl ? '24px' : 'auto',
						left: isRtl ? 'auto' : '24px',
						transform: targetRect.bottom + 20 > window.innerHeight - 250 ? 'rotate(225deg)' : 'rotate(45deg)'
					}}
				/>
			</div>
		</div>
	);
}
