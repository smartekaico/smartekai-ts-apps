import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { notFound } from "@tanstack/react-router";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { carsUsers, creditLedger, creditPurchases, getDbCars } from "@smartekai/db/cars";
import { auth } from "@/lib/auth";
import { grantCredits } from "@/server/credits";
import { adminUser } from "@/server/session";

// Owner-only user management: a list for the page, plus the admin plugin's own
// endpoints for ban/unban/revoke/delete (called with this request's headers so
// the plugin re-checks the role). Non-admins get the app's normal 404 — the
// page doesn't advertise itself.

export const ADMIN_PAGE_SIZE = 50;
const MAX_GRANT = 10_000;
const MAX_BAN_DAYS = 3_650;

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  /** ISO, rendered with a fixed en-US/UTC formatter on the page. */
  createdAt: string;
  role: string | null;
  banned: boolean;
  banReason: string | null;
  banExpires: string | null;
  balance: number;
  freeRenderUsed: boolean;
  isGuest: boolean;
  providers: string[];
  builds: number;
  paidUsd: number;
};

export type AdminLedgerRow = {
  id: string;
  delta: number;
  reason: string;
  buildId: string | null;
  paymentRef: string | null;
  amountUsd: string | null;
  createdAt: string;
};

export type AdminPurchaseRow = {
  id: string;
  packId: string;
  credits: number;
  amountUsd: string;
  status: string;
  createdAt: string;
};

export type AdminUsersPage = {
  rows: AdminUserRow[];
  page: number;
  pageSize: number;
  /** Rows matching the current filter (for the pager). */
  total: number;
  /** All accounts and guests in the database (for the header). */
  accountCount: number;
  guestCount: number;
  /** Sum of every `credited` purchase, all time. */
  paidUsd: number;
};

export type AdminUserDetail = {
  user: AdminUserRow;
  ledger: AdminLedgerRow[];
  purchases: AdminPurchaseRow[];
};

export type ActionResult = { ok: true; balance?: number } | { ok: false; error: string };

async function requireAdmin() {
  const admin = await adminUser();
  if (!admin) throw notFound();
  return admin;
}

/** Escape LIKE wildcards so a search for "50%" means a literal "50%". */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

function intIn(value: unknown, min: number, max: number): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

function message(err: unknown): string {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message?: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return "Something went wrong.";
}

/**
 * One row per user, with the aggregates the page needs. Correlated subqueries
 * rather than joins so the user row is never multiplied and paging stays exact.
 */
const userColumns = {
  id: carsUsers.id,
  email: carsUsers.email,
  name: carsUsers.name,
  createdAt: carsUsers.createdAt,
  role: carsUsers.role,
  banned: carsUsers.banned,
  banReason: carsUsers.banReason,
  banExpires: carsUsers.banExpires,
  balance: carsUsers.creditBalance,
  freeRenderUsed: carsUsers.freeRenderUsed,
  isGuest: carsUsers.isAnonymous,
  providers: sql<
    string | null
  >`(select string_agg(distinct a.provider_id, ',') from cars_account a where a.user_id = ${carsUsers.id})`,
  builds: sql<number>`(select count(*)::int from builds b where b.user_id = ${carsUsers.id})`,
  paidUsd: sql<string>`(select coalesce(sum(p.amount_usd), 0)::text from credit_purchases p where p.user_id = ${carsUsers.id} and p.status = 'credited')`,
};

type UserRow = {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  role: string | null;
  banned: boolean | null;
  banReason: string | null;
  banExpires: Date | null;
  balance: number;
  freeRenderUsed: boolean;
  isGuest: boolean | null;
  providers: string | null;
  builds: number;
  paidUsd: string;
};

function toUserRow(row: UserRow): AdminUserRow {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    role: row.role,
    banned: row.banned === true,
    banReason: row.banReason,
    banExpires: row.banExpires?.toISOString() ?? null,
    balance: row.balance,
    freeRenderUsed: row.freeRenderUsed === true,
    isGuest: row.isGuest === true,
    providers: row.providers ? row.providers.split(",") : [],
    builds: Number(row.builds),
    paidUsd: Number(row.paidUsd),
  };
}

function userFilter(q: string, includeGuests: boolean) {
  const filters = [];
  if (!includeGuests) filters.push(eq(carsUsers.isAnonymous, false));
  if (q) {
    const pattern = `%${escapeLike(q)}%`;
    filters.push(or(ilike(carsUsers.email, pattern), ilike(carsUsers.name, pattern)));
  }
  return filters.length ? and(...filters) : undefined;
}

export const getAdminUsers = createServerFn({ method: "GET" })
  .validator((input: { q?: string; page?: number; includeGuests?: boolean }) => ({
    q: typeof input.q === "string" ? input.q.trim().slice(0, 120) : "",
    page: intIn(input.page, 1, 10_000) ?? 1,
    includeGuests: input.includeGuests === true,
  }))
  .handler(async ({ data }): Promise<AdminUsersPage> => {
    await requireAdmin();
    const db = getDbCars();
    const where = userFilter(data.q, data.includeGuests);

    const [rows, totals, stats, paid] = await Promise.all([
      db
        .select(userColumns)
        .from(carsUsers)
        .where(where)
        .orderBy(desc(carsUsers.createdAt))
        .limit(ADMIN_PAGE_SIZE)
        .offset((data.page - 1) * ADMIN_PAGE_SIZE),
      db.select({ n: sql<number>`count(*)::int` }).from(carsUsers).where(where),
      db
        .select({
          accounts: sql<number>`count(*) filter (where coalesce(${carsUsers.isAnonymous}, false) = false)::int`,
          guests: sql<number>`count(*) filter (where coalesce(${carsUsers.isAnonymous}, false))::int`,
        })
        .from(carsUsers),
      db
        .select({ usd: sql<string>`coalesce(sum(${creditPurchases.amountUsd}), 0)::text` })
        .from(creditPurchases)
        .where(eq(creditPurchases.status, "credited")),
    ]);

    return {
      rows: rows.map((row) => toUserRow(row)),
      page: data.page,
      pageSize: ADMIN_PAGE_SIZE,
      total: Number(totals[0]?.n ?? 0),
      accountCount: Number(stats[0]?.accounts ?? 0),
      guestCount: Number(stats[0]?.guests ?? 0),
      paidUsd: Number(paid[0]?.usd ?? 0),
    };
  });

export const getAdminUser = createServerFn({ method: "GET" })
  .validator((input: { id: string }) => {
    if (typeof input.id !== "string" || input.id.length < 8 || input.id.length > 64) throw new Error("invalid user id");
    return { id: input.id };
  })
  .handler(async ({ data }): Promise<AdminUserDetail | null> => {
    await requireAdmin();
    const db = getDbCars();
    const row = (await db.select(userColumns).from(carsUsers).where(eq(carsUsers.id, data.id))).at(0);
    if (!row) return null;

    const [ledger, purchases] = await Promise.all([
      db
        .select({
          id: creditLedger.id,
          delta: creditLedger.delta,
          reason: creditLedger.reason,
          buildId: creditLedger.buildId,
          paymentRef: creditLedger.paymentRef,
          amountUsd: creditLedger.amountUsd,
          createdAt: creditLedger.createdAt,
        })
        .from(creditLedger)
        .where(eq(creditLedger.userId, data.id))
        .orderBy(desc(creditLedger.createdAt))
        .limit(20),
      db
        .select({
          id: creditPurchases.id,
          packId: creditPurchases.packId,
          credits: creditPurchases.credits,
          amountUsd: creditPurchases.amountUsd,
          status: creditPurchases.status,
          createdAt: creditPurchases.createdAt,
        })
        .from(creditPurchases)
        .where(eq(creditPurchases.userId, data.id))
        .orderBy(desc(creditPurchases.createdAt))
        .limit(10),
    ]);

    return {
      user: toUserRow(row),
      ledger: ledger.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
      purchases: purchases.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })),
    };
  });

export const adminGrantCredits = createServerFn({ method: "POST" })
  .validator((input: { userId: string; delta: number }) => {
    const delta = intIn(input.delta, -MAX_GRANT, MAX_GRANT);
    if (!delta || delta === 0) throw new Error(`delta must be a non-zero whole number up to ${MAX_GRANT}`);
    if (typeof input.userId !== "string" || input.userId.length < 8) throw new Error("invalid user id");
    return { userId: input.userId, delta };
  })
  .handler(async ({ data }): Promise<ActionResult> => {
    await requireAdmin();
    const result = await grantCredits(data.userId, data.delta);
    if (!result.ok) return { ok: false, error: `Refused — the balance can't go below zero (balance: ${result.balance}).` };
    return { ok: true, balance: result.balance };
  });

export const adminBanUser = createServerFn({ method: "POST" })
  .validator((input: { userId: string; reason: string; days?: number }) => {
    const reason = typeof input.reason === "string" ? input.reason.trim().slice(0, 500) : "";
    if (!reason) throw new Error("a ban reason is required");
    const days = input.days === undefined ? undefined : intIn(input.days, 1, MAX_BAN_DAYS);
    if (input.days !== undefined && days === null) throw new Error("days must be between 1 and 3650");
    if (typeof input.userId !== "string" || input.userId.length < 8) throw new Error("invalid user id");
    return { userId: input.userId, reason, days };
  })
  .handler(async ({ data }): Promise<ActionResult> => {
    const admin = await requireAdmin();
    if (data.userId === admin.id) return { ok: false, error: "You can't ban yourself." };
    try {
      await auth.api.banUser({
        body: {
          userId: data.userId,
          banReason: data.reason,
          ...(data.days ? { banExpiresIn: data.days * 86_400 } : {}),
        },
        headers: getRequest().headers,
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: message(err) };
    }
  });

export const adminUnbanUser = createServerFn({ method: "POST" })
  .validator((input: { userId: string }) => {
    if (typeof input.userId !== "string" || input.userId.length < 8) throw new Error("invalid user id");
    return { userId: input.userId };
  })
  .handler(async ({ data }): Promise<ActionResult> => {
    await requireAdmin();
    try {
      await auth.api.unbanUser({ body: { userId: data.userId }, headers: getRequest().headers });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: message(err) };
    }
  });

export const adminRevokeSessions = createServerFn({ method: "POST" })
  .validator((input: { userId: string }) => {
    if (typeof input.userId !== "string" || input.userId.length < 8) throw new Error("invalid user id");
    return { userId: input.userId };
  })
  .handler(async ({ data }): Promise<ActionResult> => {
    await requireAdmin();
    try {
      await auth.api.revokeUserSessions({ body: { userId: data.userId }, headers: getRequest().headers });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: message(err) };
    }
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .validator((input: { userId: string }) => {
    if (typeof input.userId !== "string" || input.userId.length < 8) throw new Error("invalid user id");
    return { userId: input.userId };
  })
  .handler(async ({ data }): Promise<ActionResult> => {
    const admin = await requireAdmin();
    if (data.userId === admin.id) return { ok: false, error: "You can't delete yourself." };
    try {
      // Sessions and linked accounts cascade; builds, credit_ledger and
      // credit_purchases keep their rows with user_id set null (audit trail).
      await auth.api.removeUser({ body: { userId: data.userId }, headers: getRequest().headers });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: message(err) };
    }
  });

