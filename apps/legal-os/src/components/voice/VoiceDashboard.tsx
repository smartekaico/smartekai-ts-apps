"use client";

import { Mic, PhoneCall, BarChart } from "lucide-react";

export function VoiceDashboard() {
	return (
		<div className="flex flex-col items-center justify-center py-24 text-center space-y-6 animate-in fade-in zoom-in duration-500">
			<div className="h-24 w-24 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center">
				<Mic className="h-12 w-12" />
			</div>
			<div>
				<h2 className="text-3xl font-black text-slate-900 mb-2">
					منصة الأنظمة الصوتية
				</h2>
				<p className="text-slate-500 max-w-md mx-auto font-medium mb-8">
					أهلاً بك في منصة إدارة الرد الآلي والموظفين الافتراضيين. جاري العمل على
					إطلاق الأدوات قريباً..
				</p>
			</div>
			<div className="flex gap-4 opacity-50 grayscale transition-all duration-300 hover:grayscale-0 hover:opacity-100">
				<div className="bg-white border rounded-2xl p-6 text-center shadow-sm w-48">
					<PhoneCall className="h-8 w-8 text-indigo-500 mx-auto mb-3" />
					<p className="font-bold text-sm">إدارة الأرقام وتوجيه المكالمات</p>
				</div>
				<div className="bg-white border rounded-2xl p-6 text-center shadow-sm w-48">
					<BarChart className="h-8 w-8 text-amber-500 mx-auto mb-3" />
					<p className="font-bold text-sm">تقارير الذكاء الاصطناعي</p>
				</div>
			</div>
		</div>
	);
}
