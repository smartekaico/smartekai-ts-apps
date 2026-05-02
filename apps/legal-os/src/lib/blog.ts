import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const blogDirectory = path.join(process.cwd(), "src/content/blog");

export interface BlogPost {
	title: string;
	excerpt: string;
	date: string;
	author: string;
	category: string;
	slug: string;
	image: string;
	content: string;
}

export function getBlogSlugs() {
	const files = fs.readdirSync(blogDirectory);
	// Filter for unique slugs (removing -en and -ar suffixes)
	const slugs = new Set(files.map(file => file.replace(/-(en|ar)\.md$/, "")));
	return Array.from(slugs);
}

export function getBlogPostBySlug(slug: string, locale: string): BlogPost | null {
	try {
		const fullPath = path.join(blogDirectory, `${slug}-${locale}.md`);
		const fileContents = fs.readFileSync(fullPath, "utf8");
		const { data, content } = matter(fileContents);

		return {
			...data,
			slug,
			content,
		} as BlogPost;
	} catch (error) {
		console.error(`Error loading blog post ${slug} for locale ${locale}:`, error);
		return null;
	}
}

export function getAllBlogPosts(locale: string): BlogPost[] {
	const slugs = getBlogSlugs();
	const posts = slugs
		.map(slug => getBlogPostBySlug(slug, locale))
		.filter((post): post is BlogPost => post !== null)
		.sort((a, b) => (new Date(b.date).getTime() - new Date(a.date).getTime()));
	
	return posts;
}
