"use client";

import { useState } from "react";
import {
	UploadCloud,
	FileText,
	Loader2,
	Copy,
	Trash2,
	CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDocumentUpload } from "@/hooks/useDocumentUpload";

interface DocumentHubProps {
	onContentDecided: (content: string) => void;
	isLoading?: boolean;
	value?: string;
}

export function DocumentHub({
	onContentDecided,
	isLoading,
	value,
}: DocumentHubProps) {
	const [manualText, setManualText] = useState("");

	const {
		isUploading: isParsing,
		progress: uploadProgress,
		extractedText,
		handleUpload,
		handleFileInputChange,
		reset,
	} = useDocumentUpload({
		onSuccess: (text) => {
			onContentDecided(text);
		},
	});

	const documentText = extractedText || value || manualText;

	const clearContent = () => {
		setManualText("");
		reset();
		onContentDecided("");
	};

	const copyToClipboard = () => {
		navigator.clipboard.writeText(documentText);
		toast.success("تم نسخ النص");
	};

	return (
		<div className="flex flex-col gap-6 rtl" dir="rtl">
			{/* SECTION 1: Input & Upload */}
			<div className="bg-white/80 backdrop-blur-md p-6 rounded-[2rem] shadow-sm border border-slate-200/50">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
						<FileText className="w-5 h-5 text-indigo-600" />
						المستند الأصلي
					</h2>
					{documentText && (
						<div className="flex gap-2">
							<Button
								variant="ghost"
								size="icon"
								onClick={copyToClipboard}
								className="h-8 w-8 text-slate-400 hover:text-indigo-600"
							>
								<Copy className="w-3.5 h-3.5" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								onClick={clearContent}
								className="h-8 w-8 text-slate-400 hover:text-red-500"
							>
								<Trash2 className="w-3.5 h-3.5" />
							</Button>
						</div>
					)}
				</div>

				{/* Upload Box */}
				<div className="mb-4">
					<label
						className={cn(
							"relative flex flex-col items-center justify-center w-full p-4.5 border-2 border-dashed rounded-[1.5rem] cursor-pointer transition-all duration-300",
							isParsing
								? "bg-indigo-50/50 border-indigo-200"
								: "bg-slate-50/50 border-slate-200 hover:bg-slate-100/70 hover:border-indigo-300",
							documentText ? "border-emerald-200 bg-emerald-50/10" : "",
						)}
					>
						<div className="flex flex-col items-center text-center">
							{isParsing ? (
								<Loader2 className="w-7 h-7 text-indigo-600 mb-2 animate-spin" />
							) : documentText ? (
								<CheckCircle2 className="w-7 h-7 text-emerald-500 mb-2" />
							) : (
								<UploadCloud className="w-7 h-7 text-indigo-500 mb-2" />
							)}
							<span className="text-[11px] font-bold text-slate-600 leading-tight">
								{isParsing
									? "جاري استخراج النص بالذكاء الاصطناعي (OCR)..."
									: documentText
										? "تم استخراج النص. يمكنك الرفع مرة أخرى لتغييره"
										: "اضغط لرفع ملف (PDF, DOCX, DOC) سحب وإفلات لـ OCR الفوري"}
							</span>
							<span className="text-[9px] text-slate-400 mt-1 uppercase font-bold tracking-widest leading-none">
								يدعم الصور والمستندات الورقية الممسوحة (LiteParse OCR)
							</span>
						</div>
						<input
							type="file"
							className="hidden"
							accept=".pdf,.docx,.doc,.txt,.md"
							onChange={handleFileInputChange}
							disabled={isParsing}
						/>

						{uploadProgress > 0 && uploadProgress < 100 && (
							<div className="absolute bottom-0 left-0 right-0 h-1.5 overflow-hidden rounded-b-[1.5rem]">
								<Progress
									value={uploadProgress}
									className="h-full bg-indigo-50 rounded-none shadow-none"
								/>
							</div>
						)}
					</label>
				</div>

				{/* Textarea */}
				<div className="relative group">
					<textarea
						className="w-full h-48 p-6 bg-slate-50/50 rounded-2xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-100 outline-none font-sans leading-relaxed resize-none transition-all font-bold"
						placeholder="قم بلصق النص القانوني هنا يدوياً، أو قم برفع ملف ليتم استخراج النص تلقائياً عبر محرّك LiteParse الذكي..."
						value={documentText}
						onChange={(e) => {
							setManualText(e.target.value);
							onContentDecided(e.target.value);
						}}
						disabled={isParsing || isLoading}
					/>
					{isParsing && (
						<div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-center justify-center rounded-2xl">
							<div className="bg-white p-3 rounded-xl shadow-lg border border-slate-100 flex items-center gap-3">
								<Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
								<span className="text-xs font-bold text-slate-600">
									جاري المعالجة...
								</span>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
