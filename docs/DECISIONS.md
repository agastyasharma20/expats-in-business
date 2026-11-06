# Decisions (newest first)

- 2026-11-06 · Versions pinned exactly (.npmrc save-exact). TypeScript 6.0.3, not 7, because typescript-eslint supports < 6.1. Prisma 7.10.1, because npm's "latest" tag points at an 8.0 release candidate. jsdom 29, because 30+ needs Node ≥ 24.15. ESLint 9, as chosen by create-next-app 16.4.
- 2026-11-06 · Next 16.4 defaults kept: Cache Components and Partial Prefetching on. Request-time data goes inside <Suspense> after `connection()`.
- 2026-11-06 · i18n: next-intl with `localePrefix: "as-needed"` (English at /, /pl and /uk prefixed). The default locale comes from DEFAULT_LOCALE. pl/uk merge over en until M15.
- 2026-11-06 · Security headers: static ones in next.config.ts, nonce CSP in proxy.ts (M5), because nonces must be per request.
- 2026-11-06 · Unconfirmed data lives in typed config/registries with a status, so placeholders are labelled automatically and real data replaces them with no component changes (docs/BUILD_PLAN.md §0).
- 2026-11-06 · Event formats, provider categories, goals and similar lists are seeded lookup tables, not enums. EiB can rename them without a migration. This deviates from the brief's "format enum".
- 2026-11-06 · Repo: GitHub (github.com/agastyasharma20/expats-in-business) is origin, so .github/workflows/ci.yml is the main CI. bitbucket-pipelines.yml stays working for an optional mirror. This replaces the earlier Bitbucket-origin decision.
- 2026-11-06 · Scope: replaces portal.expatsinbusiness.org; chapter model Global → Country → City; Kraków is chapter #1.
- 2026-11-06 · Brand taken from EiB's live web presence; Milestone 2 extracts logo, fonts and colors with Playwright MCP.
- 2026-11-06 · AI: free tiers behind lib/ai/provider.ts (groq default, gemini, openrouter, demo fallback); paid model later.
- 2026-11-06 · Developer machine: Windows.
- 2026-11-06 · Stack: Next.js 16, TypeScript, Tailwind v4, shadcn/ui, Motion, Postgres 17 + pgvector, Prisma 7, Better Auth, Stripe test mode.
