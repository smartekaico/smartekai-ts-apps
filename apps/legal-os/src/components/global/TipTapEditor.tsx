"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/components/ui/button";
import {
	Bold,
	Italic,
	Heading1,
	Heading2,
	Heading3,
	List,
	ListOrdered,
	Minus,
	Undo2,
	Redo2,
	FileDown,
	Save,
	Quote,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

export default function TipTapEditor({
	content,
	caseId,
	onSave,
	readOnly = false,
}: {
	content: string;
	caseId: string;
	onSave?: (html: string) => Promise<void>;
	readOnly?: boolean;
}) {
	const [isSaving, setIsSaving] = useState(false);
	const userEditedRef = useRef(false);
	const settingContentRef = useRef(false);

	const editor = useEditor({
		extensions: [StarterKit],
		content: content || '<p dir="rtl">مساحة صياغة المذكرة القانونية...</p>',
		immediatelyRender: false,
		editable: !readOnly,
		editorProps: {
			attributes: {
				class: "tiptap-editor-content",
				dir: "rtl",
			},
		},
		onUpdate: () => {
			if (!settingContentRef.current) {
				userEditedRef.current = true;
			}
		},
	});

	// Sync external content into the editor
	useEffect(() => {
		if (editor && content !== undefined && !userEditedRef.current) {
			settingContentRef.current = true;
			editor.commands.setContent(content || '<p dir="rtl"></p>', { emitUpdate: false });
			settingContentRef.current = false;
		}
	}, [content, editor]);

	const handleSave = async () => {
		if (!editor || !onSave) return;
		setIsSaving(true);
		await onSave(editor.getHTML());
		setIsSaving(false);
	};

	const handleExport = async () => {
		if (!editor) return;
		const html = editor.getHTML();

		try {
			const res = await fetch("/api/legal/export/docx", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ html }),
			});

			const blob = await res.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `Legal_Memo_${caseId}.docx`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
		} catch (e) {
			console.error("Export Failed", e);
			toast.error("فشل التصدير إلى Word");
		}
	};

	if (!editor) return null;

	const ToolbarButton = ({
		onClick,
		isActive,
		icon: Icon,
		title,
	}: {
		onClick: () => void;
		isActive?: boolean;
		icon: React.ElementType;
		title: string;
	}) => (
		<button
			type="button"
			onClick={onClick}
			title={title}
			className={`p-2 rounded-lg transition-colors hover:bg-indigo-100 hover:text-indigo-700 ${
				isActive ? "bg-indigo-100 text-indigo-700 shadow-sm" : "text-slate-500"
			}`}
		>
			<Icon className="h-4 w-4" />
		</button>
	);

	return (
		<div
			className={"border border-slate-200 rounded-xl flex flex-col overflow-hidden bg-white shadow-sm w-full h-full min-h-[500px] will-change-transform"}
		>
			{/* Toolbar — hidden in readOnly */}
			{!readOnly && (
				<div className="flex items-center justify-between border-b px-3 py-2 bg-slate-50/80 flex-wrap gap-2">
					{/* Formatting tools */}
					<div className="flex items-center gap-1">
						<ToolbarButton
							onClick={() => editor.chain().focus().toggleBold().run()}
							isActive={editor.isActive("bold")}
							icon={Bold}
							title="Bold / خط عريض"
						/>
						<ToolbarButton
							onClick={() => editor.chain().focus().toggleItalic().run()}
							isActive={editor.isActive("italic")}
							icon={Italic}
							title="Italic / مائل"
						/>

						<div className="w-px h-6 bg-slate-200 mx-1" />

						<ToolbarButton
							onClick={() =>
								editor.chain().focus().toggleHeading({ level: 1 }).run()
							}
							isActive={editor.isActive("heading", { level: 1 })}
							icon={Heading1}
							title="Heading 1 / عنوان رئيسي"
						/>
						<ToolbarButton
							onClick={() =>
								editor.chain().focus().toggleHeading({ level: 2 }).run()
							}
							isActive={editor.isActive("heading", { level: 2 })}
							icon={Heading2}
							title="Heading 2 / عنوان فرعي"
						/>
						<ToolbarButton
							onClick={() =>
								editor.chain().focus().toggleHeading({ level: 3 }).run()
							}
							isActive={editor.isActive("heading", { level: 3 })}
							icon={Heading3}
							title="Heading 3 / عنوان ثالث"
						/>

						<div className="w-px h-6 bg-slate-200 mx-1" />

						<ToolbarButton
							onClick={() => editor.chain().focus().toggleBulletList().run()}
							isActive={editor.isActive("bulletList")}
							icon={List}
							title="Bullet List / قائمة نقطية"
						/>
						<ToolbarButton
							onClick={() => editor.chain().focus().toggleOrderedList().run()}
							isActive={editor.isActive("orderedList")}
							icon={ListOrdered}
							title="Ordered List / قائمة مرقمة"
						/>
						<ToolbarButton
							onClick={() => editor.chain().focus().toggleBlockquote().run()}
							isActive={editor.isActive("blockquote")}
							icon={Quote}
							title="Blockquote / اقتباس"
						/>
						<ToolbarButton
							onClick={() => editor.chain().focus().setHorizontalRule().run()}
							icon={Minus}
							title="Divider / فاصل"
						/>

						<div className="w-px h-6 bg-slate-200 mx-1" />

						<ToolbarButton
							onClick={() => editor.chain().focus().undo().run()}
							icon={Undo2}
							title="Undo / تراجع"
						/>
						<ToolbarButton
							onClick={() => editor.chain().focus().redo().run()}
							icon={Redo2}
							title="Redo / إعادة"
						/>
					</div>

					{/* Action buttons */}
					<div className="flex gap-2">
						<Button
							onClick={handleSave}
							disabled={isSaving}
							size="sm"
							className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4"
						>
							<Save className="h-4 w-4 ml-2" />
							{isSaving ? "جاري الحفظ..." : "حفظ"}
						</Button>
						<Button
							onClick={handleExport}
							size="sm"
							variant="outline"
							className="border-indigo-200 text-indigo-700 rounded-lg"
						>
							<FileDown className="h-4 w-4 ml-2" />
							تصدير Word
						</Button>
					</div>
				</div>
			)}

			{/* Editor content area with proper Arabic typography */}
			<div className="overflow-y-auto flex-1 bg-white">
				<EditorContent editor={editor} />
			</div>

			{/* Styles for editor content */}
			<style jsx global>{`
        .tiptap-editor-content {
          min-height: 600px;
          padding: 1.5rem 2.5rem;
          font-family: var(--font-naskh), 'Noto Naskh Arabic', serif;
          font-size: 1rem;
          line-height: 2;
          color: #1e293b;
          direction: rtl;
          text-align: right;
          outline: none;
        }

        @media (max-width: 768px) {
          .tiptap-editor-content {
            padding: 1.5rem 1rem;
            min-height: 400px;
            font-size: 0.95rem;
          }
        }

        .tiptap-editor-content:focus {
          outline: none;
        }

        .tiptap-editor-content > * + * {
          margin-top: 0.75em;
        }

        .tiptap-editor-content h1 {
          font-size: 1.75rem;
          font-weight: 700;
          color: #0f172a;
          margin-top: 1.5em;
          margin-bottom: 0.75em;
          padding-bottom: 0.5em;
          border-bottom: 2px solid #e2e8f0;
          line-height: 1.4;
        }

        .tiptap-editor-content h2 {
          font-size: 1.4rem;
          font-weight: 700;
          color: #1e293b;
          margin-top: 1.25em;
          margin-bottom: 0.5em;
          line-height: 1.5;
        }

        .tiptap-editor-content h3 {
          font-size: 1.15rem;
          font-weight: 600;
          color: #334155;
          margin-top: 1em;
          margin-bottom: 0.5em;
          line-height: 1.5;
        }

        .tiptap-editor-content p {
          margin-bottom: 0.75em;
          line-height: 2;
          word-spacing: 0.05em;
          letter-spacing: 0.01em;
        }

        .tiptap-editor-content strong {
          font-weight: 700;
          color: #0f172a;
        }

        .tiptap-editor-content em {
          font-style: italic;
        }

        .tiptap-editor-content ul,
        .tiptap-editor-content ol {
          padding-right: 1.5em;
          padding-left: 0;
          margin-bottom: 0.75em;
        }

        .tiptap-editor-content ul {
          list-style-type: disc;
        }

        .tiptap-editor-content ol {
          list-style-type: decimal;
        }

        .tiptap-editor-content li {
          margin-bottom: 0.4em;
          line-height: 1.8;
          padding-right: 0.25em;
        }

        .tiptap-editor-content li > ul,
        .tiptap-editor-content li > ol {
          margin-top: 0.25em;
          margin-bottom: 0;
        }

        .tiptap-editor-content blockquote {
          border-right: 4px solid #6366f1;
          border-left: none;
          padding-right: 1em;
          padding-left: 0;
          margin-right: 0;
          margin-left: 0;
          margin-bottom: 0.75em;
          color: #475569;
          font-style: italic;
          background: #f8fafc;
          padding: 0.75em 1em;
          border-radius: 0 0.5rem 0.5rem 0;
        }

        .tiptap-editor-content hr {
          border: none;
          border-top: 2px solid #e2e8f0;
          margin: 1.5em 0;
        }

        .tiptap-editor-content table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          font-size: 0.95rem;
          table-layout: fixed;
          margin: 1em 0;
          overflow: hidden;
        }

        .tiptap-editor-content thead {
          background: #f1f5f9;
        }

        .tiptap-editor-content th {
          padding: 0.75em 1em;
          border-bottom: 2px solid #cbd5e1;
          font-weight: 700;
          text-align: right;
          color: #1e293b;
          white-space: nowrap;
          letter-spacing: 0.03em;
          word-spacing: 0.15em;
        }

        .tiptap-editor-content td {
          padding: 0.75em 1em;
          border-bottom: 1px solid #e2e8f0;
          text-align: right;
          line-height: 1.8;
          letter-spacing: 0.02em;
          word-spacing: 0.12em;
          word-break: keep-all;
          overflow-wrap: break-word;
        }

        .tiptap-editor-content tr:nth-child(even) {
          background: #f8fafc;
        }

        .tiptap-editor-content code {
          background: #f1f5f9;
          padding: 0.15em 0.4em;
          border-radius: 0.25rem;
          font-size: 0.9em;
          color: #6366f1;
        }

        .tiptap-editor-content pre {
          background: #1e293b;
          color: #e2e8f0;
          padding: 1em;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin-bottom: 1em;
          direction: ltr;
          text-align: left;
        }

        .tiptap-editor-content pre code {
          background: none;
          color: inherit;
          padding: 0;
        }

        /* Ensure first child has no top margin */
        .tiptap-editor-content > :first-child {
          margin-top: 0;
        }
      `}</style>
		</div>
	);
}
