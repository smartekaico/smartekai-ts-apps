# UI Design Pass & Real Catalog Data — Design

Source: brainstorming session 2026-09-12, following up on the AI customizer pivot
(`2026-09-05-ai-customizer-pivot-design.md`), whose backend pipeline is now fully built
and verified against real services. This spec covers two independent, related pieces:
a visual design pass on the existing screens, and replacing fabricated catalog data
(`affiliateUrl`/`imageUrl`) with real values. **PDF export and save/claim account UI are
explicitly out of scope** — already implemented (PDF) or deferred (account UI) per prior
decisions.

## 1. What exists today

Five screens, all functional (backend verified end to end this session), all visually
plain — generic shadcn-purple theme tokens, bare HTML elements, no header/branding at
all in the site shell:

- `src/routes/__root.tsx` — page shell, currently just `<body>{children}</body>`, no
  header, no wordmark.
- `src/routes/index.tsx` + `src/components/PartsSelectionGrid.tsx` — Step 1, upgrade
  selection. Text-only cards (name, brand, price), no product images.
- `src/routes/upload.tsx` + `src/components/PhotoDropzone.tsx` + `src/components/
  Toast.tsx` — Steps 2-4, photo upload, validation-error toast, static "Generating…"
  text during the ~2-minute Gemini call.
- `src/routes/builds/$sessionId.tsx` + `src/components/BeforeAfterSlider.tsx` — Step 5,
  the report page: before/after slider, BOM table, advisory notes, PDF download, share
  button.

`apps/cars-4by4-builder/src/seed/parts.ts` holds 26 hand-curated parts; every
`affiliateUrl` and `imageUrl` is a plausible-looking but fabricated placeholder (flagged
at the time it was written) — not real product pages or hosted images.

## 2. Visual design system

**Direction: rugged/outdoor**, matching the product's actual subject matter (ARB/Ironman-
style off-road gear) rather than a generic SaaS look.

- **Palette** — replaces the current shadcn-purple tokens in `src/styles.css` entirely:
  - `--background`: deep charcoal, not pure black (e.g. `24 8% 10%` in HSL — warm-toned
    dark, not a cold gray).
  - `--foreground`: off-white (e.g. `30 15% 92%`).
  - `--primary` (accent): warm amber/orange (e.g. `28 85% 52%`) — used for primary
    buttons, selected-state rings, links, the "Generating…" indicator.
  - `--card`/`--muted`/`--border`: slightly lighter charcoal steps, keeping the whole UI
    in the dark register (this is a dark-themed app by design, not a dark-mode variant of
    a light default).
  - `--destructive`: keep close to the existing red — off-road/warning red reads fine
    without changing hue, just needs to work against the new dark background.
- **Typography** — Inter stays (already loaded via `@fontsource-variable/inter`) for body
  text. Headings get heavier weight (700-800) and tighter letter-spacing to read as
  product UI, not dashboard UI — no new font load needed, Inter Variable already supports
  the weight range.
- **Texture** — a single subtle treatment, not applied everywhere: a faint diagonal-line
  or grain pattern as a background layer behind the Step 1 hero area and the upload
  dropzone's empty state. CSS-only (`background-image` with a repeating gradient or a
  small inline SVG pattern), no image asset needed. Explicitly NOT applied to the report
  page's BOM table or anywhere text-dense — keeps it from feeling busy.
- **Primitives unchanged structurally** — `@smartekai/ui`'s `Button`/`Card`/`Input`/
  `Label` read `--primary`/`--background`/etc. via CSS variables already (confirmed in
  `packages/ui/src/button.tsx`), so they pick up the new palette automatically with zero
  changes to that package. The restyle work is entirely in this app's own Tailwind
  classes and its four local components.

## 3. Screen-by-screen treatment

### Shell (`__root.tsx`)
Add a minimal top bar: wordmark text (e.g. "4x4 AI Customizer" or similar — reuse the
`<title>` text already set in `head()`), no navigation links needed (this is a single
linear flow, not a multi-page app with things to navigate between). Sits above
`{children}` in `RootDocument`.

### Step 1 — Selection (`index.tsx` + `PartsSelectionGrid`)
- Cards gain a real thumbnail image (top of card, `aspect-video` or similar fixed ratio,
  `object-cover`), sourced from the now-real `imageUrl` field.
- Category filter row becomes a more tactile pill/tab treatment (rounded-full, clear
  active state) rather than plain `Button` variants stacked flat.
- Selected-card state: amber ring (already present as `ring-primary` via the existing
  `cn(..., isSelected && "ring-2 ring-primary")` — just needs the new amber `--primary`
  to land correctly) plus a subtle scale/shadow lift, not just a ring color change.

### Steps 2-4 — Upload & generation (`upload.tsx` + `PhotoDropzone` + `Toast`)
- `PhotoDropzone`: replace the plain dashed-border box with a more deliberate empty
  state — an icon (upload/camera glyph, inline SVG, no icon library needed since
  `lucide-react` is already a dependency), clearer visual hierarchy between the primary
  instruction and the angle-guidance copy (currently both the same size/weight).
- Generating state: replace the static "This can take up to 30 seconds" text with an
  actual loading indicator (a simple CSS spinner or pulsing element is enough — no new
  dependency; this call can run ~2 minutes in practice per this session's verification,
  so the copy should say something less specific than "30 seconds", e.g. "This can take
  a minute or two").
- `Toast`: restyle to match the new palette (currently hardcoded `bg-destructive`, which
  will already shift with the token change, but the layout/shadow could use polish).

### Step 5 — Report (`$sessionId.tsx` + `BeforeAfterSlider`)
This is the payoff screen and gets the most attention:
- `BeforeAfterSlider`: heavier visual treatment on the drag handle (currently a plain
  1px-wide white bar) — a real handle affordance (small circular grip), stronger drop
  shadow on the divider line.
- BOM table: restyle from a bare `<table>` to a more considered layout — likely keep
  `<table>` semantics (it IS tabular data) but with real row padding, a header treatment
  that doesn't look like default browser styling, and per-row hover state.
- Advisory notes: add iconography (a warning triangle / info circle, inline SVG or
  `lucide-react`, which is already a dependency) instead of relying on background-color
  alone to distinguish warning vs. info.

## 4. Real catalog data

You supply real `affiliateUrl` and `imageUrl` values per part by editing
`apps/cars-4by4-builder/src/seed/parts.ts` directly — no new tooling, it's already a
plain, readable array. The implementation plan will:
1. Add a clear marker (e.g. a `// REPLACE:` comment or a distinct placeholder string
   pattern) on every fabricated URL currently in that file, so it's unambiguous which
   values still need real ones.
2. Include an explicit step where you fill those in (a task I can't complete myself —
   I don't have real ARB/Ironman/Method Wheels product URLs or hosted images to give
   you).
3. Re-run `npm run db:seed --workspace=apps/cars-4by4-builder` to push the real values
   into `DATABASE_NEONDB_SMARTEKAI` (the `onConflictDoUpdate` upsert already in that
   script means re-seeding is safe to run repeatedly as you fill in more real URLs over
   time — partial progress works, not all-or-nothing).

No schema change needed — `parts.affiliateUrl`/`imageUrl` already exist as plain `text`
columns.

## 5. Explicitly out of scope

- PDF export (already implemented, Task 18).
- Save/claim account UI (backend exists via Better Auth; no UI planned this round).
- OAuth, email OTP (deferred per the original pivot spec, unchanged).
- A CMS or admin UI for managing catalog data — direct file editing is the mechanism for
  now, matching the existing hand-curated-seed-data approach.
- Any new image-hosting pipeline for the real thumbnails — `imageUrl` is just a plain URL
  string; if you host real images yourselves (Neon Object Storage, a CDN, wherever), any
  publicly-reachable URL works, no upload flow needed here.
