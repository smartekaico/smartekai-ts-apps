// lib/kb/parse.ts
// Markdown file parser with frontmatter extraction

import matter from "gray-matter";

export interface ParsedDocument {
	frontmatter: {
		doc_type: string;
		title: string;
		title_en?: string;
		jurisdiction?: string;
		category?: string;
		subcategory?: string;
		law_number?: number;
		year?: number;
		source_ref?: string;
		source_url?: string;
		official_source?: string;
		language?: string;
		version?: string;
		tags?: string[];
		chunk_strategy?: string;
		chunk_min_tokens?: number;
		chunk_max_tokens?: number;
		heading_depth_for_split?: number;
		[key: string]: string | number | boolean | string[] | undefined | null;
	};
	content: string;
	rawMarkdown: string;
}

/**
 * Parse a markdown file with frontmatter.
 * @param rawMarkdown - The raw markdown string
 * @param filename - The filename (for error messages and slug generation)
 * @param fallbackDocType - If frontmatter lacks doc_type, use this (derived from folder name)
 */
export function parseMarkdownFile(
	rawMarkdown: string,
	filename: string,
	fallbackDocType?: string,
): ParsedDocument {
	const { data: frontmatter, content } = matter(rawMarkdown);

	// Use fallback doc_type if not present in frontmatter
	if (!frontmatter.doc_type && fallbackDocType) {
		frontmatter.doc_type = fallbackDocType;
	}

	// Validate required fields
	if (!frontmatter.doc_type) {
		throw new Error(
			`[Parse Error] Missing "doc_type" in frontmatter of "${filename}". Must be one of: law, precedent, principle, template, dictionary`,
		);
	}

	// Derive title from filename if not present
	if (!frontmatter.title) {
		frontmatter.title = filename
			.replace(/\.md$/i, "")
			.replace(/[_-]/g, " ")
			.replace(/\b\w/g, (c) => c.toUpperCase());
	}

	// Normalize jurisdiction to DB id
	const JURISDICTION_MAP: Record<string, string> = {
		الكويت: "kuwait",
		kuwait: "kuwait",
		"المملكة العربية السعودية": "saudi",
		"saudi arabia": "saudi",
		saudi: "saudi",
		"الإمارات العربية المتحدة": "uae",
		uae: "uae",
	};

	// Normalize — always default to 'kuwait' for any unrecognized value
	const rawJurisdiction = (frontmatter.jurisdiction || "kuwait")
		.toString()
		.trim();
	frontmatter.jurisdiction =
		JURISDICTION_MAP[rawJurisdiction] ||
		JURISDICTION_MAP[rawJurisdiction.toLowerCase()] ||
		"kuwait";
	frontmatter.language = frontmatter.language || "ar";
	frontmatter.version = frontmatter.version || "1.0";
	frontmatter.tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];

	// Normalize category
	if (frontmatter.category) {
		frontmatter.category = frontmatter.category.toString().trim();
	}

	return {
		frontmatter: frontmatter as ParsedDocument["frontmatter"],
		content,
		rawMarkdown,
	};
}

export function generateSlug(filename: string): string {
	return filename
		.replace(/\.md$/i, "")
		.replace(/[^a-zA-Z0-9_-]/g, "_")
		.toLowerCase()
		.replace(/_+/g, "_")
		.replace(/^_|_$/g, "");
}
