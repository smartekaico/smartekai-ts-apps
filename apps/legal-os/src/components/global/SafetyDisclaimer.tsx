"use client";

import { ShieldAlert, X, Info } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SafetyDisclaimerProps {
	className?: string;
	type?: "warning" | "info";
}

export function SafetyDisclaimer({
	className,
	type = "warning",
}: SafetyDisclaimerProps) {
	const [isVisible, setIsVisible] = useState(true);

	if (!isVisible) return null;

	return (
		<div
			className={cn(
				"relative w-full overflow-hidden rounded-xl border p-2 px-4 transition-all animate-in fade-in slide-in-from-top-2 duration-500",
				type === "warning"
					? "bg-amber-50/50 border-amber-100 text-amber-900"
					: "bg-indigo-50/50 border-indigo-100 text-indigo-900",
				className,
			)}
		>
			<div className="flex items-start gap-3">
				<div
					className={cn(
						"p-1.5 rounded-lg shrink-0 mt-0.5",
						type === "warning"
							? "bg-amber-100 text-amber-600"
							: "bg-indigo-100 text-indigo-600",
					)}
				>
					{type === "warning" ? (
						<ShieldAlert className="h-4 w-4" />
					) : (
						<Info className="h-4 w-4" />
					)}
				</div>

				<div className="flex-1 space-y-0.5 text-right" dir="rtl">
					<h4 className="font-black text-xs uppercase tracking-tight">
						{type === "warning"
							? "تنبيه المسؤولية والخصوصية"
							: "إرشادات الاستخدام الذكي"}
					</h4>
					<p className="text-[10px] font-bold leading-tight opacity-80 flex flex-col md:flex-row gap-1">
						<span>
							هذا النظام ذكاء اصطناعي مساعد وليس بديلاً عن المشورة القانونية
							النهائية.
						</span>
						<span className="text-rose-600">
							يرجى تجنب رفع بيانات شديدة الخصوصية في المحادثات العامة.
						</span>
					</p>
				</div>

				<Button
					variant="ghost"
					size="icon"
					onClick={() => setIsVisible(false)}
					className="h-8 w-8 rounded-lg hover:bg-white/50 -mt-1 -mr-1"
				>
					<X className="h-4 w-4 opacity-50" />
				</Button>
			</div>
		</div>
	);
}
