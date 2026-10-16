import { getRequest } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";

export type SessionUser = { id: string; isAnonymous?: boolean | null };

/**
 * The request's user — a guest (anonymous plugin) or an account — or null.
 * Never throws: a failed lookup means "no user", so ownership stays optional.
 */
export async function currentUser(): Promise<SessionUser | null> {
  try {
    const session = await auth.api.getSession({ headers: getRequest().headers });
    return session?.user ?? null;
  } catch (err) {
    console.error("currentUser: session lookup failed", err);
    return null;
  }
}

/** Only a real account (Google or email), never an anonymous guest. */
export async function accountUser(): Promise<SessionUser | null> {
  const user = await currentUser();
  return user && !user.isAnonymous ? user : null;
}
