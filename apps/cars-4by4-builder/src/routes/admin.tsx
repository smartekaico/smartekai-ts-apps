import { useState } from "react";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import {
  adminBanUser,
  adminDeleteUser,
  adminGrantCredits,
  adminRevokeSessions,
  adminUnbanUser,
  getAdminUser,
  getAdminUsers,
} from "@/lib/admin";
import type { AdminUserRow } from "@/lib/admin";
import { Toast } from "@/components/Toast";

type AdminSearch = { q?: string; page?: number; guests?: boolean; user?: string };

export const Route = createFileRoute("/admin")({
  validateSearch: (search: Record<string, unknown>): AdminSearch => {
    const page = Number(search.page);
    return {
      q: typeof search.q === "string" && search.q.trim() ? search.q.trim() : undefined,
      page: Number.isInteger(page) && page > 1 ? page : undefined,
      guests:
        search.guests === true || search.guests === 1 || search.guests === "1" || search.guests === "true"
          ? true
          : undefined,
      user: typeof search.user === "string" && search.user.length >= 8 ? search.user : undefined,
    };
  },
  loaderDeps: ({ search }) => ({ q: search.q, page: search.page, guests: search.guests, user: search.user }),
  loader: async ({ deps }) => {
    const [list, detail] = await Promise.all([
      getAdminUsers({ data: { q: deps.q, page: deps.page, includeGuests: deps.guests } }),
      deps.user ? getAdminUser({ data: { id: deps.user } }) : Promise.resolve(null),
    ]);
    return { list, detail };
  },
  head: () => ({ meta: [{ title: "Admin | Overlander Builder" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

// Fixed locale + time zone so the server render and hydration produce the same text.
const DATE_FORMAT = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });
const usd = (value: number) => `$${value.toFixed(2)}`;

function AdminPage() {
  const { list, detail } = Route.useLoaderData();
  const { q, page, guests, user } = Route.useSearch();
  const pages = Math.max(1, Math.ceil(list.total / list.pageSize));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl">Admin</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {list.accountCount} account{list.accountCount === 1 ? "" : "s"} · {list.guestCount} guest
        {list.guestCount === 1 ? "" : "s"} · {usd(list.paidUsd)} credited all time
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <form method="get" action="/admin" className="flex items-center gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search email or name"
            aria-label="Search users"
            className="w-64 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
          {guests && <input type="hidden" name="guests" value="1" />}
          <button type="submit" className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold">
            Search
          </button>
          {q && (
            <Link to="/admin" search={{ guests }} className="text-sm text-muted-foreground underline-offset-4 hover:underline">
              Clear
            </Link>
          )}
        </form>

        <Link
          to="/admin"
          search={(prev) => ({ q: prev.q, guests: prev.guests ? undefined : true, user: undefined })}
          className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          {guests ? "Hide guests" : "Include guests"}
        </Link>
      </div>

      {detail && <UserDetail row={detail.user} ledger={detail.ledger} purchases={detail.purchases} />}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-3 font-semibold">Email</th>
              <th className="py-2 pr-3 font-semibold">Name</th>
              <th className="py-2 pr-3 font-semibold">Sign-in</th>
              <th className="py-2 pr-3 font-semibold">Joined</th>
              <th className="py-2 pr-3 text-right font-semibold">Credits</th>
              <th className="py-2 pr-3 text-right font-semibold">Builds</th>
              <th className="py-2 pr-3 text-right font-semibold">Paid</th>
              <th className="py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {list.rows.map((row) => (
              <tr key={row.id} className={row.id === user ? "bg-muted/50" : undefined}>
                <td className="py-2 pr-3">
                  <Link
                    to="/admin"
                    search={(prev) => ({ ...prev, user: row.id })}
                    className="font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    {row.email}
                  </Link>
                  {row.isGuest && <span className="ml-2 text-xs text-muted-foreground">guest</span>}
                </td>
                <td className="py-2 pr-3">{row.name}</td>
                <td className="py-2 pr-3 text-muted-foreground">{row.providers.join(", ") || "—"}</td>
                <td className="py-2 pr-3 text-muted-foreground">{DATE_FORMAT.format(new Date(row.createdAt))}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{row.balance}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{row.builds}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{usd(row.paidUsd)}</td>
                <td className="py-2">
                  {row.banned ? <span className="font-semibold text-red-600 dark:text-red-400">Banned</span> : "Active"}
                </td>
              </tr>
            ))}
            {list.rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-muted-foreground">
                  No users match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <nav className="mt-4 flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">
          {list.total} match{list.total === 1 ? "" : "es"} · page {list.page} of {pages}
        </span>
        {page && page > 1 && (
          <Link to="/admin" search={(prev) => ({ ...prev, page: prev.page && prev.page > 2 ? prev.page - 1 : undefined })}>
            ← Previous
          </Link>
        )}
        {(page ?? 1) < pages && (
          <Link to="/admin" search={(prev) => ({ ...prev, page: (prev.page ?? 1) + 1 })}>
            Next →
          </Link>
        )}
      </nav>
    </main>
  );
}

function UserDetail({
  row,
  ledger,
  purchases,
}: {
  row: AdminUserRow;
  ledger: Array<{
    id: string;
    delta: number;
    reason: string;
    buildId: string | null;
    paymentRef: string | null;
    amountUsd: string | null;
    createdAt: string;
  }>;
  purchases: Array<{ id: string; packId: string; credits: number; amountUsd: string; status: string; createdAt: string }>;
}) {
  return (
    <section className="mt-6 rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl">{row.email}</h2>
        <Link to="/admin" search={(prev) => ({ ...prev, user: undefined })} className="text-sm text-muted-foreground">
          Close
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {row.name} · {row.balance} credits · {row.builds} builds · {usd(row.paidUsd)} paid · role {row.role ?? "user"}
        {row.isGuest ? " · guest" : ""}
      </p>
      {row.banned && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          Banned{row.banReason ? `: ${row.banReason}` : ""}
          {row.banExpires ? ` (until ${DATE_FORMAT.format(new Date(row.banExpires))})` : ""}
        </p>
      )}

      <UserActions row={row} />

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Ledger (last 20)</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {ledger.length === 0 && <li className="text-muted-foreground">No entries.</li>}
            {ledger.map((l) => (
              <li key={l.id} className="flex justify-between gap-3 border-b border-border/60 pb-1">
                <span>
                  <span className={l.delta < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}>
                    {l.delta > 0 ? `+${l.delta}` : l.delta}
                  </span>{" "}
                  {l.reason}
                  {l.buildId ? ` · ${l.buildId.slice(0, 8)}…` : ""}
                </span>
                <span className="shrink-0 text-muted-foreground">{DATE_FORMAT.format(new Date(l.createdAt))}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Purchases (last 10)</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {purchases.length === 0 && <li className="text-muted-foreground">No purchases.</li>}
            {purchases.map((p) => (
              <li key={p.id} className="flex justify-between gap-3 border-b border-border/60 pb-1">
                <span>
                  {p.packId} · {p.credits} credits · ${p.amountUsd} · {p.status}
                </span>
                <span className="shrink-0 text-muted-foreground">{DATE_FORMAT.format(new Date(p.createdAt))}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function UserActions({ row }: { row: AdminUserRow }) {
  const router = useRouter();
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [days, setDays] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run(label: string, action: () => Promise<{ ok: boolean; balance?: number; error?: string }>, after?: () => void) {
    setBusy(label);
    setError(null);
    setNotice(null);
    try {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "That didn't work.");
        return;
      }
      setNotice(result.balance !== undefined ? `Done — balance is now ${result.balance}.` : "Done.");
      await router.invalidate();
      after?.();
    } catch {
      setError("That didn't work — reload and try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="grant-delta" className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Grant credits
          </label>
          <input
            id="grant-delta"
            type="number"
            step={1}
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            placeholder="e.g. 100"
            className="mt-1 w-32 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
        </div>
        <button
          type="button"
          disabled={busy !== null || !Number.isInteger(Number(delta)) || Number(delta) === 0}
          onClick={() =>
            void run("grant", () => adminGrantCredits({ data: { userId: row.id, delta: Number(delta) } }), () => setDelta(""))
          }
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          Apply
        </button>
        <p className="text-xs text-muted-foreground">Negative takes credits away; the balance can't go below zero.</p>
      </div>

      {row.banned ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void run("unban", () => adminUnbanUser({ data: { userId: row.id } }))}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
          >
            Unban
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="ban-reason" className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ban reason
            </label>
            <input
              id="ban-reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-64 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="ban-days" className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Days (blank = forever)
            </label>
            <input
              id="ban-days"
              type="number"
              min={1}
              step={1}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="mt-1 w-32 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            />
          </div>
          <button
            type="button"
            disabled={busy !== null || !reason.trim()}
            onClick={() =>
              void run(
                "ban",
                () =>
                  adminBanUser({
                    data: { userId: row.id, reason: reason.trim(), days: days ? Number(days) : undefined },
                  }),
                () => setReason(""),
              )
            }
            className="rounded-md border border-red-600 px-3 py-1.5 text-sm font-semibold text-red-600 disabled:opacity-50 dark:border-red-400 dark:text-red-400"
          >
            Ban
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void run("revoke", () => adminRevokeSessions({ data: { userId: row.id } }))}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
        >
          Sign out everywhere
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
        <div>
          <label htmlFor="delete-confirm" className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Delete user — type their email
          </label>
          <input
            id="delete-confirm"
            type="text"
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            placeholder={row.email}
            className="mt-1 w-64 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
        </div>
        <button
          type="button"
          disabled={busy !== null || confirmEmail !== row.email}
          onClick={() =>
            void run("delete", () => adminDeleteUser({ data: { userId: row.id } }), () => {
              void router.navigate({ to: "/admin", search: {} });
            })
          }
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          Delete user
        </button>
        <p className="text-xs text-muted-foreground">
          Sessions and sign-in methods are deleted. Builds, ledger and purchases stay, unlinked.
        </p>
      </div>

      {notice && <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{notice}</p>}
      {error && <Toast message={error} onDismiss={() => setError(null)} />}
    </div>
  );
}
