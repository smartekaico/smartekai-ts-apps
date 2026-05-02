import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function getBaseUrl() {
	// If we have a specific public override, use it first (most reliable for production)
	if (process.env.PUBLIC_APP_URL) return process.env.PUBLIC_APP_URL;
	if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;

	// In development, we fallback to localhost ONLY if no other URL is provided
	if (process.env.NODE_ENV === "development") {
		// If we are running in a container or VPS but accessed via a domain, 
		// we should still prefer the domain if BETTER_AUTH_URL is set.
		return process.env.BETTER_AUTH_URL || "http://localhost:3000";
	}

	if (
		process.env.BETTER_AUTH_URL &&
		!process.env.BETTER_AUTH_URL.includes("localhost")
	) {
		return process.env.BETTER_AUTH_URL;
	}

	// Default fallback to production domain
	return "https://smartekai.com";
}

/**
 * Returns a publicly accessible base URL for the application.
 * Guaranteed to point to the production domain or a configured public URL,
 * preventing 'localhost' links from being sent in emails.
 */
export function getPublicUrl() {
	// If we have a specific public override, use it
	if (process.env.PUBLIC_APP_URL) return process.env.PUBLIC_APP_URL;

	// In production environment (Vercel/Dokploy), try to get the configured app URL
	if (
		process.env.NEXT_PUBLIC_APP_URL &&
		!process.env.NEXT_PUBLIC_APP_URL.includes("localhost")
	) {
		return process.env.NEXT_PUBLIC_APP_URL;
	}

	// Default fallback to production domain
	return "https://smartekai.com";
}

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function stripMarkdown(text: string): string {
	return text
		.replace(/(\*\*|__)(.*?)\1/g, "$2") // Bold
		.replace(/(\*|_)(.*?)\1/g, "$2") // Italic
		.replace(/(^|\n)#{1,6}\s+(.*)/g, "$1$2") // Headers
		.replace(/(`)(.*?)\1/g, "$2") // Inline code
		.replace(/\[(.*?)\]\(.*?\)/g, "$1") // Links
		.replace(/^\s*[-*+]\s+/gm, "") // List items
		.replace(/^\s*\d+\.\s+/gm, "") // Numbered items
		.trim();
}
