"use client";

import { Stethoscope, ShieldCheck, Cpu } from "lucide-react";

export function MedicalDashboard() {
	return (
		<div className="flex flex-col items-center justify-center py-24 text-center space-y-6 animate-in fade-in zoom-in duration-500">
			<div className="h-24 w-24 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center">
				<Stethoscope className="h-12 w-12" />
			</div>
			<div>
				<h2 className="text-3xl font-black text-slate-900 mb-2">
					عيادة الطبيب الذكية
				</h2>
				<p className="text-slate-500 max-w-md mx-auto font-medium mb-8">
					أهلاً بك في نظام السكرتير الطبي الذكي. جاري العمل على إطلاق الأدوات
					قريباً..
				</p>
			</div>
			<div className="flex gap-4 opacity-50 grayscale transition-all duration-300 hover:grayscale-0 hover:opacity-100">
				<div className="bg-white border rounded-2xl p-6 text-center shadow-sm w-48">
					<Cpu className="h-8 w-8 text-indigo-500 mx-auto mb-3" />
					<p className="font-bold text-sm">توليد نصوص SOAP</p>
				</div>
				<div className="bg-white border rounded-2xl p-6 text-center shadow-sm w-48">
					<ShieldCheck className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
					<p className="font-bold text-sm">تحليل الأشعة والتقارير</p>
				</div>
			</div>
		</div>
	);
}
