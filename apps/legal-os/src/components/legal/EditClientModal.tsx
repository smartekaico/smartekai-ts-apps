"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { User, Phone, IdCard, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface Client {
	id: string;
	fullName: string;
	phone?: string | null;
	civilId?: string | null;
}

export function EditClientModal({
	open,
	onOpenChange,
	client,
	onSuccess,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	client: Client | null;
	onSuccess: () => void;
}) {
	const [loading, setLoading] = useState(false);
	const [fullName, setFullName] = useState("");
	const [phone, setPhone] = useState("");
	const [civilId, setCivilId] = useState("");

	useEffect(() => {
		if (client && open) {
			setFullName(client.fullName || "");
			setPhone(client.phone || "");
			setCivilId(client.civilId || "");
		}
	}, [client, open]);

	const handleSave = async () => {
		if (!client) return;
		if (!fullName.trim()) {
			toast.error("اسم الموكل مطلوب");
			return;
		}

		setLoading(true);
		try {
			const res = await fetch(`/api/legal/clients/${client.id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					fullName: fullName.trim(),
					phone: phone.trim() || null,
					civilId: civilId.trim() || null,
				}),
			});

			if (res.ok) {
				toast.success("تم تحديث بيانات الموكل بنجاح");
				onSuccess();
				onOpenChange(false);
			} else {
				const error = await res.json();
				throw new Error(error.error || "فشل التحديث");
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "An error occurred");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="sm:max-w-[450px] p-0 overflow-hidden border-none shadow-2xl rounded-[32px] bg-white transition-all rtl"
				dir="rtl"
			>
				<div className="h-1.5 w-full bg-emerald-500" />

				<div className="p-8">
					<DialogHeader className="text-right mb-6">
						<DialogTitle className="text-2xl font-black text-slate-800 flex items-center gap-2">
							<User className="h-6 w-6 text-emerald-600" />
							تعديل بيانات الموكل
						</DialogTitle>
						<DialogDescription className="text-slate-500 font-medium">
							تعديل المعلومات الأساسية للموكل المرتبط بهذه الجلسة.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-5">
						<div className="space-y-2">
							<Label className="text-xs font-black text-slate-400 px-1 uppercase tracking-wider">
								الاسم الكامل
							</Label>
							<div className="relative">
								<Input
									value={fullName}
									onChange={(e) => setFullName(e.target.value)}
									className="rounded-xl h-12 bg-slate-50 border-slate-200 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 font-bold px-4"
								/>
							</div>
						</div>

						<div className="grid grid-cols-1 gap-5">
							<div className="space-y-2">
								<Label className="text-xs font-black text-slate-400 px-1 uppercase tracking-wider">
									رقم الهاتف
								</Label>
								<div className="relative">
									<Phone className="absolute start-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
									<Input
										value={phone}
										onChange={(e) => setPhone(e.target.value)}
										className="rounded-xl h-12 bg-slate-50 border-slate-200 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 font-bold ps-11"
										placeholder="أدخل رقم الهاتف..."
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label className="text-xs font-black text-slate-400 px-1 uppercase tracking-wider">
									الرقم المدني
								</Label>
								<div className="relative">
									<IdCard className="absolute start-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
									<Input
										value={civilId}
										onChange={(e) => setCivilId(e.target.value)}
										className="rounded-xl h-12 bg-slate-50 border-slate-200 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 font-bold ps-11"
										placeholder="أدخل الرقم المدني..."
									/>
								</div>
							</div>
						</div>
					</div>

					<DialogFooter className="mt-8 gap-3 flex-row-reverse border-t border-slate-50 pt-6">
						<Button
							onClick={handleSave}
							disabled={loading}
							className="flex-1 rounded-xl h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-lg shadow-emerald-100"
						>
							{loading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Save className="h-4 w-4" />
							)}
							حفظ التعديلات
						</Button>
						<Button
							variant="outline"
							onClick={() => onOpenChange(false)}
							className="flex-1 rounded-xl h-12 border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
						>
							إلغاء
						</Button>
					</DialogFooter>
				</div>
			</DialogContent>
		</Dialog>
	);
}
