"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Reusable Arabic-optimized Markdown renderer for legal content.
 * Used in drafting and analyze pages during streaming (before TipTap takes over).
 *
 * Fixes Arabic letter merging in tables by applying proper spacing and isolated rendering.
 */
export default function LegalMarkdownRenderer({
	content,
	isStreaming = false,
}: {
	content: string;
	isStreaming?: boolean;
}) {
	return (
		<div
			className="max-w-none text-right"
			dir="rtl"
			style={{
				fontFamily: "var(--font-naskh), 'Noto Naskh Arabic', serif",
				lineHeight: 2,
				letterSpacing: "0.01em",
			}}
		>
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				components={{
					h1: ({ children }) => <h1 style={styles.h1}>{children}</h1>,
					h2: ({ children }) => <h2 style={styles.h2}>{children}</h2>,
					h3: ({ children }) => <h3 style={styles.h3}>{children}</h3>,
					p: ({ children }) => <p style={styles.p}>{children}</p>,
					ul: ({ children }) => <ul style={styles.ul}>{children}</ul>,
					ol: ({ children }) => <ol style={styles.ol}>{children}</ol>,
					li: ({ children }) => <li style={styles.li}>{children}</li>,
					blockquote: ({ children }) => (
						<blockquote style={styles.blockquote}>{children}</blockquote>
					),
					hr: () => <hr style={styles.hr} />,
					a: ({ children, href }) => (
						<a
							href={href}
							style={styles.a}
							target="_blank"
							rel="noopener noreferrer"
						>
							{children}
						</a>
					),
					strong: ({ children }) => (
						<strong style={styles.strong}>{children}</strong>
					),
					table: ({ children }) => (
						<div style={{ overflowX: "auto", margin: "1em 0" }}>
							<table style={styles.table}>{children}</table>
						</div>
					),
					thead: ({ children }) => (
						<thead style={styles.thead}>{children}</thead>
					),
					th: ({ children }) => <th style={styles.th}>{children}</th>,
					td: ({ children }) => <td style={styles.td}>{children}</td>,
					tr: ({ children, ...props }) => {
						const isEven = props.node?.position?.start?.line
							? props.node.position.start.line % 2 === 0
							: false;
						return (
							<tr style={{ background: isEven ? "#f8fafc" : "white" }}>
								{children}
							</tr>
						);
					},
				}}
			>
				{content}
			</ReactMarkdown>
			{isStreaming && (
				<span className="inline-block w-2 h-5 bg-indigo-500 animate-pulse ml-1" />
			)}
		</div>
	);
}

// ── Shared styles with Arabic typography fixes ──────────────────
const styles: Record<string, React.CSSProperties> = {
	h1: {
		fontSize: "1.75rem",
		fontWeight: 700,
		color: "#0f172a",
		marginTop: "1.5em",
		marginBottom: "0.75em",
		paddingBottom: "0.5em",
		borderBottom: "2px solid #e2e8f0",
		lineHeight: 1.4,
	},
	h2: {
		fontSize: "1.4rem",
		fontWeight: 700,
		color: "#1e293b",
		marginTop: "1.25em",
		marginBottom: "0.5em",
		lineHeight: 1.5,
	},
	h3: {
		fontSize: "1.15rem",
		fontWeight: 600,
		color: "#334155",
		marginTop: "1em",
		marginBottom: "0.5em",
		lineHeight: 1.5,
	},
	p: {
		marginBottom: "0.75em",
		lineHeight: 2,
		wordSpacing: "0.05em",
	},
	ul: {
		paddingRight: "1.5em",
		marginBottom: "0.75em",
		listStyleType: "disc",
	},
	ol: {
		paddingRight: "1.5em",
		marginBottom: "0.75em",
		listStyleType: "decimal",
	},
	li: {
		marginBottom: "0.4em",
		lineHeight: 1.8,
		paddingRight: "0.25em",
	},
	blockquote: {
		borderRight: "4px solid #6366f1",
		borderLeft: "none",
		paddingRight: "1em",
		margin: "0.75em 0",
		color: "#475569",
		fontStyle: "italic",
		background: "#f8fafc",
		padding: "0.75em 1em",
		borderRadius: "0 0.5rem 0.5rem 0",
	},
	hr: {
		border: "none",
		borderTop: "2px solid #e2e8f0",
		margin: "1.5em 0",
	},
	strong: {
		fontWeight: 700,
		color: "#0f172a",
	},
	table: {
		width: "100%",
		borderCollapse: "separate",
		borderSpacing: 0,
		border: "1px solid #e2e8f0",
		borderRadius: "0.5rem",
		fontSize: "0.95rem",
		tableLayout: "fixed",
	},
	thead: {
		background: "#f1f5f9",
	},
	th: {
		padding: "0.75em 1em",
		borderBottom: "2px solid #cbd5e1",
		fontWeight: 700,
		textAlign: "right",
		color: "#1e293b",
		whiteSpace: "nowrap",
		letterSpacing: "0.03em",
		wordSpacing: "0.15em",
	},
	td: {
		padding: "0.75em 1em",
		borderBottom: "1px solid #e2e8f0",
		textAlign: "right",
		lineHeight: 1.8,
		// Key Arabic typography fixes: prevent letter merging
		letterSpacing: "0.02em",
		wordSpacing: "0.12em",
		wordBreak: "keep-all" as const,
		overflowWrap: "break-word" as const,
	},
	a: {
		color: "#4f46e5", // Indigo-600
		textDecoration: "none",
		fontWeight: 700,
		borderBottom: "1px dashed #c7d2fe",
		transition: "all 0.2s",
	},
};
