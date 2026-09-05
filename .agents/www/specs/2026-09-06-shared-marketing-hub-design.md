# Shared Marketing Hub (`apps/www`) — Design

## Context

Today, marketing/landing pages are distributed: `medical-os` renders its own
home page via `@smartekai/marketing`'s `MarketingLandingPage`; `legal-os`
hasn't adopted that component yet. There's no single public entry point that
introduces the product line before a visitor picks one and logs in.

## Goal

A new app, `apps/www`, serves as the single public-facing home + product
showcase, with each product's page linking out to that product's own
login/signup.

**Legal OS is excluded from this build.** It's getting its own update
separately; adding it to `apps/www` now would mean either showcasing an
experience that's about to change, or redoing the page shortly after. Add it
as a normal `status: "live"` entry once that update lands — no special
handling needed then, just a new config entry.

## Decisions (from brainstorming)

- **New dedicated app** (`apps/www`), not a distributed extension of existing
  per-app home pages and not one existing app absorbing the role. Matches
  Turborepo's own canonical scaffold (`create-turbo@latest` ships
  `apps/web` + `apps/docs` as separate apps sharing `packages/*`) and this
  repo's existing pattern (`legal-os`/`medical-os` already separate, sharing
  `packages/*`).
- **Stack:** TanStack Start (matches medical-os's current stack and the
  performance/DX reasoning behind that migration).
- **i18n:** English-only for now. Arabic (or any other language) gets added
  later per-app, the same way legal-os already has it — not an
  apps/www-wide decision made up front.
- **Products included at launch:** Medical OS (live) and 4by4 Builder
  (coming-soon), despite 4by4 Builder targeting a different audience
  (consumer/enthusiast vs. B2B legal/medical) — one unified brand umbrella
  per the user's explicit call. **Legal OS is deferred** — see Context.
- **Login/signup:** separate per app, no SSO. `apps/www` links out to each
  product's own `/login` and `/signup` via env-var-configured absolute
  URLs. Building real cross-app SSO (shared cookie domain, Better Auth
  cross-subdomain config) is explicitly out of scope — a separate future
  project if wanted.
- **Visual system:** implements `DESIGN.md`'s Apple-style tokens (Action
  Blue `#0066cc`, SF Pro Display/Text with Inter as the web fallback,
  alternating light/dark full-bleed product tiles) fresh, **local to
  `apps/www`** — not added to `packages/marketing`. `packages/marketing`'s
  existing indigo/slate components stay as they are for medical-os (and
  legal-os whenever it adopts them). Sharing the new visual system before a
  second consumer needs it would be speculative; extract to a package only
  when `legal-os` or `medical-os` actually adopts the Apple look too.
- **Copy is out of scope for this spec.** Per `WORKFLOW.MD`'s own principle
  ("copy needs its own spec — voice, claims, length, language"), this
  design covers structure (what fields a product entry has, what sections a
  page renders), not the actual headlines/feature copy for any of the three
  products. That's a separate content pass, reviewed on its own terms.
- **Shared packages beyond this project:** the user separately floated
  `packages/dashboard` and `packages/chatbot-workspace` as future shared
  packages once a second app duplicates those patterns. Confirmed as a
  forward-looking note only — not built as part of this work (see
  project memory `project_future-shared-packages`). `apps/www` is a public
  marketing site; it has no dashboard or chat UI to share.

## Architecture

### Routes

- `/` — home: brand hero, platform-value section, a 2-tile product
  showcase (Medical OS / 4by4 Builder), footer.
- `/products/medical-os` — full feature page for Medical OS.
- `/products/4by4-builder` — full feature page for 4by4 Builder.

`/products/legal-os` is not built now — adding a third `ProductEntry` and
route later, once Legal OS's update lands, is a same-shape follow-up, not a
rework of this app.

Each product page ends in CTAs to that product's login/signup.

### Product data model

A single typed config drives both the home page's showcase tiles and each
`/products/*` page — not hardcoded JSX per page:

```ts
interface ProductEntry {
  slug: "medical-os" | "4by4-builder"; // extend with "legal-os" later
  name: string;
  tagline: string;
  features: { title: string; description: string }[];
  status: "live" | "coming-soon";
  loginUrl?: string;   // required when status === "live"
  signupUrl?: string;  // required when status === "live"
}
```

- `status: "coming-soon"` renders a disabled/"Coming soon" CTA instead of a
  broken login link — 4by4 Builder isn't deployed yet.
- `loginUrl`/`signupUrl` come from environment variables (e.g.
  `VITE_LEGAL_APP_URL`, `VITE_MEDICAL_APP_URL`), never hardcoded domains, so
  dev/staging/prod can point at different places without a code change.

### Visual components

New, local to `apps/www/src/components/`: header, hero, product-tile
(light/dark/parchment variants per `DESIGN.md`), footer. Built against
`DESIGN.md`'s token values directly (colors, typography scale, spacing,
border-radius) — Inter as the display/body font (per `DESIGN.md`'s own "Note
on Font Substitutes" section, since SF Pro isn't available off-Apple
platforms).

### Deployment

Same proven pattern as medical-os's TanStack Start migration: Vite + Nitro
`node-server` build, `turbo prune apps/www --docker` Dockerfile, new Dokploy
application. Root-domain vs. subdomain routing for `apps/www` vs. the three
product apps is a Dokploy/DNS decision at deploy time, not decided here.

## Out of scope

- Legal OS's product page/showcase entry — deferred until its own separate
  update lands, then added as a same-shape `ProductEntry`.
- Cross-app SSO.
- Actual marketing copy for any of the three products (separate content spec).
- Retrofitting the Apple-style visual system onto `legal-os`/`medical-os`.
- `packages/dashboard`, `packages/chatbot-workspace` (forward-looking note
  only, see project memory).
- 4by4 Builder's own build (tracked separately in
  `.agents/4by4-builder/`; `apps/www` only needs a feature page and a
  "coming soon" state for it).
