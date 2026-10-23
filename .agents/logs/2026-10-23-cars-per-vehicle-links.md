# Cars: per-vehicle affiliate links (Task H2, 2026-10-23)

One Amazon listing per vehicle: shocks, lift kits, wheels and tonneau covers
are sold as a different product per truck family, so `parts.affiliate_url` (one
URL per part) is not enough. Task H2 adds a second table and makes both the
redirect and the Buy button resolve the right link per vehicle.

Nothing was deployed. The production DDL is **not** applied yet.

## The rule

`part_vehicle_links` holds one URL per (part, vehicle). When a build's vehicle
has a row for a part, that URL wins; otherwise the part's default
`parts.affiliate_url` is used. A part with neither has no Buy button, and
`/go` answers 404.

```sql
create table if not exists part_vehicle_links (
  part_id text not null references parts(id) on delete cascade,
  vehicle_id text not null references vehicles(id) on delete cascade,
  url text not null,
  primary key (part_id, vehicle_id)
);
```

Applied to the Neon branch (`ep-wild-bar-b1pi4db8`) over the **direct** URL
with `psql -1`, with both foreign keys and the composite primary key confirmed
in `information_schema`. The file is
`.agents/cars-4by4-builder/specs/2026-10-23-part-vehicle-links.sql`.

`part_vehicle_links` was added to `tablesFilter` in `drizzle.cars.config.ts`,
and `packages/db/dist` was rebuilt (it is tracked in git).

## The CSV

`partId,url[,vehicleIds]` — the third column is a `|`-separated vehicle list,
so the GM link is one row for both GM trucks:

```
bilstein-5100-shocks,https://www.amazon.com/dp/B0FORD?tag=x-20,f150
bilstein-5100-shocks,https://www.amazon.com/dp/B0GM?tag=x-20,silverado-1500|sierra-1500
```

The importer (`scripts/parts-links.ts`) now:

- parses quote-aware, so a quoted URL may contain commas;
- treats the last field as a vehicle list **only** when it matches
  `^[a-z0-9|-]+$` — otherwise the row is rejected with a hint to quote the URL
  (a URL like `https://example.com/a,b` is the usual cause);
- validates that every vehicle exists, that the part **fits** that vehicle
  (`parts.vehicle_ids`), that no (part, vehicle) is written twice, and that a
  vehicle row actually has a URL;
- upserts on the primary key, so re-running the file rewrites the same rows.

`--check` prints one line per (part, vehicle) — the vehicle column says
`default` for a part's default link — with the store, the host, the HTTP status
and where the URL came from (csv/db/missing).

## The two readers

`/go/$partId` resolves both links in **one** query: `parts` left-joined to
`builds` (by the `?build=` id) and then to `part_vehicle_links` on
part + vehicle. The vehicle-specific URL wins; 404 only when both are null.
`withSubId` and the `outbound_clicks` insert are untouched.

The loader that feeds the shopping list (`loadBuild` in `src/lib/builds.ts`)
does the same coalesce, so the Buy button appears when **either** link exists
for the build's vehicle, and its label comes from the URL `/go` will actually
use. Both the report and the public build page go through it.

## Verified on the branch, with temporary links (all deleted afterwards)

Temporary links (fake ASINs on amazon.com), written through the importer
itself:

| part | link | rows written |
|---|---|---|
| `bilstein-5100-shocks` | Ford | `f150` |
| `bilstein-5100-shocks` | GM | `silverado-1500`, `sierra-1500` (one row → two) |
| `method-beadlock-701` | default | `parts.affiliate_url` |
| `kc-hilites-cube` | default | `parts.affiliate_url` |

Four temporary builds (`f150`, `silverado-1500`, `sierra-1500`, `lc300`) stood
in for real ones. The redirects:

| build | part | result |
|---|---|---|
| F-150 | shocks | the Ford URL |
| Silverado | shocks | the GM URL |
| Sierra | shocks | the GM URL |
| Land Cruiser | shocks | 404 — no row, no default |
| F-150 | wheels | the default URL |
| Land Cruiser | cube pods | the default URL |
| Silverado | BAKFlip tonneau | 404 — no link at all |
| no build | wheels | the default URL |

One `outbound_clicks` row per click, as before. In the browser, the F-150,
Silverado and Land Cruiser pages each showed "Buy on Amazon" on the linked
parts, **no** button on the BAKFlip tonneau (no link anywhere) or the ARB bull
bar (SUV, no link), and the commission disclosure above the list.

The importer's refusal paths were exercised too: a duplicate (part, vehicle), a
part that does not fit the vehicle, an unknown vehicle id and a vehicle row
without a URL were all reported and refused (exit 1); a quoted URL with a comma
was accepted.

Afterwards the branch was cleaned: 0 temporary builds, 0 rows in
`part_vehicle_links`, 0 parts with a link, 0 click rows — back to 6 vehicles /
24 parts / 18 presets and its 13 pre-existing builds.

## Order of operations that matters

The deployed code reads `part_vehicle_links`, so **the production DDL has to be
applied before the next deploy** — otherwise the redirect query fails. The
merge into `main` can happen first; the deploy cannot.

## Still open

- The **production DDL** (one `create table`, no data) — needs the user's OK.
- The **merge** of the branch into `main` — needs the user's OK per the repo's
  ask-first rule.
- **H1**: the user still has to pick the actual Amazon listings (per-vehicle
  Ford/GM rows for the six vehicle-specific parts). The template
  `scripts/parts-links.template.csv` has the example rows ready.

---

## Closing it out

With the user's OK:

- **Production DDL applied.** One `create table` over the direct URL
  (`ep-winter-frost-b1drw3en.c-5.eu-central-1.aws.neon.tech`) with `psql -1`.
  Both foreign keys and the composite primary key confirmed in
  `information_schema`. Production data untouched: 6 vehicles / 24 parts /
  18 presets, 0 affiliate links, 0 rows in the new table, 9 builds, 0 waitlist
  signups.
- **Merged into `main`** as `0036779` (branch `feat/cars-per-vehicle-links`,
  commit `c226605`).

The site is still gated on worker version `803df561`, so none of this is live
yet. The next deploy is now unblocked on the schema side — the DDL is in place
— but it also carries the store labels, the sub-ID tagging and the pickup
catalogue that are still waiting for the user's deploy go-ahead.
