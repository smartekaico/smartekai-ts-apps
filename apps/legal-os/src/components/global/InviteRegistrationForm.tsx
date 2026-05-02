"use client";

import type * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerWithInviteAction } from "@/app/[locale]/invite/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ShieldCheck, User, Mail, Lock, ArrowLeft } from "lucide-react";

export function InviteRegistrationForm({
	token,
	role,
	credits,
}: {
	token: string;
	role: string;
	credits: number;
}) {
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLoading(true);

		const formData = new FormData(e.currentTarget);
		formData.append("token", token);

		const result = await registerWithInviteAction(formData);

		if (result.success) {
			toast.success("تم إنشاء حسابك بنجاح! جاري التوجيه لتسجيل الدخول...");
			setTimeout(() => {
				router.push("/login?message=registration_successful");
			}, 2000);
		} else {
			toast.error(result.error || "حدث خطأ ما");
		}
		setLoading(false);
	};

	return (
		<form onSubmit={handleRegister} className="space-y-6">
			<div className="space-y-2">
				<Label htmlFor="name" className="text-slate-700 font-bold pr-1">
					الاسم الكامل
				</Label>
				<div className="relative">
					<User className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
					<Input
						id="name"
						name="name"
						type="text"
						placeholder="مثال: خالد محمد"
						className="rounded-2xl border-slate-200 h-14 pr-11 pl-4 focus-visible:ring-indigo-600 transition-all font-medium"
						required
					/>
				</div>
			</div>

			<div className="space-y-2">
				<Label htmlFor="email" className="text-slate-700 font-bold pr-1">
					البريد الإلكتروني
				</Label>
				<div className="relative">
					<Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
					<Input
						id="email"
						name="email"
						type="email"
						placeholder="m@example.com"
						className="rounded-2xl border-slate-200 h-14 pr-11 pl-4 focus-visible:ring-indigo-600 transition-all font-medium"
						required
						dir="ltr"
					/>
				</div>
			</div>

			<div className="space-y-2">
				<Label htmlFor="password" className="text-slate-700 font-bold pr-1">
					كلمة المرور
				</Label>
				<div className="relative">
					<Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
					<Input
						id="password"
						name="password"
						type="password"
						className="rounded-2xl border-slate-200 h-14 pr-11 pl-4 focus-visible:ring-indigo-600 transition-all font-medium"
						required
						dir="ltr"
					/>
				</div>
			</div>

			<div className="pt-4">
				<Button
					type="submit"
					disabled={loading}
					className="w-full bg-slate-900 border-none hover:bg-slate-800 text-white rounded-2xl h-14 text-lg font-black gap-3 shadow-xl shadow-slate-200 transition-all active:scale-[0.98]"
				>
					{loading ? "جاري إنشاء الحساب..." : "تفعيل الحساب (Join Hub)"}
					{!loading && <ArrowLeft className="h-5 w-5" />}
				</Button>
			</div>

			<p className="text-center text-xs text-slate-400 font-medium px-4 leading-relaxed">
				بالنقر على تفعيل الحساب، أنت توافق على شروط الخدمة وسياسة الخصوصية
				الخاصة بالمنصة.
			</p>
		</form>
	);
}
