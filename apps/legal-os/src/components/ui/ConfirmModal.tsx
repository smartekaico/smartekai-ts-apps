"use client";

import React from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Trash2 } from "lucide-react";

interface ConfirmModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	title?: string;
	description?: string;
	confirmText?: string;
	cancelText?: string;
	variant?: "default" | "destructive";
	isLoading?: boolean;
}

export function ConfirmModal({
	isOpen,
	onClose,
	onConfirm,
	title = "هل أنت متأكد؟",
	description = "لا يمكن التراجع عن هذا الإجراء بمجرد تنفيذه.",
	confirmText = "تأكيد",
	cancelText = "إلغاء",
	variant = "destructive",
	isLoading = false,
}: ConfirmModalProps) {
	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-[400px] rounded-3xl p-6 gap-6 border-slate-100 shadow-2xl">
				<DialogHeader className="gap-2">
					<div
						className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-2 ${
							variant === "destructive"
								? "bg-red-50 text-red-600"
								: "bg-indigo-50 text-indigo-600"
						}`}
					>
						{variant === "destructive" ? (
							<Trash2 className="h-6 w-6" />
						) : (
							<AlertCircle className="h-6 w-6" />
						)}
					</div>
					<DialogTitle className="text-xl font-bold text-slate-900 text-right">
						{title}
					</DialogTitle>
					<DialogDescription className="text-slate-500 text-sm font-medium text-right leading-relaxed">
						{description}
					</DialogDescription>
				</DialogHeader>

				<DialogFooter className="flex flex-row-reverse gap-3 sm:justify-start">
					<Button
						type="button"
						variant="ghost"
						onClick={onClose}
						className="flex-1 rounded-xl h-11 font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900"
						disabled={isLoading}
					>
						{cancelText}
					</Button>
					<Button
						type="button"
						variant={variant === "destructive" ? "destructive" : "default"}
						onClick={onConfirm}
						className={`flex-1 rounded-xl h-11 font-bold shadow-lg shadow-red-100 border-none text-white ${
							variant === "destructive"
								? "bg-red-600 hover:bg-red-700"
								: "bg-indigo-600 hover:bg-indigo-700"
						}`}
						disabled={isLoading}
					>
						{isLoading ? (
							<div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
						) : (
							confirmText
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
