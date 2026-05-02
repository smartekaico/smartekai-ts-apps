"use client";

import { usePostHog } from "posthog-js/react";
import type React from "react";

export function PostHogWrapper({
	eventName,
	properties,
	children,
}: { eventName: string; properties?: any; children: React.ReactNode }) {
	const posthog = usePostHog();
	return (
		<div
			onClick={() => posthog?.capture(eventName, properties)}
			className="inline-block"
		>
			{children}
		</div>
	);
}
