"use client";

import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";

// Initialize PostHog on the client
if (typeof window !== "undefined") {
	const isPostHogInitialized =
		(posthog as any).__loaded || (posthog as any).persistence;

	if (!isPostHogInitialized) {
		posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
			api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "/ingest",
			ui_host: "https://us.posthog.com",
			person_profiles: "always",
			capture_pageview: false, // We handle this manually below
			capture_exceptions: true,
			disable_session_recording: process.env.NODE_ENV === "development",
		});
	}
}

function PostHogUserIdentifier() {
	const { data: session } = authClient.useSession();

	useEffect(() => {
		if (session?.user) {
			const user = session.user as any;
			const sess = session.session as any;
			posthog.identify(user.id, {
				email: user.email,
				name: user.name,
				organizationId: sess.activeOrganizationId,
				role: user.industryRole,
			});
		} else {
			posthog.reset();
		}
	}, [session]);

	return null;
}

function PostHogPageviewTracker(): null {
	const pathname = usePathname();
	const searchParams = useSearchParams();

	useEffect(() => {
		if (pathname && posthog) {
			let url = window.origin + pathname;
			if (searchParams.toString()) {
				url = `${url}?${searchParams.toString()}`;
			}
			posthog.capture("$pageview", {
				$current_url: url,
			});
		}
	}, [pathname, searchParams]);

	return null;
}

export function CSPostHogProvider({ children }: { children: React.ReactNode }) {
	return (
		<PostHogProvider client={posthog}>
			<Suspense fallback={null}>
				<PostHogPageviewTracker />
				<PostHogUserIdentifier />
			</Suspense>
			{children}
		</PostHogProvider>
	);
}
