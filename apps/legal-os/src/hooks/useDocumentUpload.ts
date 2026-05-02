"use client";

import type * as React from "react";
import { useState } from "react";
import { toast } from "sonner";

interface UseDocumentUploadOptions {
	onSuccess?: (text: string, fileName: string) => void;
	onError?: (error: string) => void;
	onParseStateChange?: (isParsing: boolean) => void;
}

export function useDocumentUpload(options?: UseDocumentUploadOptions) {
	const [isUploading, setIsUploading] = useState(false);
	const [progress, setProgress] = useState(0);
	const [extractedText, setExtractedText] = useState<string | null>(null);
	const [fileName, setFileName] = useState("");

	const handleUpload = async (file: File) => {
		if (!file) return;

		// Unified validation for legal/medical SaaS
		const ext = file.name.split(".").pop()?.toLowerCase();
		const supportedExts = ["pdf", "docx", "doc", "txt", "md"];

		if (!supportedExts.includes(ext || "")) {
			const errorMsg =
				"ملف غير مدعوم. يرجى رفع ملفات PDF, DOCX, DOC, TXT أو MD.";
			toast.error(errorMsg);
			options?.onError?.(errorMsg);
			return;
		}

		setIsUploading(true);
		options?.onParseStateChange?.(true);
		setProgress(10);
		setFileName(file.name);

		const formData = new FormData();
		formData.append("file", file);

		const toastId = toast.loading("جاري معالجة المستند واستخراج النص...");

		try {
			setProgress(40);
			const res = await fetch("/api/parse-document", {
				method: "POST",
				body: formData,
			});

			setProgress(80);
			const data = await res.json();

			if (data.text) {
				setExtractedText(data.text);
				setProgress(100);
				toast.success("تم استخراج النص بنجاح", { id: toastId });
				options?.onSuccess?.(data.text, file.name);
			} else {
				const error = data.error || "فشل استخراج النص";
				toast.error(error, { id: toastId });
				options?.onError?.(error);
			}
		} catch (error) {
			const errorMsg = "حدث خطأ أثناء الاتصال بخدمة معالجة المستندات";
			toast.error(errorMsg, { id: toastId });
			options?.onError?.(errorMsg);
		} finally {
			setIsUploading(false);
			options?.onParseStateChange?.(false);
			setTimeout(() => setProgress(0), 1000);
		}
	};

	const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			handleUpload(file);
		}
		// Reset the input so the same file can be uploaded again if needed
		if (e.target) {
			e.target.value = "";
		}
	};

	const reset = () => {
		setExtractedText(null);
		setFileName("");
		setProgress(0);
		setIsUploading(false);
	};

	return {
		isUploading,
		progress,
		extractedText,
		fileName,
		handleUpload,
		handleFileInputChange,
		reset,
	};
}
