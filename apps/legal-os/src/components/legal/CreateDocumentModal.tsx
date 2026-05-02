"use client";

import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Edit3, Wand2, ArrowRight } from "lucide-react";
import { LegalDraftingTool } from "@/components/legal/ai-tools/LegalDraftingTool";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface CreateDocumentModalProps {
	isOpen: boolean;
	onClose: () => void;
	caseId: string;
	onSelectScratch: () => void;
}

export function CreateDocumentModal({
	isOpen,
	onClose,
	caseId,
	onSelectScratch,
	onSelectAI,
}: CreateDocumentModalProps & { onSelectAI?: () => void }) {
	const t = useTranslations("Workspace");

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="bg-white p-0 overflow-hidden transition-all duration-300 max-w-md">
				<DialogHeader className="p-6 border-b bg-slate-50/50">
					<div className="flex items-center justify-between">
						<div>
							<DialogTitle className="text-xl font-bold text-slate-900">
								{t("newDocOptionsTitle")}
							</DialogTitle>
							<DialogDescription className="mt-1">
								{t("selectMethod")}
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<div className="p-6 grid grid-cols-1 gap-4">
					<button
						onClick={onSelectScratch}
						className="group flex items-start gap-4 p-5 rounded-2xl border border-slate-100 bg-white hover:border-indigo-100 hover:bg-indigo-50/30 hover:shadow-md transition-all text-right"
					>
						<div className="h-12 w-12 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center group-hover:bg-white group-hover:text-indigo-600 transition-all">
							<Edit3 className="h-6 w-6" />
						</div>
						<div className="flex-1">
							<h4 className="font-bold text-slate-900 group-hover:text-indigo-600">
								{t("newDocScratchTitle")}
							</h4>
							<p className="text-xs text-slate-500 mt-1 leading-relaxed">
								{t("newDocScratchDesc")}
							</p>
						</div>
					</button>

					<button
						onClick={() => {
							if (onSelectAI) onSelectAI();
						}}
						className="group flex items-start gap-4 p-5 rounded-2xl border border-slate-100 bg-white hover:border-emerald-100 hover:bg-emerald-50/30 hover:shadow-md transition-all text-right"
					>
						<div className="h-12 w-12 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center group-hover:bg-white group-hover:text-emerald-600 transition-all">
							<Wand2 className="h-6 w-6" />
						</div>
						<div className="flex-1">
							<h4 className="font-bold text-slate-900 group-hover:text-emerald-600">
								{t("newDocDraftTitle")}
							</h4>
							<p className="text-xs text-slate-500 mt-1 leading-relaxed">
								{t("newDocDraftDesc")}
							</p>
						</div>
					</button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
