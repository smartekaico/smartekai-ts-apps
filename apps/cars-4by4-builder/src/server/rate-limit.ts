type Rule = { key: string; limit: number; windowMs: number };
type Window = { count: number; resetAt: number };

// In-memory: correct for the single Node instance this app deploys as.
const windows = new Map<string, Window>();
const HOUR = 3_600_000;

function prune(now: number) {
  if (windows.size < 10_000) return;
  for (const [key, w] of windows) if (w.resetAt <= now) windows.delete(key);
}

/** Consumes one unit from every rule, or none if any rule is exhausted. */
export function tryConsume(rules: Rule[]): boolean {
  const now = Date.now();
  prune(now);
  const current = rules.map((r) => {
    const w = windows.get(r.key);
    return !w || w.resetAt <= now ? { count: 0, resetAt: now + r.windowMs } : w;
  });
  if (rules.some((r, i) => current[i].count >= r.limit)) return false;
  rules.forEach((r, i) => windows.set(r.key, { count: current[i].count + 1, resetAt: current[i].resetAt }));
  return true;
}

export const renderRules = (ip: string): Rule[] => [
  { key: `render:h:${ip}`, limit: 5, windowMs: HOUR },
  { key: `render:d:${ip}`, limit: 15, windowMs: 24 * HOUR },
];

export const photoRules = (ip: string): Rule[] => [{ key: `photo:h:${ip}`, limit: 20, windowMs: HOUR }];
