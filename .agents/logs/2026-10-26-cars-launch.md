# Cars: pushed, launched, and the first live buy click (2026-10-26)

## The push

`git push origin main` → `3ed3955..0be716c`, 49 commits up to GitHub
(`smartekaico/smartekai-ts-apps`). Requested by the user in this session. `main` is now in
sync with `origin/main`; the three Amazon-link commits (`add26b9`, `f3421f8`, `0be716c`)
were already on top and went up with it.

## The launch

`COMING_SOON` flipped to `"false"` in `apps/cars-4by4-builder/wrangler.jsonc` and deployed
→ **version `907678fb-b622-465d-abac-741e9a0fcdde`**. The gate is gone: `/` answers 200
with no `Retry-After`, no `no-store` and no `X-Robots-Tag`.

| Check (public, no cookie) | Result |
|---|---|
| `overlander.smartekai.com/` | **200**, 18 gallery cards |
| `cars.smartekai.com/` | 301 → new host |
| `/build` | 200 |
| `/sign-in` | 307 → `/sign-in?next=%2F` → 200 |
| `/sitemap.xml` | 200, 19 URLs |
| `/robots.txt` | 200 |
| queue producer/consumer, `:17` cron | re-attached unchanged |

## The buy click, on a truck build

`/builds/f-150-dune` shows all 5 parts with "Buy on Amazon ↗ (opens in a new tab)" and the
disclosure ("We may earn a commission when you buy through links on this site."). Clicking
the first one:

```
/go/nitto-ridge-grappler-35?build=69fdce69-987f-4337-b1ab-31f056220af6
  → https://www.amazon.com/dp/B01MAXN5R6?tag=smartekaiover-20
  → "NITTO Ridge Grappler All_Season Radial Tire-35x12.50R20LT F 125Q"
```

**`tag=smartekaiover-20` is present and it lands on the real product page.** No sub-ID
parameter is appended for Amazon — that is deliberate (`src/lib/subid.ts`: Amazon has no
equivalent, so attribution is the `outbound_clicks` row plus per-surface Associates IDs).

The per-vehicle split is live too — the same part, two trucks, two ASINs:

| part | F-150 | Silverado 1500 |
|---|---|---|
| Rough Country 6" lift | `B0DDLKC82L` | `B07ZQQZPQQ` |
| Method 701 wheels | `B07HFKGQNM` | `B07XVQD6BG` |

The six synthetic `outbound_clicks` rows these checks created were deleted afterwards (the
table was empty before), so the first real click starts from zero.

## The gap the launch exposes

**12 of the 24 parts have no link**, so they render no Buy button at all. Six have a
default link (the universal ones: cube pods, 40" bar, winch, RTT, tyres), six have
per-vehicle links (shocks, both lift kits, wheels, tonneau). Unlinked: the ARB armour trio,
Ironman rock sliders and snorkel, the Smittybilt sliders, the ARB 270 awning, the Front
Runner rack, both Ironman tents, the OME shocks and the Leitner bed rack.

That is not evenly spread — the **trucks are nearly complete and the SUVs are not**:

| preset family | buyable parts |
|---|---|
| F-150 / Silverado / Sierra — all three presets | **4–5 of 5** |
| Land Cruiser / Patrol / Wrangler — dune | 2 of 5 |
| Land Cruiser / Patrol / Wrangler — overlander, trail | 2 of 6 |

The **featured hero card is the Land Cruiser**, so the most prominent build on the site
currently leads to a page where 4 of its 6 parts cannot be bought. Filling the SUV rows is
the single highest-value follow-up.

## Also noted

- **The payment test is dropped** on the user's instruction ("forget payment test now").
  `NOWPAYMENTS_ENV` is `"live"`, so any real purchase now credits the production ledger
  with no rehearsal behind it — the "`confirmed`/`finished` → `credited`" transition is
  still unobserved.
- The **rehearsal branch DB has 0 links** (they were written to production only), so local
  dev shows no Buy buttons. Re-running `parts:links` against the branch is a two-minute
  fix if that becomes annoying.
- The site is now **publicly indexable**; the legacy host keeps its 301.

## Follow-ups the user approved ("ok go")

**The rehearsal branch DB now matches production.** `npm run parts:links` against the
`cars-credits` branch (`ep-wild-bar-b1pi4db8`) wrote the same CSV: **6 default links + 18
per-vehicle rows, 12 parts still unlinked** — identical to production. Before this the branch
had 0 links, so local dev showed no Buy buttons at all. Production was not touched by this run.

**`git push` no longer needs a prompt.** Added to the global OpenCode config
(`~/.config/opencode/opencode.json`), in the V2 `permissions` array:

```json
{ "action": "shell", "resource": "git push *", "effect": "allow" }
```

The rule is narrow — `git push`, `git push origin main`, `git push --force-with-lease` match,
nothing else does — and the pre-edit file is kept as `opencode.json.bak-20261026-021908`.
Config reloads without a restart. No repository file changed, so this is a local preference
rather than something the other agents inherit from the repo.
