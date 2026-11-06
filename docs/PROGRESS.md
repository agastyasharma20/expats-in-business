# Progress log

| Milestone                  | Status                     | Branch / tag                          | Notes                                            |
| -------------------------- | -------------------------- | ------------------------------------- | ------------------------------------------------ |
| M1 Scaffolding and tooling | built; DB verified on 5433 | feat/m01-scaffold → v0.1.0 (proposed) | Waiting on the user's own `npm run setup` re-run |

## Log

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
