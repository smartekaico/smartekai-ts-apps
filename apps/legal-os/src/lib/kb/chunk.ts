// lib/kb/chunk.ts
// Heading-based markdown chunking engine

export interface Chunk {
	chunkIndex: number;
	chunkId: string | null;
	headingPath: string;
	headingLevel: number;
	contentMd: string;
	contentText: string;
	tokensEst: number;
	citationLabel: string | null;
	metadata: Record<string, unknown>;
}

export interface ChunkConfig {
	minTokens: number;
	maxTokens: number;
	splitDepth: number;
	preserveCodeBlocks: boolean;
}

const DEFAULTS: ChunkConfig = {
	minTokens: 100,
	maxTokens: 800,
	splitDepth: 2,
	preserveCodeBlocks: true,
};

export function chunkMarkdown(
	content: string,
	docTitle: string,
	config?: Partial<ChunkConfig>,
): Chunk[] {
	const cfg = { ...DEFAULTS, ...config };
	const lines = content.split("\n");
	const rawChunks: Chunk[] = [];

	let buffer: string[] = [];
	let headingStack: string[] = [docTitle];
	let headingLevel = 0;
	let chunkIndex = 0;
	let chunkId: string | null = null;
	let inCodeBlock = false;

	function flush() {
		const text = buffer.join("\n").trim();
		if (!text || estimateTokens(text) < cfg.minTokens) return;

		rawChunks.push({
			chunkIndex: chunkIndex++,
			chunkId:
				chunkId ||
				`${docTitle.toLowerCase().replace(/\s+/g, "-")}-${chunkIndex}`,
			headingPath: headingStack.filter(Boolean).join(" > "),
			headingLevel,
			contentMd: text,
			contentText: stripMarkdown(text),
			tokensEst: estimateTokens(text),
			citationLabel: extractCitation(text),
			metadata: {},
		});

		buffer = [];
		chunkId = null;
	}

	for (const line of lines) {
		// Track code blocks
		if (line.trim().startsWith("```")) {
			inCodeBlock = !inCodeBlock;
			if (cfg.preserveCodeBlocks) {
				buffer.push(line);
				continue;
			}
		}
		if (inCodeBlock) {
			buffer.push(line);
			continue;
		}

		// Detect <!-- CHUNK_ID: xxx -->
		const cidMatch = line.match(/<!--\s*CHUNK_ID:\s*(\S+)\s*-->/);
		if (cidMatch) {
			chunkId = cidMatch[1];
			continue;
		}

		// Detect headings
		const hMatch = line.match(/^(#{1,6})\s+(.+)$/);
		if (hMatch) {
			const level = hMatch[1].length;
			const title = hMatch[2].trim();

			if (level <= cfg.splitDepth && buffer.length > 0) {
				flush();
			}

			headingStack = headingStack.slice(0, level);
			headingStack[level - 1] = title;
			headingLevel = level;
		}

		buffer.push(line);
	}

	// Flush remaining
	flush();

	// Split oversized chunks
	return rawChunks.flatMap((c) =>
		c.tokensEst > cfg.maxTokens ? splitLargeChunk(c, cfg.maxTokens) : [c],
	);
}

// ── Helpers ──────────────────────────────────────────────────

function estimateTokens(text: string): number {
	// Arabic averages ~1.5 tokens/word
	return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.5);
}

function stripMarkdown(md: string): string {
	return md
		.replace(/```[\s\S]*?```/g, "") // code blocks
		.replace(/#{1,6}\s+/g, "") // headings
		.replace(/\*\*(.+?)\*\*/g, "$1") // bold
		.replace(/\*(.+?)\*/g, "$1") // italic
		.replace(/`(.+?)`/g, "$1") // inline code
		.replace(/\[(.+?)\]\(.+?\)/g, "$1") // links
		.replace(/[>\-|]/g, " ") // blockquotes, lists, tables
		.replace(/\s+/g, " ")
		.trim();
}

function extractCitation(content: string): string | null {
	const match = content.match(/(LAW|PRE|PRI|TMP|DICT)-[\w-]+/);
	return match ? match[0] : null;
}

function splitLargeChunk(chunk: Chunk, maxTokens: number): Chunk[] {
	const paragraphs = chunk.contentMd.split("\n\n");
	const result: Chunk[] = [];
	let current: string[] = [];
	let sub = 0;

	for (const para of paragraphs) {
		if (
			estimateTokens([...current, para].join("\n\n")) > maxTokens &&
			current.length > 0
		) {
			const text = current.join("\n\n");
			result.push({
				...chunk,
				chunkIndex: chunk.chunkIndex * 100 + sub++,
				headingPath: `${chunk.headingPath} [${sub}]`,
				contentMd: text,
				contentText: stripMarkdown(text),
				tokensEst: estimateTokens(text),
			});
			current = [];
		}
		current.push(para);
	}

	if (current.length > 0) {
		const text = current.join("\n\n");
		result.push({
			...chunk,
			chunkIndex: chunk.chunkIndex * 100 + sub,
			headingPath: `${chunk.headingPath} [${sub + 1}]`,
			contentMd: text,
			contentText: stripMarkdown(text),
			tokensEst: estimateTokens(text),
		});
	}

	return result;
}
