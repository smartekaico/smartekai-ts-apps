import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { getDbCars, parts } from "@smartekai/db/cars";
import { storeOf } from "../src/lib/store";

// Fills parts.affiliate_url from a CSV of `partId,url` — one row per part, header
// row optional, `#` comments and blank lines ignored. Every row is validated
// before anything is written, so a typo cannot half-link the catalog. Re-running
// the same file is safe (it just rewrites the same URLs).
//
// `--check` does the same validation without writing: it prints one row per
// part with the store the link resolves to, the host and the HTTP status, so a
// dead or mistyped link is visible before it ships. Missing links are reported
// but do not fail the run (the catalog can be linked in batches); malformed
// rows do.
//
// neon-http has no transactions, so the writes below are sequential rather than
// atomic. That is acceptable here: the only realistic failure is a dropped
// connection, and re-running the CSV fixes it.
type Row = { id: string; url: string; line: number };

function parseCsv(text: string): Row[] {
  const rows: Row[] = [];
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const comma = trimmed.indexOf(",");
    if (comma === -1) throw new Error(`line ${line}: expected "partId,url"`);
    const id = trimmed.slice(0, comma).trim().replace(/^["']|["']$/g, "");
    const url = trimmed.slice(comma + 1).trim().replace(/^["']|["']$/g, "");
    if (id.toLowerCase() === "partid") return; // header row
    rows.push({ id, url, line }); // blank url = "not linked yet" — the template ships with these
  });
  return rows;
}

function readCsv(file: string): Row[] {
  return parseCsv(readFileSync(resolveCsv(file), "utf8"));
}

// The CSV may be given relative to the directory npm was invoked from, the
// current directory, or the app itself — so the same command works from the
// repo root and from inside the app.
function resolveCsv(file: string): string {
  if (file.startsWith("/")) return file;
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(process.env.INIT_CWD ?? process.cwd(), file),
    resolve(process.cwd(), file),
    resolve(scriptDir, "..", file),
    resolve(scriptDir, file),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "—";
  }
}

async function httpStatus(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
      headers: { "user-agent": "Mozilla/5.0 (compatible; smartekai-link-check/1.0)" },
    });
    await res.body?.cancel();
    return String(res.status);
  } catch {
    return "ERR";
  }
}

async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check");
  const file = args.find((arg) => !arg.startsWith("--"));
  if (!file) {
    throw new Error(
      checkOnly
        ? "usage: npm run links:check -- <file.csv>    (writes nothing)"
        : 'usage: npm run parts:links -- <file.csv>    rows: "partId,https://…"',
    );
  }

  const csv = readCsv(file);
  const db = getDbCars();
  const existing = new Map(
    (await db.select({ id: parts.id, url: parts.affiliateUrl }).from(parts)).map((p) => [p.id, p.url] as const),
  );

  const problems: string[] = [];
  const notes: string[] = [];
  const seen = new Set<string>();

  // Validate first: a malformed row must not reach the writes below.
  for (const row of csv) {
    if (!existing.has(row.id)) {
      problems.push(`line ${row.line}: unknown part id "${row.id}"`);
      continue;
    }
    if (seen.has(row.id)) {
      problems.push(`line ${row.line}: duplicate part id "${row.id}"`);
      continue;
    }
    seen.add(row.id);
    if (row.url === "") continue;

    let parsed: URL;
    try {
      parsed = new URL(row.url);
    } catch {
      problems.push(`line ${row.line}: not a URL: ${row.url}`);
      continue;
    }
    if (parsed.protocol !== "https:") problems.push(`line ${row.line}: must be https — ${row.url}`);
    if (storeOf(row.url) === "amazon" && !parsed.searchParams.has("tag")) {
      notes.push(`${row.id}: amazon link without tag= — the commission may not attribute`);
    }
  }

  if (problems.length > 0) {
    console.error(`Refusing to ${checkOnly ? "check" : "write"} — ${problems.length} problem${problems.length === 1 ? "" : "s"}:`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }

  if (!checkOnly) {
    const rows = csv.filter((row) => row.url !== "");
    if (rows.length === 0) throw new Error("no links to write — every row was blank (fill in the url column first)");
    for (const row of rows) {
      await db.update(parts).set({ affiliateUrl: row.url }).where(eq(parts.id, row.id));
      console.log(`  ${row.id} → ${row.url}`);
    }
    console.log(`Linked ${rows.length} part${rows.length === 1 ? "" : "s"}.`);
    return;
  }

  // Check mode: one line per catalog part, CSV order first, then parts the CSV
  // does not mention. A blank row keeps whatever the database already has.
  const targets = csv.map((row) => {
    const url = row.url !== "" ? row.url : (existing.get(row.id) ?? null);
    return { id: row.id, url, fromCsv: row.url !== "" };
  });
  for (const [id, url] of existing) {
    if (!seen.has(id)) targets.push({ id, url: url ?? null, fromCsv: false });
  }

  const statuses = new Map<string, string>();
  const queue = targets.filter((target) => target.url !== null);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(6, queue.length) }, async () => {
      while (cursor < queue.length) {
        const target = queue[cursor++];
        statuses.set(target.id, await httpStatus(target.url as string));
      }
    }),
  );

  const table = targets.map((target) => ({
    id: target.id,
    store: target.url ? (storeOf(target.url) ?? "—") : "—",
    status: target.url ? (statuses.get(target.id) ?? "?") : "—",
    host: target.url ? hostOf(target.url) : "—",
    source: target.url ? (target.fromCsv ? "csv" : "db") : "missing",
  }));

  const width = {
    id: Math.max(4, ...table.map((row) => row.id.length)),
    store: Math.max(5, ...table.map((row) => row.store.length)),
    status: 6,
    host: Math.max(4, ...table.map((row) => row.host.length)),
  };
  const pad = (value: string, size: number) => value.padEnd(size);

  console.log(`${pad("part", width.id)}  ${pad("store", width.store)}  ${pad("status", width.status)}  ${pad("host", width.host)}  source`);
  for (const row of table) {
    console.log(
      `${pad(row.id, width.id)}  ${pad(row.store, width.store)}  ${pad(row.status, width.status)}  ${pad(row.host, width.host)}  ${row.source}`,
    );
  }

  const missing = table.filter((row) => row.source === "missing").length;
  const linked = table.length - missing;
  const flagged = table.filter((row) => row.status !== "—" && (row.status === "ERR" || Number(row.status) >= 400));
  console.log(`\n${table.length} part${table.length === 1 ? "" : "s"} · ${linked} linked · ${missing} missing · ${flagged.length} flagged`);

  for (const row of flagged) console.log(`  flag ${row.id}: ${row.status} from ${row.host}`);
  for (const note of notes) console.log(`  note ${note}`);
  if (flagged.length > 0) console.log("\nFlagged links are reported, not fatal — the store may simply be blocking bots.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
