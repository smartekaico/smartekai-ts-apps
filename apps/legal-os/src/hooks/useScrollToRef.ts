"use client";

import { useRef, useCallback } from "react";

/**
 * Reusable hook for smooth scrolling to a target element.
 * Usage:
 *   const { targetRef, scrollToTarget } = useScrollToRef<HTMLDivElement>();
 *   <div ref={targetRef}>...</div>
 *   <button onClick={scrollToTarget}>Go</button>
 */
export function useScrollToRef<T extends HTMLElement = HTMLDivElement>() {
	const targetRef = useRef<T>(null);

	const scrollToTarget = useCallback(() => {
		if (targetRef.current) {
			// Small delay to allow DOM to render/update before scrolling
			setTimeout(() => {
				targetRef.current?.scrollIntoView({
					behavior: "smooth",
					block: "start",
				});
			}, 100);
		}
	}, []);

	return { targetRef, scrollToTarget };
}
