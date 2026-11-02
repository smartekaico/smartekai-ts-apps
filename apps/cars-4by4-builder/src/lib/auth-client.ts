import { createAuthClient } from "better-auth/react";
import { adminClient, anonymousClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [anonymousClient(), adminClient()],
});

/**
 * Gives a first-time visitor a guest identity so their builds can follow them
 * into an account later (Spec 2 §3.1). Never throws — if it fails, the build
 * is simply unowned.
 */
export async function ensureGuestSession(): Promise<void> {
  try {
    const { data } = await authClient.getSession();
    if (!data) await authClient.signIn.anonymous();
  } catch {
    // fall through: unowned build
  }
}
