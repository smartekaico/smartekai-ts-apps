import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { getDbCars, parts } from "@smartekai/db/cars";

// Fills parts.affiliate_url from a CSV of `partId,url` — one row per part, header
// row optional, `#` comments and blank lines ignored. Every row is validated
// before anything is written, so a typo cannot half-link the catalog. Re-running
// the same file is safe (it just rewrites the same URLs).
//
// neon-http has no transactions, so the writes below are sequential rather than
// atomic. That is acceptable here: the only realistic failure is a dropped
// connection, and re-running the CSV fixes it.
function parseCsv(text: string): { id: string; url: string; line: number }[] {
  const rows: { id: string; url: string; line: number }[] = [];
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const comma = trimmed.indexOf(",");
    if (comma === -1) throw new Error(`line ${line}: expected "partId,url"`);
    const id = trimmed.slice(0, comma).trim().replace(/^["']|["']$/g, "");
    const url = trimmed.slice(comma + 1).trim().replace(/^["']|["']$/g, "");
    if (id.toLowerCase() === "partid") return; // header row
    rows.push({ id, url, line });
  });
  return rows;
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('usage: npm run parts:links -- <file.csv>    rows: "partId,https://…"');
  const rows = parseCsv(readFileSync(resolve(process.env.INIT_CWD ?? process.cwd(), file), "utf8"));
  if (rows.length === 0) throw new Error("no rows found");

  const db = getDbCars();
  const known = new Set((await db.select({ id: parts.id }).from(parts)).map((p) => p.id));
  const seen = new Set<string>();
  const problems: string[] = [];

  for (const row of rows) {
    if (!known.has(row.id)) problems.push(`line ${row.line}: unknown part id "${row.id}"`);
    if (seen.has(row.id)) problems.push(`line ${row.line}: duplicate part id "${row.id}"`);
    seen.add(row.id);
    let parsed: URL;
    try {
      parsed = new URL(row.url);
    } catch {
      problems.push(`line ${row.line}: not a URL: ${row.url}`);
      continue;
    }
    if (parsed.protocol !== "https:") problems.push(`line ${row.line}: must be https — ${row.url}`);
    if (/(^|\.)amazon\./i.test(parsed.hostname) && !parsed.searchParams.has("tag")) {
      console.warn(`line ${row.line}: amazon link without a tag= parameter — the commission may not attribute`);
    }
  }

  if (problems.length > 0) {
    console.error(`Refusing to write — ${problems.length} problem${problems.length === 1 ? "" : "s"}:`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }

  for (const row of rows) {
    await db.update(parts).set({ affiliateUrl: row.url }).where(eq(parts.id, row.id));
    console.log(`  ${row.id} → ${row.url}`);
  }
  console.log(`Linked ${rows.length} part${rows.length === 1 ? "" : "s"}.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
