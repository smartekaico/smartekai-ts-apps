# Spec 8 — Blog: buying guides that lead to builds and Buy buttons

**Date:** 2026-11-08 · **Status:** approved 2026-11-09 · **App:** `apps/cars-4by4-builder`
(overlander.smartekai.com)

## 0. Why now

The MVP app is done, and the job is visitors. Amazon closes the account without **3
qualifying sales by about late April 2027**. People searching "best lift kit for a 3rd-gen
Tacoma" are close to buying; the app can't rank for that on its own. Each article answers
one such search, then sends the reader to a matching build, Help me choose, or a Buy button.

## 1. Decisions (approved 2026-11-09)

| Question | Proposal |
|---|---|
| Where | `/blog` on the same domain, same app. Search authority builds on overlander.smartekai.com |
| Format | Markdown files in the repo, one per article; no CMS, no database |
| Publishing | A commit and a deploy. `draft: true` hides a post from the site and sitemap |
| Writing | **Claude drafts, the user reviews and approves each post.** Nothing publishes unapproved |
| Launch | **6 articles**, then about 1 a week |
| Products in articles | Shortcodes rendered from the live catalogue, so names, images and Buy links never go stale |
| Gemini | None by default. Reuse build photos and part illustrations. New images only with the user's OK |
| Hosting | Workers Free. Markdown is converted at **build time**: no parsing per request |

## 2. Content rules (Amazon, Google, honesty)

- **Disclosure at the top of every post**, before the first link: "This post contains affiliate
  links. As an Amazon Associate I earn from qualifying purchases." The footer line stays too.
- **No Amazon prices or star ratings in text.** Our catalogue estimates may appear, labelled "Est.".
- **No invented experience.** Never "we tested", "in our experience" or made-up reviews. Write
  from manufacturer specs, fitment data and widely known trade-offs, and say when something
  depends on trim, year or the installer.
- **Fitment caveats** wherever a product is vehicle-specific (trim, 4WD/2WD, bed length, CCD,
  Trail Boss/AT4/TRD exclusions), matching what our links actually point to.
- **Dated and maintained:** `updated` date shown; links checked before each publish with
  `links:check`.
- **Trademarks:** brand and model names are fine as plain text describing products; no logos.
- Links: `rel="sponsored nofollow"` on Buy links (the existing `/go` route does this).

## 3. Article format

`apps/cars-4by4-builder/content/blog/<slug>.md`:

```md
---
title: Best lift kits for a 3rd-gen Toyota Tacoma (2016–2023)
description: Leveling kit, 2–3" lift or 6"? What each does, what it costs, and what fits.
vehicle: tacoma-3g          # optional: links the post to a truck
category: suspension        # optional: armor | wheels_tires | overland | suspension | lighting
published: 2026-11-15
updated: 2026-11-15
draft: true
hero: build:tacoma-dune     # build:<slug> | part:<id> | none
---
```

Body: Markdown plus three shortcodes, each on its own line:

- `{{product id="bilstein-5100-shocks" vehicle="tacoma-3g"}}`: a product card from the
  catalogue: illustration, name, brand, "Est." price, install hours, fitment badge, and **Buy
  on Amazon** via `/go/<id>?vehicle=…`. No button when the part has no link for that vehicle.
- `{{build slug="tacoma-dune"}}`: a card with the build photo, name and total, linking to the
  build page.
- `{{cta vehicle="tacoma-3g"}}`: "Plan your Tacoma build" → `/build?vehicle=…&step=parts`, with
  Help me choose.

An unknown part id, build slug or vehicle **fails the build**, so a typo can't ship.

## 4. Pages

- `/blog`: newest first; title, description, date, vehicle tag. Filter by vehicle with
  `?vehicle=` (same tags as the gallery).
- `/blog/<slug>`: the post, with the disclosure, the hero, and at the end "Related builds"
  for its vehicle plus the CTA.
- Header: a "Guides" link. Home: a "Buying guides" strip with the 3 newest posts.

## 5. SEO

- `pageMeta()` per post: title, description, canonical, share image (hero).
- JSON-LD `Article` (headline, dates, image, publisher "Overlander Builder"). No `Review` or
  rating markup: we don't review products.
- `/blog` and every non-draft post in `sitemap.xml`, with `lastmod` from `updated`.
- Clean headings (one H1), descriptive alt text, internal links between related posts and to builds.

## 6. Launch set (6 articles)

Chosen to match what the catalogue and links already cover:

1. Best lift kits for a 3rd-gen Toyota Tacoma (2016–2023)
2. Leveling kit or full lift for a 2021+ Ford F-150?
3. 33" vs 35" tires on a Silverado 1500 or Sierra 1500: what you'll need to change
4. Bed rack and rooftop tent setups for full-size pickups
5. Building an overland Tacoma on a budget: under $2,000 and under $5,000
6. Light bars and LED pods: choosing, mounting and staying road-legal

Each: 1,200–2,000 words, 3–6 product cards, 1–2 build cards, one CTA.

## 7. Technical notes

- Build-time conversion: a small Vite plugin, or `import.meta.glob(…, { query: "?raw", eager:
  true })` processed in a plugin, turning each `.md` into a module that exports frontmatter and
  HTML. The Worker never parses Markdown. Shortcodes become placeholders that React fills from
  catalogue data loaded by the route.
- One server call per post page for the parts and builds it mentions; keep `/blog/<slug>` under
  10 ms CPU.
- Markdown is trusted (it's in the repo), but still escape anything shortcodes insert.
- Tailwind only scans `src/components` and `src/routes`; article typography styles live there.

## 8. Done when

- `/blog` and the 6 posts are live, each approved by the user, each with the disclosure, valid
  product cards and Buy links for the right vehicle, and no Amazon prices.
- Posts are in the sitemap with correct share tags, canonical URLs and Article JSON-LD.
- `/blog/<slug>` p50 CPU under 10 ms; no Gemini calls.
- Tested in a real browser at 375 px and desktop.

## Out of scope

A CMS or editor UI, comments, newsletter, RSS, translated posts, AvantLink products (until
approved), product reviews or ratings, Gemini-written images without approval.
