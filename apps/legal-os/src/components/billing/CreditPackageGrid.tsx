"use client";

import {
	CreditCard,
	Check,
	ArrowUpRight,
	Zap,
	Sparkles,
	Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";

const PACKAGES = [
	{
		name: "الباقة الأساسية (Lite)",
		credits: 50,
		price: "30",
		description: "مثالية للمحامين المبتدئين لتجربة الأدوات الذكية.",
		features: ["50 نقطة صياغة وتحليل", "صلاحية دائمة", "دعم فني أساسي"],
		icon: Zap,
		color: "indigo",
	},
	{
		name: "الباقة الاحترافية (Pro)",
		credits: 150,
		price: "50",
		description: "الأكثر طلباً للمحامين النشطين والمكاتب المتوسطة.",
		features: [
			"150 نقطة صياغة وتحليل",
			"صلاحية دائمة",
			"أولوية في البحث القانوني",
			"دعم فني مخصص",
		],
		isPopular: true,
		icon: Sparkles,
		color: "purple",
	},
	{
		name: "الباقة المتكاملة (Scale)",
		credits: 300,
		price: "90",
		description: "للمكاتب الكبيرة التي تتطلب إنتاجية عالية وكثيفة.",
		features: [
			"300 نقطة صياغة وتحليل",
			"صلاحية دائمة",
			"أولوية قصوى",
			"مدير حساب مخصص",
		],
		icon: Crown,
		color: "emerald",
	},
];

export function CreditPackageGrid() {
	const handlePurchase = (pkgName: string) => {
		toast.info(`باقة ${pkgName}`, {
			description:
				"بوابات الدفع المباشر قيد التفعيل حالياً. يرجى استخدام الشحن اليدوي لمتابعة العملية.",
			duration: 5000,
		});
	};

	return (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
			{PACKAGES.map((pkg) => (
				<Card
					key={pkg.name}
					className={cn(
						"relative rounded-[2.5rem] border-2 transition-all duration-500 group overflow-hidden bg-white/60 backdrop-blur-md",
						pkg.isPopular
							? "border-indigo-600 shadow-2xl shadow-indigo-100 -translate-y-2 translate-x-1"
							: "border-slate-100 hover:border-indigo-200 shadow-sm",
					)}
				>
					{pkg.isPopular && (
						<div className="absolute top-5 left-[-40px] -rotate-45 bg-indigo-600 text-white text-[10px] font-black px-12 py-1 shadow-lg z-10">
							الأكثر مبيعاً
						</div>
					)}

					<CardContent className="p-10 space-y-8">
						<div className="flex items-center justify-between">
							<div
								className={cn(
									"h-16 w-16 rounded-[1.5rem] flex items-center justify-center transition-transform group-hover:rotate-6 shadow-lg",
									pkg.color === "indigo"
										? "bg-indigo-600 text-white"
										: pkg.color === "purple"
											? "bg-purple-600 text-white"
											: "bg-emerald-600 text-white",
								)}
							>
								<pkg.icon className="h-8 w-8" />
							</div>
							<div className="text-left">
								<span className="text-4xl font-black text-slate-900 tracking-tighter">
									${pkg.price}
								</span>
								<span className="text-xs font-bold text-slate-400 mr-1 italic">
									/ لمرة واحدة
								</span>
							</div>
						</div>

						<div className="space-y-2">
							<h3 className="text-xl font-black text-slate-900">{pkg.name}</h3>
							<p className="text-slate-500 text-sm font-medium leading-relaxed">
								{pkg.description}
							</p>
						</div>

						<div className="bg-slate-50/70 p-6 rounded-2xl space-y-4">
							<div className="flex items-baseline gap-2">
								<span className="text-3xl font-black text-indigo-600 tracking-tight">
									{pkg.credits}
								</span>
								<span className="text-xs font-bold text-slate-500">
									نقطة رصيد
								</span>
							</div>
							<ul className="space-y-3">
								{pkg.features.map((feature, i) => (
									<li
										key={i}
										className="flex items-center gap-3 text-xs font-bold text-slate-600"
									>
										<div className="h-5 w-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
											<Check className="h-3 w-3" />
										</div>
										{feature}
									</li>
								))}
							</ul>
						</div>

						<Button
							onClick={() => handlePurchase(pkg.name)}
							className={cn(
								"w-full py-8 rounded-2xl font-black text-lg shadow-xl transition-all active:scale-95 group/btn",
								pkg.isPopular
									? "bg-indigo-600 hover:bg-slate-900 text-white shadow-indigo-200"
									: "bg-slate-100 hover:bg-slate-900 text-slate-700 hover:text-white",
							)}
						>
							شراء الآن
							<ArrowUpRight
								className={cn(
									"mr-2 h-5 w-5 transition-transform group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1",
								)}
							/>
						</Button>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
