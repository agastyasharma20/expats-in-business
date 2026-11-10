# Decisions (newest first)

- 2026-11-10 · Seed layering: real configuration (country, chapters, catalogues, plans, roadmap tasks) is `isDemo=false` and upserted. Everything fictional is `isDemo=true` and replaced by `demo:reset`. This deviates from the M4 prompt's "every seeded record isDemo=true" so a real install can keep its configuration.
- 2026-11-10 · Cached data loaders (`"use cache"`) must throw on failure; a non-cached wrapper catches and returns the empty state. Catching inside the cache would cache the failure.
- 2026-11-10 · Public pages animate with CSS keyframes (they run on first paint, need no hydration and ship no JS). Motion is only loaded by pages that use `m.*` components, inside `MotionProvider`.
- 2026-11-10 · The layout passes only the client namespaces to `NextIntlClientProvider`; pages with extra client needs (the styleguide) add their own provider.
- 2026-11-10 · Guides accept only official https sources (gov.pl, krakow.pl, zus.pl, knf.gov.pl, europa.eu) and must be re-verified within a year (tests enforce this). City-specific guides carry a `chapter` frontmatter field.

- 2026-11-10 · The locale comes from `next/root-params` (in lib/i18n/request.ts and the locale layout). No page awaits `params` and `setRequestLocale` is gone (deprecated by next-intl). This removes the "URL data outside Suspense" instant-navigation insight on every page. As a result `app/layout.tsx` is gone, so `[locale]` is the root layout again; URLs outside any locale use `app/global-not-found.tsx` (`experimental.globalNotFound`). The legal pages are three static routes sharing `LegalPageView` instead of `[slug]` (`dynamicParams` is not supported with Cache Components). The `[...rest]` catch-all sets `instant = false` because it only ever 404s.

- 2026-11-10 · Unbuilt nav destinations (Events, Members, Providers, Guides, Pricing, Sign in) render designed, noindex coming-soon pages with working actions, so the full navbar ships now and the crawler stays green. Each later milestone replaces its route.
- 2026-11-10 · Social and contact links come from config/facts.ts, read from the EiB Connect page on 9 Nov 2026 and recorded with sources in docs/FACTS.md.
- 2026-11-10 · The chapter preference is a first-party httpOnly cookie (eib-chapter, 1 year) set by a validated server action. It records a choice the visitor made, so it is treated as strictly necessary (see the cookie policy draft).
- 2026-11-10 · Legal pages render MDX with next-mdx-remote-client inside "use cache". Request APIs are unavailable there, so translations take an explicit locale, links use ExternalLinkBase and getPathname, and facts reach the MDX through scope and <ContactEmail />. The same pipeline is meant for the M4 guides.
- 2026-11-10 · 404 handling follows the next-intl pattern: a [...rest] catch-all under [locale], a pass-through app/layout.tsx and app/not-found.tsx. The (dev) route group became (tools) because next dev kept routing /styleguide to the catch-all.
- 2026-11-10 · Playwright uses 2 workers in CI. Six workers on one production server queued route prefetches behind Chrome's 6-connections-per-host limit, which stalled navigations.

- 2026-11-07 · Brand from the live site (docs/brand/BRAND.md): Deep Teal #093334, tint #C5E8EB and the real fonts Cabin + Nunito Sans replace the brief's starting values and Montserrat + Inter. EiB Green #12635A is kept for primary actions even though the live site doesn't use it, because the live CTA orange #FF3514 fails 4.5:1 with white. The orange stays as "ember" for decoration, with #C2260C for one highlight button.
- 2026-11-07 · Logo: the original 3000 px raster is used (resized by scripts/brand-assets.mjs). It is **not** redrawn as SVG: it isn't a small raster, and a hand-traced "EB" would drift from the real artwork. Ask EiB for the vector source.
- 2026-11-07 · Buttons use 8 px radius, not the live site's square corners. Colour changes on hover are instant; only transform (press) and opacity animate.
- 2026-11-07 · /styleguide is available in development and demo mode (not only development) so CI's production build can e2e-test it. It is noindex.
- 2026-11-07 · cn is created with the custom token lists (lib/utils.ts); importing the bare "cn" package is a lint error.

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
