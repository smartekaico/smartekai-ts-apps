import { Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { useCredits } from "@/lib/use-credits";

export function SiteHeader() {
  const { data, isPending } = authClient.useSession();
  const account = data && !data.user.isAnonymous ? data.user : null; // guests render as signed out
  const credits = useCredits(account !== null, account?.id);

  async function signOut() {
    try {
      await authClient.signOut();
    } catch (err) {
      console.error("sign out failed", err);
    }
    window.location.assign("/"); // reload either way; a failed sign-out shows the account links again
  }

  return (
    <header className="border-b border-border print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="text-lg font-extrabold tracking-tight">
          4x4 <span className="text-primary">Builder</span>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm font-semibold">
          <Link to="/build" className="hover:text-primary">
            Build yours
          </Link>
          {isPending ? null : account ? (
            <>
              {credits && (
                <Link
                  to="/credits"
                  className="rounded-full border border-border px-2.5 py-0.5 text-xs hover:border-primary"
                >
                  {credits.balance} credits
                </Link>
              )}
              <Link to="/projects" className="hover:text-primary">
                My projects
              </Link>
              <button type="button" onClick={signOut} className="text-muted-foreground hover:text-primary">
                Sign out
              </button>
            </>
          ) : (
            <Link to="/sign-in" search={{ next: "/" }} className="hover:text-primary">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
