"use client";

import { useState } from "react";
import {
	Zap,
	Sparkles,
	Crown,
	ArrowUpRight,
	Loader2,
	Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { requestManualTopup } from "@/app/[locale]/actions/billing";

const MANUAL_PACKAGES = [
	{
		id: "lite",
		name: "الباقة الأساسية (Lite)",
		credits: 50,
		price: "30",
		description: "طلب يدوي للباقة الأساسية مع رابط دفع مخصص.",
		features: ["50 نقطة صياغة", "رابط دفع مخصص", "تفعيل خلال 15 دقيقة"],
		isPopular: false,
		icon: Zap,
		color: "slate",
	},
	{
		id: "pro",
		name: "الباقة الاحترافية (Pro)",
		credits: 150,
		price: "50",
		description: "طلب يدوي للباقة الاحترافية الأكثر طلباً للمكاتب.",
		features: ["150 نقطة صياغة", "رابط دفع مخصص", "تفعيل فوري بعد الدفع"],
		isPopular: true,
		icon: Sparkles,
		color: "amber",
	},
	{
		id: "scale",
		name: "الباقة المتكاملة (Scale)",
		credits: 300,
		price: "90",
		description: "طلب يدوي للباقة المتكاملة للمكاتب الكبرى.",
		features: ["300 نقطة صياغة", "رابط دفع مخصص", "دعم فني لتفعيل الرصيد"],
		isPopular: false,
		icon: Crown,
		color: "indigo",
	},
] as const;

export function ManualPackageGrid() {
	const [loadingId, setLoadingId] = useState<string | null>(null);

	const handleManualRequest = async (
		packageId: "lite" | "pro" | "scale",
		packageName: string,
	) => {
		setLoadingId(packageId);
		try {
			const res = await requestManualTopup(packageId);
			if (res.success) {
				toast.success(`تم إرسال طلب ${packageName}`, {
					description:
						"يرجى مراجعة بريدك الإلكتروني للحصول على رابط الدفع المخصص لهذه الباقة.",
					duration: 8000,
				});
			} else {
				toast.error(res.error || "فشل إرسال الطلب");
			}
		} catch (error) {
			toast.error("حدث خطأ غير متوقع");
		} finally {
			setLoadingId(null);
		}
	};

	return (
		<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
			{MANUAL_PACKAGES.map((pkg) => (
				<Card
					key={pkg.id}
					className={cn(
						"relative rounded-3xl border transition-all duration-300 group overflow-hidden bg-white/60 backdrop-blur-sm",
						pkg.isPopular
							? "border-amber-500 bg-amber-50/10 shadow-md"
							: "border-slate-100 hover:border-amber-200",
					)}
				>
					<CardContent className="p-5 flex flex-col items-center text-center space-y-3">
						<div
							className={cn(
								"h-10 w-10 rounded-xl flex items-center justify-center shadow-sm",
								pkg.color === "slate"
									? "bg-slate-900 text-white"
									: pkg.color === "amber"
										? "bg-amber-500 text-white"
										: "bg-indigo-600 text-white",
							)}
						>
							<pkg.icon className="h-5 w-5" />
						</div>

						<div className="space-y-0.5">
							<h3 className="text-xs font-black text-slate-900 line-clamp-1">
								{pkg.name}
							</h3>
							<div className="flex items-baseline justify-center gap-1">
								<span className="text-lg font-black text-indigo-600 tabular-nums">
									{pkg.credits}
								</span>
								<span className="text-[9px] font-bold text-slate-400 uppercase">
									نقطة
								</span>
							</div>
						</div>

						<div className="text-xl font-black text-slate-900 tracking-tight">
							${pkg.price}
						</div>

						<Button
							onClick={() => handleManualRequest(pkg.id, pkg.name)}
							disabled={loadingId !== null}
							size="sm"
							className={cn(
								"w-full h-8 rounded-lg font-black text-[10px] shadow-sm transition-all active:scale-95",
								pkg.isPopular
									? "bg-amber-500 hover:bg-slate-900 text-white"
									: "bg-slate-900 hover:bg-indigo-600 text-white",
							)}
						>
							{loadingId === pkg.id ? (
								<Loader2 className="h-3 w-3 animate-spin" />
							) : (
								"طلب شحن"
							)}
						</Button>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
