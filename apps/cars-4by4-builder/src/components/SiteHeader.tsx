import { Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

export function SiteHeader() {
  const { data } = authClient.useSession();
  const account = data && !data.user.isAnonymous ? data.user : null; // guests render as signed out

  async function signOut() {
    await authClient.signOut();
    window.location.assign("/");
  }

  return (
    <header className="border-b border-border print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="text-lg font-extrabold tracking-tight">
          4x4 <span className="text-primary">Builder</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm font-semibold">
          <Link to="/build" className="hover:text-primary">
            Build yours
          </Link>
          {account ? (
            <>
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
