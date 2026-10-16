import { useState } from "react";
import type { FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { safeNext } from "@/lib/next";

export const Route = createFileRoute("/sign-in")({
  validateSearch: (search: Record<string, unknown>) => ({ next: safeNext(search.next) }),
  head: () => ({ meta: [{ title: "Sign in | 4x4 Builder" }, { name: "robots", content: "noindex" }] }),
  component: SignInPage,
});

const INPUT = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

function SignInPage() {
  const { next } = Route.useSearch();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function google() {
    setError(null);
    setPending(true);
    const { error: err } = await authClient.signIn.social({ provider: "google", callbackURL: next });
    if (err) {
      setError(err.message ?? "Google sign-in failed — try again.");
      setPending(false);
    }
    // success: the browser is redirected to Google
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error: err } =
      mode === "sign-up"
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password });
    if (err) {
      setError(err.message ?? "That didn't work — check your details.");
      setPending(false);
      return;
    }
    window.location.assign(next); // full load so header + loaders see the new session
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-5 px-4 py-16">
      <h1 className="text-3xl">{mode === "sign-in" ? "Sign in" : "Create your account"}</h1>
      <p className="text-sm text-muted-foreground">Unlock full build reports and keep your builds in My projects.</p>

      <button
        type="button"
        onClick={google}
        disabled={pending}
        className="rounded-md border border-border px-4 py-2.5 font-semibold hover:border-primary disabled:opacity-50"
      >
        Continue with Google
      </button>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        {mode === "sign-up" && (
          <input
            className={INPUT}
            placeholder="Name"
            aria-label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}
        <input
          className={INPUT}
          type="email"
          placeholder="Email"
          aria-label="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className={INPUT}
          type="password"
          placeholder="Password (8+ characters)"
          aria-label="Password"
          autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-4 py-2.5 font-bold text-primary-foreground disabled:opacity-50"
        >
          {mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "sign-in" ? "sign-up" : "sign-in");
          setError(null);
        }}
        className="text-sm font-semibold text-primary"
      >
        {mode === "sign-in" ? "New here? Create an account" : "Have an account? Sign in"}
      </button>
    </main>
  );
}
