"use client";

import { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PromptModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: (value: string) => void;
	title: string;
	description?: string;
	label: string;
	placeholder?: string;
	defaultValue?: string;
	isLoading?: boolean;
}

export function PromptModal({
	isOpen,
	onClose,
	onConfirm,
	title,
	description,
	label,
	placeholder,
	defaultValue = "",
	isLoading = false,
}: PromptModalProps) {
	const [value, setValue] = useState(defaultValue);

	useEffect(() => {
		if (isOpen && value !== defaultValue) {
			setValue(defaultValue);
		}
	}, [isOpen, defaultValue, value]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (value.trim()) {
			onConfirm(value.trim());
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[425px] rounded-2xl">
				<DialogHeader>
					<DialogTitle className="text-xl font-bold text-slate-900">
						{title}
					</DialogTitle>
					{description && (
						<p className="text-sm text-slate-500 mt-1">{description}</p>
					)}
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4 py-4">
					<div className="space-y-2">
						<Label
							htmlFor="prompt-input"
							className="text-sm font-bold text-slate-700 px-1"
						>
							{label}
						</Label>
						<Input
							id="prompt-input"
							value={value}
							onChange={(e) => setValue(e.target.value)}
							placeholder={placeholder}
							className="rounded-xl border-slate-200 focus:ring-indigo-500"
							autoFocus
						/>
					</div>
					<DialogFooter className="gap-2 sm:gap-0 pt-2">
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							disabled={isLoading}
							className="rounded-xl border-slate-200"
						>
							إلغاء
						</Button>
						<Button
							type="submit"
							disabled={isLoading || !value.trim()}
							className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
						>
							{isLoading ? "جاري الإضافة..." : "تأكيد"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
