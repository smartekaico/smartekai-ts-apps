import { createAuthClient } from "better-auth/react";
import { organization } from "better-auth/plugins";
import { magicLinkClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
	baseURL:
		typeof window !== "undefined"
			? window.location.origin
			: process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL,
	plugins: [organization(), magicLinkClient()],
});
