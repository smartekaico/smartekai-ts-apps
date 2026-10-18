import { and, eq, sql } from "drizzle-orm";
import { getDbCars, rateLimits } from "@smartekai/db/cars";

type Rule = { key: string; limit: number; windowMs: number };

const HOUR = 3_600_000;

/**
 * Consumes one unit from every rule, or none if any rule is exhausted.
 * Fixed windows in Postgres (Workers isolates share no memory). A refused rule
 * gives back the units already taken (best-effort: a lost give-back only
 * over-counts, the safe side).
 */
export async function tryConsume(rules: Rule[]): Promise<boolean> {
  const db = getDbCars();
  const now = Date.now();
  const taken: { key: string; windowStart: Date }[] = [];
  for (const r of rules) {
    const windowStart = new Date(Math.floor(now / r.windowMs) * r.windowMs);
    const rows = await db
      .insert(rateLimits)
      .values({ key: r.key, windowStart, count: 1, expiresAt: new Date(windowStart.getTime() + r.windowMs) })
      .onConflictDoUpdate({
        target: [rateLimits.key, rateLimits.windowStart],
        set: { count: sql`${rateLimits.count} + 1` },
        setWhere: sql`${rateLimits.count} < ${r.limit}`,
      })
      .returning({ count: rateLimits.count });
    if (rows.length === 0) {
      for (const t of taken) {
        await db
          .update(rateLimits)
          .set({ count: sql`${rateLimits.count} - 1` })
          .where(and(eq(rateLimits.key, t.key), eq(rateLimits.windowStart, t.windowStart)))
          .catch((err: unknown) => console.warn("[rate-limit] give-back failed", err));
      }
      return false;
    }
    taken.push({ key: r.key, windowStart });
  }
  return true;
}

/** Cron (Spec 4 §4): drop counters whose window has ended. */
export async function pruneRateLimits(): Promise<number> {
  const rows = await getDbCars()
    .delete(rateLimits)
    .where(sql`${rateLimits.expiresAt} < now()`)
    .returning({ key: rateLimits.key });
  return rows.length;
}

export const renderRules = (ip: string): Rule[] => [
  { key: `render:h:${ip}`, limit: 5, windowMs: HOUR },
  { key: `render:d:${ip}`, limit: 15, windowMs: 24 * HOUR },
];

export const photoRules = (ip: string): Rule[] => [{ key: `photo:h:${ip}`, limit: 20, windowMs: HOUR }];

/** Spec 3 §3: clearing cookies yields a new guest, so cap free renders per network. Free-render path only. */
export const freeRenderRules = (ip: string): Rule[] => [{ key: `free:d:${ip}`, limit: 2, windowMs: 24 * HOUR }];

/** Spec 3 §5 flow 2: at most 10 checkouts (invoices) per account per hour. */
export const checkoutRules = (userId: string): Rule[] => [{ key: `checkout:h:${userId}`, limit: 10, windowMs: HOUR }];
