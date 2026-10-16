import { getRequest } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";

export type SessionUser = { id: string; isAnonymous?: boolean | null };

/** The request's user — a guest (anonymous plugin) or an account — or null. */
export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: getRequest().headers });
  return session?.user ?? null;
}

/** Only a real account (Google or email), never an anonymous guest. */
export async function accountUser(): Promise<SessionUser | null> {
  const user = await currentUser();
  return user && !user.isAnonymous ? user : null;
}
