# Progress log

| Milestone                  | Status                  | Branch / tag                        | Notes |
| -------------------------- | ----------------------- | ----------------------------------- | ----- |
| M1 Scaffolding and tooling | done                    | develop · v0.1.0                    |       |
| M2 Brand and design system | done; reviewer approved | feat/m02-design → v0.2.0 (proposed) |       |

## Log

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
