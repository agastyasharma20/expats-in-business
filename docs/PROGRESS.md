# Progress log

| Milestone                  | Status                           | Branch / tag                          | Notes                                                             |
| -------------------------- | -------------------------------- | ------------------------------------- | ----------------------------------------------------------------- |
| M1 Scaffolding and tooling | built; waiting on the Docker run | feat/m01-scaffold → v0.1.0 (proposed) | Fresh-clone `npm run setup` still needs a run with Docker Desktop |

## Log

### 2026-11-06 · M1 Scaffolding and tooling

**Built**

- Next.js 16.4.5 (App Router, Cache Components, TS strict, `@/*` alias, no src dir) with next-intl (`app/[locale]`, en/pl/uk; pl/uk fall back to en).
- Tailwind v4 + shadcn/ui (Radix), with semantic variables mapped to the EiB tokens in `app/globals.css`. 15 components in `components/ui`, plus Toaster and TooltipProvider in the root layout.
- Prettier with the tailwind plugin, ESLint (Next + prettier, `no-explicit-any`), EditorConfig.
- Prisma 7.10.1: `prisma.config.ts`, `@prisma/adapter-pg`, client in `generated/prisma`. Country and Chapter models, the first migration, an idempotent base seed (Poland; Kraków live, Warsaw launching), and the `lib/db.ts` singleton with a never-throwing `isDatabaseReachable()`.
- `lib/env.ts`: a Zod schema that matches `.env.example` key for key (a test enforces this). Only Stripe test keys are accepted, the placeholder auth secret is rejected, and `SKIP_ENV_VALIDATION` exists for CI. `config/features.ts` holds feature flags (FEATURE_*).
- `scripts/setup.mjs`: Node ≥ 24 and Docker checks with fix hints, `npm ci`, creates `.env` from `.env.example` with a random auth secret (an existing `.env` is never read), `docker compose up -d --wait`, generate, migrate, seed. `--no-docker` mode for `setup:nodocker`.
- Every npm script from the brief. Later ones (`lighthouse`, `demo:reset`, `embed`, `jobs`, `stripe:listen`) print their milestone and exit 0.
- `/api/health` → `{ status: "ok", db }`. A temporary home page shows "EiB platform: Milestone 1" and the live DB status (text, not only colour).
- Tests: 9 Vitest unit tests (env parsing, key parity with `.env.example`, feature flags). Playwright e2e at 1440 and 375 px: home loads with no console errors, no serious axe violations, health endpoint.

**How to test**

1. Start Docker Desktop, then `npm run setup` and `npm run dev` → http://localhost:3000 shows "Database: connected".
2. `npm run check` · `npm run e2e` · `npm run build`.

**Verified so far (Docker not running)**: `npm run check` green; `npm run build` green with SKIP_ENV_VALIDATION, as in Bitbucket CI; `npm run e2e` 6/6 against both `next dev` and the production server (DB shown as not reachable); setup prints the "Docker not running" fix.

**Known gaps**

- Not yet run: the full `npm run setup` (migrate + seed) and the "Database: connected" state.
- GitHub CI has no Mailpit service yet; it's needed from M4 (magic links).
- On a cold `next dev`, parallel first requests can race the compiler; `tests/e2e/global-setup.ts` warms the routes first.
- favicon is still the Next.js default; replaced in M2.

**Old portal bugs fixed**: none yet; this milestone is infrastructure.
