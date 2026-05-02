"use client";

import type React from "react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/app/[locale]/actions/settings";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Key, Lock, Eye, EyeOff, UserIcon, Mail, Building2, Loader2, Save, ShieldCheck } from "lucide-react";

interface ProfileFormProps {
	user: {
		id: string;
		name: string;
		email: string;
		firmName?: string | null;
	};
}

export function ProfileForm({ user }: ProfileFormProps) {
	const t = useTranslations("Settings");
	const [isSaving, setIsSaving] = useState(false);
	const [isChangingPassword, setIsChangingPassword] = useState(false);
	const [showPasswords, setShowPasswords] = useState(false);
	const [passwords, setPasswords] = useState({
		current: "",
		new: "",
		confirm: "",
	});

	const handlePasswordChange = async (e: React.FormEvent) => {
		e.preventDefault();
		if (passwords.new !== passwords.confirm) {
			toast.error("كلمات المرور الجديدة غير متطابقة");
			return;
		}

		setIsChangingPassword(true);
		try {
			const { error } = await authClient.changePassword({
				newPassword: passwords.new,
				currentPassword: passwords.current,
				revokeOtherSessions: true,
			});

			if (error) {
				toast.error(error.message || "فشل تحديث كلمة المرور");
			} else {
				toast.success("تم تحديث كلمة المرور بنجاح");
				setPasswords({ current: "", new: "", confirm: "" });
			}
		} catch (err) {
			toast.error("حدث خطأ غير متوقع");
		} finally {
			setIsChangingPassword(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setIsSaving(true);

		const formData = new FormData(e.currentTarget);
		const name = formData.get("name") as string;
		const firmName = formData.get("firmName") as string;

		try {
			const result = await updateProfile({
				name,
				firmName,
			});

			if (result.success) {
				toast.success("تم تحديث الملف الشخصي بنجاح");
			} else {
				toast.error(result.error || "حدث خطأ أثناء الحفظ");
			}
		} catch (error) {
			toast.error("خطأ في الاتصال بالخادم");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<>
			<Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-white">
				<CardHeader className="p-8 border-b border-slate-50 bg-slate-50/30">
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 border border-slate-100 shadow-sm">
							<UserIcon className="h-5 w-5" />
						</div>
						<CardTitle className="text-lg font-black text-slate-900">
							تعديل البيانات الأساسية
						</CardTitle>
					</div>
				</CardHeader>
				<CardContent className="p-8">
					<form key={user.id} onSubmit={handleSubmit} className="space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div className="space-y-2">
								<Label
									htmlFor="name"
									className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1"
								>
									الاسم الكامل
								</Label>
								<Input
									id="name"
									name="name"
									defaultValue={user.name}
									className="rounded-2xl border-slate-100 h-12 font-bold focus-visible:ring-indigo-600 transition-all bg-slate-50 px-4"
									required
								/>
							</div>
							<div className="space-y-2">
								<Label
									htmlFor="email"
									className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1"
								>
									البريد الإلكتروني (للعرض فقط)
								</Label>
								<div className="relative">
									<Input
										id="email"
										value={user.email}
										disabled
										className="rounded-2xl border-slate-100 h-12 font-bold bg-slate-100/50 text-slate-400 px-4 cursor-not-allowed"
									/>
									<Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
								</div>
							</div>
						</div>

						<div className="space-y-2">
							<Label
								htmlFor="firmName"
								className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1"
							>
								المسمى الوظيفي / جهة العمل
							</Label>
							<div className="relative">
								<Input
									id="firmName"
									name="firmName"
									defaultValue={user.firmName || ""}
									placeholder="مثال: محامي أول - مكتب العدل"
									className="rounded-2xl border-slate-100 h-12 font-bold focus-visible:ring-indigo-600 transition-all bg-slate-50 px-4"
								/>
								<Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
							</div>
						</div>

						<div className="flex justify-end pt-4">
							<Button
								type="submit"
								disabled={isSaving}
								className="rounded-2xl px-10 h-12 font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 transition-all gap-3"
							>
								{isSaving ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<Save className="h-4 w-4" />
								)}
								{isSaving ? "جاري الحفظ..." : "حفظ التغييرات"}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>

			{/* Password & Security Card */}
			<Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-white mt-10">
				<CardHeader className="p-8 border-b border-slate-50 bg-slate-50/30">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-amber-600 border border-slate-100 shadow-sm">
								<Key className="h-5 w-5" />
							</div>
							<CardTitle className="text-lg font-black text-slate-900">
								الأمان وكلمة المرور
							</CardTitle>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setShowPasswords(!showPasswords)}
							className="text-slate-400 hover:text-slate-600"
						>
							{showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
						</Button>
					</div>
				</CardHeader>
				<CardContent className="p-8">
					<form onSubmit={handlePasswordChange} className="space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div className="space-y-2">
								<Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
									كلمة المرور الحالية
								</Label>
								<div className="relative">
									<Input
										type={showPasswords ? "text" : "password"}
										value={passwords.current}
										onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
										className="rounded-2xl border-slate-100 h-12 font-bold focus-visible:ring-indigo-600 bg-slate-50 px-4"
										required
									/>
									<Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
								</div>
							</div>
							<div className="space-y-2">
								<Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
									كلمة المرور الجديدة
								</Label>
								<div className="relative">
									<Input
										type={showPasswords ? "text" : "password"}
										value={passwords.new}
										onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
										className="rounded-2xl border-slate-100 h-12 font-bold focus-visible:ring-indigo-600 bg-slate-50 px-4"
										required
									/>
									<Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
								</div>
							</div>
							<div className="space-y-2">
								<Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
									تأكيد كلمة المرور
								</Label>
								<div className="relative">
									<Input
										type={showPasswords ? "text" : "password"}
										value={passwords.confirm}
										onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
										className="rounded-2xl border-slate-100 h-12 font-bold focus-visible:ring-indigo-600 bg-slate-50 px-4"
										required
									/>
									<Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
								</div>
							</div>
						</div>

						<div className="flex justify-end pt-4">
							<Button
								type="submit"
								disabled={isChangingPassword}
								className="rounded-2xl px-10 h-12 font-black bg-slate-900 hover:bg-slate-800 text-white shadow-lg transition-all gap-3"
							>
								{isChangingPassword ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<ShieldCheck className="h-4 w-4" />
								)}
								{isChangingPassword ? "جاري التحديث..." : "تحديث كلمة المرور"}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</>
	);
}
