"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Briefcase, Hash, Loader2, Save, Zap } from "lucide-react";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface Case {
	id: number;
	title: string;
	caseNumber?: string | null;
	plaintiff?: string | null;
	defendant?: string | null;
	status: string;
}

export function EditCaseModal({
	open,
	onOpenChange,
	caseData,
	onSuccess,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	caseData: Case | null;
	onSuccess: () => void;
}) {
	const [loading, setLoading] = useState(false);
	const [title, setTitle] = useState("");
	const [caseNumber, setCaseNumber] = useState("");
	const [plaintiff, setPlaintiff] = useState("");
	const [defendant, setDefendant] = useState("");
	const [status, setStatus] = useState("Active");

	useEffect(() => {
		if (caseData && open) {
			setTitle(caseData.title || "");
			setCaseNumber(caseData.caseNumber || "");
			setPlaintiff(caseData.plaintiff || "");
			setDefendant(caseData.defendant || "");
			setStatus(caseData.status || "Active");
		}
	}, [caseData, open]);

	const handleSave = async () => {
		if (!caseData) return;
		if (!title.trim()) {
			toast.error("عنوان القضية مطلوب");
			return;
		}

		setLoading(true);
		try {
			const res = await fetch(`/api/legal/cases/${caseData.id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: title.trim(),
					caseNumber: caseNumber.trim() || null,
					plaintiff: plaintiff.trim() || null,
					defendant: defendant.trim() || null,
					status: status,
				}),
			});

			if (res.ok) {
				toast.success("تم تحديث بيانات القضية بنجاح");
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
				className="sm:max-w-[480px] p-0 overflow-hidden border-none shadow-2xl rounded-[32px] bg-white transition-all rtl"
				dir="rtl"
			>
				<div className="h-1.5 w-full bg-indigo-500" />

				<div className="p-8">
					<DialogHeader className="text-right mb-6">
						<DialogTitle className="text-2xl font-black text-slate-800 flex items-center gap-2">
							<Briefcase className="h-6 w-6 text-indigo-600" />
							تعديل بيانات القضية
						</DialogTitle>
						<DialogDescription className="text-slate-500 font-medium">
							تعديل العنوان ورقم الملف وبيانات أطراف النزاع.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-6">
						<div className="space-y-2">
							<Label className="text-xs font-black text-slate-400 px-1 uppercase tracking-wider">
								عنوان القضية / الملف
							</Label>
							<Input
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								className="rounded-xl h-12 bg-slate-50 border-slate-200 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 font-bold px-4 shadow-sm"
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label className="text-xs font-black text-slate-400 px-1 uppercase tracking-wider">
									رقم القضية
								</Label>
								<div className="relative">
									<Hash className="absolute start-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
									<Input
										value={caseNumber}
										onChange={(e) => setCaseNumber(e.target.value)}
										className="rounded-xl h-12 bg-slate-50 border-slate-200 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 font-bold ps-10 text-sm shadow-sm"
										placeholder="رقم الملف..."
									/>
								</div>
							</div>

							<div className="flex flex-col justify-end space-y-2">
								<Label className="text-xs font-black text-slate-400 px-1 uppercase tracking-wider">
									حالة القضية
								</Label>
								<Select
									value={status}
									onValueChange={(val: string | null) =>
										setStatus(val ?? "Active")
									}
								>
									<SelectTrigger className="rounded-xl h-12 bg-slate-50 border-slate-200 font-bold px-4 shadow-sm">
										<SelectValue />
									</SelectTrigger>
									<SelectContent dir="rtl">
										<SelectItem value="Active" className="font-bold">
											نشطة (Active)
										</SelectItem>
										<SelectItem
											value="Archived"
											className="font-bold text-slate-400"
										>
											مؤرشفة (Archived)
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="space-y-4 pt-2 border-t border-slate-50">
							<div className="grid grid-cols-1 gap-4">
								<div className="space-y-2">
									<Label className="text-xs font-black text-slate-400 px-1 uppercase tracking-wider">
										المدعي (Plaintiff)
									</Label>
									<Input
										value={plaintiff}
										onChange={(e) => setPlaintiff(e.target.value)}
										className="rounded-xl h-12 bg-white border-slate-200 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 font-bold px-4 shadow-sm"
										placeholder="اسم المدعي..."
									/>
								</div>
								<div className="space-y-2">
									<Label className="text-xs font-black text-slate-400 px-1 uppercase tracking-wider">
										المدعى عليه (Defendant)
									</Label>
									<Input
										value={defendant}
										onChange={(e) => setDefendant(e.target.value)}
										className="rounded-xl h-12 bg-white border-slate-200 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 font-bold px-4 shadow-sm"
										placeholder="اسم المدعى عليه..."
									/>
								</div>
							</div>
						</div>
					</div>

					<DialogFooter className="mt-10 gap-3 flex-row-reverse">
						<Button
							onClick={handleSave}
							disabled={loading}
							className="flex-1 rounded-xl h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95"
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
							className="flex-1 rounded-xl h-12 border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all"
						>
							إلغاء
						</Button>
					</DialogFooter>
				</div>
			</DialogContent>
		</Dialog>
	);
}
