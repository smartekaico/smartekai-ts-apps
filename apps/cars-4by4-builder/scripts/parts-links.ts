import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { getDbCars, partVehicleLinks, parts, vehicles } from "@smartekai/db/cars";
import { storeOf } from "../src/lib/store";

// Fills affiliate URLs from a CSV of `partId,url[,vehicleIds]` — one row per
// part, header row optional, `#` comments and blank lines ignored.
//
// The optional third column is a `|`-separated list of vehicle ids
// (`silverado-1500|sierra-1500`): that link is used for those vehicles only,
// and it beats the part's default `parts.affiliate_url`. Without the third
// column the row is the part's default link (today's behaviour). A URL that
// contains a comma has to be quoted ("https://…?a=1,2"), otherwise the row
// would look like a three-column row.
//
// Every row is validated before anything is written, so a typo cannot half-link
// the catalogue. Re-running the same file is safe (it just rewrites the same
// URLs).
//
// `--check` does the same validation without writing: one line per (part,
// vehicle) with the store the link resolves to, the host and the HTTP status,
// so a dead or mistyped link is visible before it ships. Missing links are
// reported but do not fail the run (the catalogue can be linked in batches);
// malformed rows do.
//
// neon-http has no transactions, so the writes below are sequential rather than
// atomic. That is acceptable here: the only realistic failure is a dropped
// connection, and re-running the CSV fixes it.
type Row = { id: string; url: string; vehicleIds: string[]; line: number };

/** A vehicle-id list: `f150` or `silverado-1500|sierra-1500`. */
const VEHICLE_LIST = /^[a-z0-9|-]+$/i;

/** Splits one row into fields, honouring double quotes (a quoted URL may contain commas). */
function splitFields(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else quoted = false;
      } else current += char;
      continue;
    }
    if (char === '"' && current.trim() === "") {
      quoted = true;
      current = "";
    } else if (char === ",") {
      fields.push(current.trim());
      current = "";
    } else current += char;
  }
  fields.push(current.trim());
  return fields;
}

function stripQuotes(value: string): string {
  return value.replace(/^["']|["']$/g, "").trim();
}

function parseCsv(text: string): Row[] {
  const rows: Row[] = [];
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const fields = splitFields(trimmed);
    const id = stripQuotes(fields[0] ?? "");
    if (id.toLowerCase() === "partid") return; // header row
    if (fields.length < 2) throw new Error(`line ${line}: expected "partId,url[,vehicleIds]"`);

    let url = stripQuotes(fields[1]);
    let vehicleIds: string[] = [];
    if (fields.length > 2) {
      // Three columns: the last one is the vehicle list, the middle is the URL
      // (joined back together so a quoted URL may still contain commas).
      const last = stripQuotes(fields[fields.length - 1]);
      if (!VEHICLE_LIST.test(last)) {
        throw new Error(`line ${line}: expected "partId,url[,vehicleIds]" — quote a URL that contains a comma`);
      }
      vehicleIds = last.split("|").map((vehicle) => vehicle.trim()).filter(Boolean);
      url = stripQuotes(fields.slice(1, -1).join(","));
    }
    rows.push({ id, url, vehicleIds, line });
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

type State = {
  parts: Map<string, { vehicleIds: string[]; url: string | null }>;
  vehicleIds: Set<string>;
  links: Map<string, string>; // "<partId>|<vehicleId>" → url
};

async function loadState(): Promise<State> {
  const db = getDbCars();
  const [partRows, vehicleRows, linkRows] = await Promise.all([
    db.select({ id: parts.id, vehicleIds: parts.vehicleIds, url: parts.affiliateUrl }).from(parts),
    db.select({ id: vehicles.id }).from(vehicles),
    db.select({ partId: partVehicleLinks.partId, vehicleId: partVehicleLinks.vehicleId, url: partVehicleLinks.url }).from(partVehicleLinks),
  ]);
  return {
    parts: new Map(partRows.map((part) => [part.id, { vehicleIds: part.vehicleIds, url: part.url }] as const)),
    vehicleIds: new Set(vehicleRows.map((vehicle) => vehicle.id)),
    links: new Map(linkRows.map((link) => [`${link.partId}|${link.vehicleId}`, link.url] as const)),
  };
}

function validate(rows: Row[], state: State): { problems: string[]; notes: string[] } {
  const problems: string[] = [];
  const notes: string[] = [];
  const seenDefault = new Set<string>();
  const seenPair = new Set<string>();

  for (const row of rows) {
    const part = state.parts.get(row.id);
    if (!part) {
      problems.push(`line ${row.line}: unknown part id "${row.id}"`);
      continue;
    }

    if (row.vehicleIds.length === 0) {
      if (seenDefault.has(row.id)) problems.push(`line ${row.line}: duplicate part id "${row.id}"`);
      seenDefault.add(row.id);
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
      continue;
    }

    if (row.url === "") {
      problems.push(`line ${row.line}: a vehicle-specific row needs a URL`);
      continue;
    }
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

    for (const vehicleId of row.vehicleIds) {
      if (!state.vehicleIds.has(vehicleId)) {
        problems.push(`line ${row.line}: unknown vehicle id "${vehicleId}" — if the url contains a comma, quote it`);
        continue;
      }
      if (!part.vehicleIds.includes(vehicleId)) {
        problems.push(`line ${row.line}: "${row.id}" does not fit ${vehicleId}`);
      }
      const key = `${row.id}|${vehicleId}`;
      if (seenPair.has(key)) problems.push(`line ${row.line}: duplicate link for ${row.id} on ${vehicleId}`);
      seenPair.add(key);
    }
  }

  return { problems, notes };
}

async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes("--check");
  const file = args.find((arg) => !arg.startsWith("--"));
  if (!file) {
    throw new Error(
      checkOnly
        ? "usage: npm run links:check -- <file.csv>    (writes nothing)"
        : 'usage: npm run parts:links -- <file.csv>    rows: "partId,https://…[,vehicleId|vehicleId]"',
    );
  }

  const rows = readCsv(file);
  const db = getDbCars();
  const state = await loadState();
  const { problems, notes } = validate(rows, state);

  if (problems.length > 0) {
    console.error(`Refusing to ${checkOnly ? "check" : "write"} — ${problems.length} problem${problems.length === 1 ? "" : "s"}:`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }

  if (!checkOnly) {
    const linked = rows.filter((row) => row.url !== "");
    if (linked.length === 0) throw new Error("no links to write — every row was blank (fill in the url column first)");
    for (const row of linked) {
      if (row.vehicleIds.length === 0) {
        await db.update(parts).set({ affiliateUrl: row.url }).where(eq(parts.id, row.id));
        console.log(`  ${row.id} → ${row.url}`);
        continue;
      }
      for (const vehicleId of row.vehicleIds) {
        await db
          .insert(partVehicleLinks)
          .values({ partId: row.id, vehicleId, url: row.url })
          .onConflictDoUpdate({
            target: [partVehicleLinks.partId, partVehicleLinks.vehicleId],
            set: { url: row.url },
          });
        console.log(`  ${row.id} → ${row.url}  (${vehicleId})`);
      }
    }
    console.log(`Linked ${linked.length} row${linked.length === 1 ? "" : "s"}.`);
    return;
  }

  // Check mode: one line per (part, vehicle). A part's default link is the
  // row with no vehicle; a vehicle-specific link is its own row.
  type Target = { partId: string; vehicleId: string | null; url: string | null; source: string };
  const targets: Target[] = [];
  const covered = new Set<string>();

  for (const row of rows) {
    if (row.vehicleIds.length === 0) {
      const current = state.parts.get(row.id)?.url ?? null;
      targets.push({
        partId: row.id,
        vehicleId: null,
        url: row.url !== "" ? row.url : current,
        source: row.url !== "" ? "csv" : current ? "db" : "missing",
      });
      covered.add(`${row.id}|`);
      continue;
    }
    for (const vehicleId of row.vehicleIds) {
      targets.push({ partId: row.id, vehicleId, url: row.url, source: "csv" });
      covered.add(`${row.id}|${vehicleId}`);
    }
  }

  // Links already in the database that the CSV does not mention.
  for (const [key, url] of state.links) {
    if (covered.has(key)) continue;
    const [partId, vehicleId] = key.split("|");
    targets.push({ partId, vehicleId, url, source: "db" });
  }
  for (const [partId, part] of state.parts) {
    if (covered.has(`${partId}|`) || !part.url) continue;
    targets.push({ partId, vehicleId: null, url: part.url, source: "db" });
  }

  // One request per distinct URL (the GM link serves two vehicles).
  const statusByUrl = new Map<string, string>();
  const urls = [...new Set(targets.map((target) => target.url).filter((url): url is string => url !== null))];
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(6, urls.length) }, async () => {
      while (cursor < urls.length) {
        const url = urls[cursor++];
        statusByUrl.set(url, await httpStatus(url));
      }
    }),
  );

  const table = targets.map((target) => ({
    part: target.partId,
    vehicle: target.vehicleId ?? "default",
    store: target.url ? (storeOf(target.url) ?? "—") : "—",
    status: target.url ? (statusByUrl.get(target.url) ?? "?") : "—",
    host: target.url ? hostOf(target.url) : "—",
    source: target.source,
  }));

  const width = {
    part: Math.max(4, ...table.map((row) => row.part.length)),
    vehicle: Math.max(7, ...table.map((row) => row.vehicle.length)),
    store: Math.max(5, ...table.map((row) => row.store.length)),
    status: 6,
    host: Math.max(4, ...table.map((row) => row.host.length)),
  };
  const pad = (value: string, size: number) => value.padEnd(size);

  console.log(`${pad("part", width.part)}  ${pad("vehicle", width.vehicle)}  ${pad("store", width.store)}  ${pad("status", width.status)}  ${pad("host", width.host)}  source`);
  for (const row of table) {
    console.log(
      `${pad(row.part, width.part)}  ${pad(row.vehicle, width.vehicle)}  ${pad(row.store, width.store)}  ${pad(row.status, width.status)}  ${pad(row.host, width.host)}  ${row.source}`,
    );
  }

  const missing = table.filter((row) => row.source === "missing").length;
  const linked = table.length - missing;
  const flagged = table.filter((row) => row.status !== "—" && (row.status === "ERR" || Number(row.status) >= 400));
  console.log(`\n${table.length} link${table.length === 1 ? "" : "s"} · ${linked} linked · ${missing} missing · ${flagged.length} flagged`);

  for (const row of flagged) console.log(`  flag ${row.part} (${row.vehicle}): ${row.status} from ${row.host}`);
  for (const note of notes) console.log(`  note ${note}`);
  if (flagged.length > 0) console.log("\nFlagged links are reported, not fatal — the store may simply be blocking bots.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
