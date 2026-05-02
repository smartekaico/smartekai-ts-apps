"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FaqItem {
	question: string;
	answer: string;
}

export function FaqClient({
	faqs,
	locale,
}: {
	faqs: FaqItem[];
	locale: string;
}) {
	const [openFaq, setOpenFaq] = useState<number | null>(0);

	return (
		<div className="space-y-4">
			{faqs.map((faq, index) => (
				<div
					key={index}
					className={cn(
						"rounded-[2rem] border border-slate-200 overflow-hidden transition-all duration-500 group",
						openFaq === index
							? "bg-white shadow-xl ring-2 ring-indigo-50"
							: "bg-white/70 hover:bg-white hover:shadow-lg",
					)}
				>
					<button
						onClick={() => setOpenFaq(openFaq === index ? null : index)}
						className="w-full p-8 flex items-center justify-between text-right gap-6"
						dir={locale === "ar" ? "rtl" : "ltr"}
					>
						<span
							className={cn(
								"text-lg md:text-xl font-black text-slate-800 lg:group-hover:text-indigo-600 transition-colors",
								locale === "ar" ? "text-right" : "text-left",
							)}
						>
							{faq.question}
						</span>
						<ChevronDown
							className={cn(
								"h-5 w-5 text-slate-400 transition-transform duration-500 shrink-0",
								openFaq === index && "rotate-180 text-indigo-500",
							)}
						/>
					</button>
					<div
						className={cn(
							"transition-all duration-500 ease-in-out",
							openFaq === index
								? "max-h-[500px] opacity-100"
								: "max-h-0 opacity-0",
						)}
					>
						<div
							className={cn(
								"p-8 pt-0 text-slate-600 font-bold leading-relaxed text-base lg:text-lg border-t border-slate-50",
								locale === "ar" ? "text-right" : "text-left",
							)}
						>
							{faq.answer}
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
