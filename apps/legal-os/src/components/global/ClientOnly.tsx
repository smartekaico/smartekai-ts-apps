"use client";

import { useState, useEffect, type ReactNode } from "react";

/**
 * ClientOnly component prevents hydration mismatches by ensuring that
 * its children are only rendered on the client side.
 *
 * This is particularly useful for features like relative time ("3 minutes ago")
 * or date formatting using the user's local timezone.
 */
export function ClientOnly({
	children,
	fallback = null,
}: { children: ReactNode; fallback?: ReactNode }) {
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	if (!isMounted) {
		return <>{fallback}</>;
	}

	return <>{children}</>;
}
