# Progress log

| Milestone                  | Status                        | Branch / tag                               | Notes                            |
| -------------------------- | ----------------------------- | ------------------------------------------ | -------------------------------- |
| M1 Scaffolding and tooling | done                          | develop · v0.1.0                           |                                  |
| M2 Brand and design system | done; reviewer approved       | develop · v0.2.0 (local)                   |                                  |
| M3 Layout and navigation   | done                          | develop · v0.3.0                           |                                  |
| M4 Data, seed, guides      | done; reviewer findings fixed | feat/m04-m05-data-home · v0.4.0            |                                  |
| M5 Homepage                | done                          | feat/m04-m05-data-home → v0.5.0 (proposed) | Lighthouse mobile 99/100/100/100 |

## Log

### 2026-11-10 · M4 + M5 Data, seed, guides and homepage (one branch, two tags)

**M4 built**

- **Schema:** every model in brief section 5 plus Better Auth's core tables.
  - cuid2 ids, money in minor units, chapterId/countryCode.
  - Lookup tables for formats, industries, goals and provider categories.
  - pgvector with an HNSW cosine index on `GuideChunk.embedding`.
  - Chapter deletes never cascade into tickets, payments or sponsorships.
- **Seed:** a base layer (real configuration, upserted) and a demo layer (fixed faker seed, `isDemo`, replaced on each run).
  - 120 members including the 6 demo accounts, and 8 Bubbles of 7+ members with leads.
  - 30 providers, and 24 past + 6 upcoming events with 575 check-ins, demo sponsors and labelled placeholder photos.
  - 160 connections and 140 chapter votes across 12 cities.
- **`npm run demo:reset`:** 2–8 s, timing logged. Output is identical for a pinned `SEED_REFERENCE_DATE`.
- **8 Poland guides** (`content/guides/pl`): PESEL, trusted profile, MOS, banking, NFZ, ZUS, KSeF and the Kraków Information Point.
  - Every statement is from an official page opened on 10 Nov 2026; anything unverified is a visible TODO.
  - `lib/content/guides.ts` only allows official https sources, enforced by tests.
- **Libraries:** `lib/money.ts` and `lib/time.ts` (Intl-based, safe across daylight-saving changes), with unit tests.

**M5 built**

- **Homepage from the database:**
  - Hero with an original line-drawn Kraków skyline (8 paths, CSS stroke draw).
  - Stats strip: the 35+ sessions fact, plus database counts tagged "Demo data".
  - Next 3 events as equal-height cards (chapter timezone, venue, places, price).
  - How it works, a Bubbles teaser (5+ members only) and a chapters strip with the most requested cities.
  - Partner tiles reading "permission pending", labelled placeholder testimonials and a Deep Teal CTA.
- **SEO:** Organization JSON-LD from verified facts, and a per-locale OG image.
- **`npm run lighthouse`:** mobile audit against a production server. Result on `/`: **Performance 99, Accessibility 100, Best Practices 100, SEO 100**; LCP 0.9 s, CLS 0, TBT 100 ms.
- **JS:** the homepage's own client JS is about 54 kB gzipped, under the 150 kB budget. Total first-load JS is 194 kB, including about 139 kB of Next.js and React baseline.

**Fixed along the way**

- **Cached failures:** cached queries swallowed errors, so a failure was cached as "no data", even across restarts. Loaders now throw (nothing is cached), and wrappers fall back to empty states and log.
- **Hero hidden until hydration:** hero text and CTAs were invisible until JavaScript loaded (Motion's initial state). They're now CSS keyframes, and the h1 only moves, so LCP is text.
- **Negative counter numbers:** StatCounter showed negative numbers mid-count, because the rAF timestamp came before `performance.now()`.
- **Lost border:** `buttonVariants` on links lost the outline border (cva doesn't merge classes).
- **OG image 500:** route handlers can't read `next/root-params` yet.
- **Review findings:** the reviewer subagent's guide and schema findings (see the fix(m04) commit).
- **Stale processes:** orphaned `migrate dev`, `next dev` and `next start` processes from earlier runs held a Prisma lock and served stale builds. They're cleaned up, and their database sessions were ended.

**How to test**

1. `npm run demo:reset`, then `npm run dev`, then open http://localhost:3000.
2. `npm run check` (118 unit tests) · `npm run build` · then:
   - `npx next start -p 3200`
   - `E2E_BASE_URL=http://localhost:3200 CI=1 E2E_EXPECT_DB=true npx playwright test` (70 tests)
   - `CRAWL_BASE_URL=http://localhost:3200 npm run crawl` (36 pages)
   - `LH_BASE_URL=http://localhost:3200 npm run lighthouse`

**Known gaps**

- The guides have TODOs. Banking's source is from 2017; health insurance via employment is still unsourced; the Information Point's details come from a January 2024 page.
- Guides have no pages or embeddings yet (/guides is coming soon); those arrive with the concierge milestone.
- Event cards link to the Events coming-soon page until event pages exist.
- Some event-format durations and descriptions in the base catalogue are editable defaults, not EiB facts.

### 2026-11-10 · M3 Layout, navigation, legal pages and crawler

**Built**

- **Catalogues:** pl and uk message files copied from en and marked `_status: TODO`. `npm run messages:sync` fills new keys, and a unit test keeps all three key-for-key.
- **Config:** `config/facts.ts` holds the verified contact and social links, taken from the EiB Connect page and sourced in FACTS.md. `lib/nav.ts` is the single source for the header, mobile menu and footer, with tests for duplicate hrefs and labels (old bug 11).
- **Header:** sticky, and shrinks on scroll with transforms only. Desktop nav marks the current page (aria-current). Below 1024 px a mobile Sheet takes over. Also a skip link and one `<main>` landmark.
- **Switchers:**
  - Chapter switcher: Global, Kraków (live) and Warsaw (launching) from the database, behind Suspense, saved by a validated server action.
  - Language switcher: en, pl and uk.
- **Footer:** Deep Teal, with nav columns, contact, Messenger, WhatsApp and the four social links, plus white focus rings. That adds the on-dark focus-ring pair carried over from the M2 review.
- **Coming-soon pages:** Events, Members, Providers, Guides, Pricing and Sign in, each with two working actions.
- **Legal:** `/legal/privacy`, `/legal/terms` and `/legal/cookies` come from MDX through shared prose components, with the "Draft: to be reviewed by a lawyer" banner. They contain no invented entity or address, only labelled TODOs (old bug 8).
- **404 and error pages:** styled 404 inside and outside a locale, plus `error.tsx` (retry) and `global-error.tsx`.
- **Home:** the milestone home links to `/styleguide` in development and demo mode.
- **Crawler:**
  - `npm run crawl`: link crawler.
  - `tests/e2e/crawl.spec.ts`: every nav and footer route in 3 locales with axe, click-every-button, no raw markdown, safe external links, 404.

**Fixed along the way**

- **Cached MDX:** the legal pages crashed when external links rendered inside `"use cache"`, because next-intl fell back to `headers()`. Translations there now take an explicit locale.
- **Unstyled email links:** raw JSX `<a>` in MDX skipped the styled mapping, so email links were unstyled (bug class 2). Fixed with `<ContactEmail />`.
- **Footer wrapping:** the footer contact column wrapped the email mid-word, so it's wider now.
- **Route group:** renamed `(dev)` to `(tools)`, because `next dev` resolved `/styleguide` to the new catch-all.
- **E2E stalls:** with 6 workers, e2e navigations stalled behind queued prefetches. CI now uses 2 workers, and the full suite takes 1.6 minutes.
- **Two broken commits:** `ef8064f` went in with typecheck errors because the command chain didn't stop on a failed check. The next commit fixed it, and every commit is now gated on `npm run check`'s exit code.

**How to test**

1. `npm run dev`, then try / at 1440 and 375 px:
   - the header nav and its active state
   - the mobile menu
   - Chapter → Kraków (a toast appears and the label changes)
   - Language → Polski
   - the footer links
   - /legal/privacy
   - /anything for the 404
2. `npm run check` (96 unit tests) · `npm run crawl` (needs a running app) · `npm run build`, then `PORT=3100 CI=1 E2E_EXPECT_DB=true npm run e2e` (64 tests).

**Verified**

- `npm run check` green.
- `npm run crawl` green: 33 pages, no broken or duplicate links, no unsafe external links.
- e2e 64/64 against a production build with the database.
- Screenshots reviewed at 1440 and 375 px.

**Known gaps**

- pl and uk UI text is still English (until M15). Legal drafts are English-only and say so.
- The chapter choice is stored but changes nothing else yet; chapter pages come later.
- Events, Members, Providers, Guides, Pricing and Sign in are coming-soon pages.
- In dev, every 404 logs a Next "Could not validate `instant`" console error from the catch-all. It doesn't appear in production.

**Old portal bugs addressed**: 8 (legal pages render, no raw markdown), 11 (single nav source, duplicates tested), 2 (external links styled and safe everywhere, including MDX).

### 2026-11-07 · M2 Brand and design system

**Built**

- Brand extraction from expatsinbusiness.org and /eib-connect/ at 1440 and 375 px (computed styles, Elementor globals, canvas pixel samples). Evidence and recommendation in `docs/brand/BRAND.md`, plus 4 screenshots.
- Logo and monogram originals in `docs/brand/source/`. Web sizes plus a white logo for teal backgrounds via `scripts/brand-assets.mjs`. EiB monogram as `app/icon.png` and `app/apple-icon.png` (the Next.js default favicon is removed).
- Tokens in `app/globals.css`: teal family, ember, neutrals, status and tints, radius 8/12/20/pill, card and raised shadows, type scale, motion durations and easing, shimmer. Fonts: Cabin and Nunito Sans via `lib/fonts.ts`.
- shadcn components restyled:
  - 44 px targets, 16 px inputs, visible focus outline, translated "Close" labels.
  - Buttons: primary, highlight, secondary, outline, ghost, destructive and link.
  - Badges: verified, founding, demo, unconfirmed and bubble.
  - Equal-height Card, and a `Field` that wires label, hint and error.
- New: `ExternalLink`, `EmptyState` (an action is required), shimmer `Skeleton`.
- `components/motion`: MotionProvider (reduced motion, LazyMotion), Reveal, StatCounter, SuccessCheck, PageTransition (animates client-side navigations only).
- `/styleguide` (development and demo only): palette, a computed contrast table (26 pairs, all pass), type, buttons, cards, badges, fields with errors, empty and loading states, motion demos.

**Fixed along the way**

- **Proxy matcher:** `"\."` lost its backslash, so only `/` was locale-routed and every other unprefixed path returned 404. Fixed, and covered by e2e.
- **Button text colour:** `cn` dropped text colours next to custom font-size classes, so primary buttons showed dark text. Fixed with a configured `cn` and a lint rule.
- **Contrast:** the input border token failed 3:1 (2.93), so it was darkened to 3.57.
- **Mobile overflow:** the contrast table caused sideways scroll at 375 px (absolutely positioned sr-only text), and axe flagged the scroller as not keyboard-focusable. Both fixed.

**How to test**

1. `npm run dev`, then open http://localhost:3000/styleguide. Tab through the buttons, try reduced motion in the OS settings, and resize to 375 px.
2. `npm run check` (75 unit tests) · `npm run build` · `npm run e2e` (18 tests at 1440 and 375 px).

**Verified**

- `npm run check` green.
- Production build: e2e 18/18 with the database (`PORT=3100 CI=1 E2E_EXPECT_DB=true npm run e2e`).
- Screenshots reviewed at 1440 and 375 px.

**Known gaps**

- Styled 404 and error pages (listed under M2 in BUILD_PLAN, not in the M2 prompt) move to M5 with the public pages.
- Against a dev server that has been running for hours, the parallel desktop e2e run can stall during route compilation. A fresh dev server or the production run passes.
- The vector logo source is still needed from EiB. The live site's own logo `<img>` points at a dead staging host (tell Ziyan).
- When the Playwright MCP screenshots a page, it injects `caret-color` into inputs, which shows up as a hydration warning. That's tooling, not app code; the e2e console check is clean.

**Review** (reviewer subagent): the first pass blocked on button hover colours not being tokens and on missing contrast pairs. Both were fixed in 8c9d03f (36 pairs, all passing). Second pass: "Ready to merge" and "Brand consistency: approved".

**Carried forward**

- **BLOCKING for the milestone that builds the teal header and footer (M3 or M5):** add an on-dark focus-ring token. brand-700 on brand-950 is only 1.93:1.
- StatCounter: one frame of the final value before the count-up when the counter is already on screen at load.
- SuccessCheck: the live region mounts already filled, so some screen readers skip it.
- The proxy matcher skips any path containing a dot (matters for future slugs such as `/guides/visa-1.2`).
- `lib/dev-tools.ts` has no unit test, and the gate is decided at build time.

**Old portal bugs addressed**: 2 (styled external links via `ExternalLink`), 12 (the equal-height `Card` variant is ready for event cards in M7).

### 2026-11-06 · M1 Scaffolding and tooling

**Built**

- Next.js 16.4.5 (App Router, Cache Components, TS strict, `@/*` alias, no src dir) with next-intl (`app/[locale]`, en/pl/uk; pl/uk fall back to en).
- Tailwind v4 + shadcn/ui (Radix), with semantic variables mapped to the EiB tokens in `app/globals.css`. 15 components in `components/ui`, plus Toaster and TooltipProvider in the root layout.
- Prettier with the tailwind plugin, ESLint (Next + prettier, `no-explicit-any`), EditorConfig.
- Prisma 7.10.1: `prisma.config.ts`, `@prisma/adapter-pg`, client in `generated/prisma`. Country and Chapter models, the first migration, an idempotent base seed (Poland; Kraków live, Warsaw launching), and the `lib/db.ts` singleton with a never-throwing `isDatabaseReachable()`.
- `lib/env.ts`: a Zod schema that matches `.env.example` key for key (a test enforces this). Only Stripe test keys are accepted, the placeholder auth secret is rejected, and `SKIP_ENV_VALIDATION` exists for CI. `config/features.ts` holds feature flags (FEATURE_*).
- `scripts/setup.mjs`: Node ≥ 24 and Docker checks with fix hints, `npm ci`, creates `.env` from `.env.example` with a random auth secret (an existing `.env` is never read), a port check (5433, 1025, 8025) that names the conflicting program, `docker compose up -d --wait`, generate, migrate, seed. `--no-docker` mode for `setup:nodocker`.
- Every npm script from the brief. Later ones (`lighthouse`, `demo:reset`, `embed`, `jobs`, `stripe:listen`) print their milestone and exit 0.
- `/api/health` → `{ status: "ok", db }`. A temporary home page shows "EiB platform: Milestone 1" and the live DB status (text, not only colour).
- Tests: 9 Vitest unit tests (env parsing, key parity with `.env.example`, feature flags). Playwright e2e at 1440 and 375 px: home loads with no console errors, no serious axe violations, health endpoint.

**How to test**

1. Start Docker Desktop, then `npm run setup` (the Docker database is on host port **5433**) and `npm run dev` → http://localhost:3000 shows "Database: connected".
2. `npm run check` · `npm run e2e` (set `E2E_EXPECT_DB=true` to also require a connected DB) · `npm run build`.

**Verified**: with Docker on 5433, `prisma migrate deploy` and the seed (twice, idempotent) work, and `npm run e2e` with `E2E_EXPECT_DB=true` passes 6/6. Without a DB: `npm run check` green; `npm run build` green with SKIP_ENV_VALIDATION, as in Bitbucket CI; `npm run e2e` 6/6 against both `next dev` and the production server (DB shown as not reachable); setup prints the "Docker not running" fix.

**Known gaps**

- The first setup run failed with P1000: a stray `postgres.exe` (from another tool) was on localhost:5432. The fix moved the Docker DB to host port 5433 and added a port check to setup. A `.env` created before the fix still says 5432: delete it and re-run setup.
- GitHub CI has no Mailpit service yet; it's needed from M4 (magic links).
- On a cold `next dev`, parallel first requests can race the compiler; `tests/e2e/global-setup.ts` warms the routes first.
- favicon is still the Next.js default; replaced in M2.

**Old portal bugs fixed**: none yet; this milestone is infrastructure.
