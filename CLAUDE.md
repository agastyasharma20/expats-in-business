# CLAUDE.md: Expats in Business (EiB) platform

## What this project is

EiB is a free, community-run business network for internationals, founded in Kraków in 2024 ("Your Global Business Community!").
This repo is the new EiB platform. It replaces portal.expatsinbusiness.org and is built as ONE global product organised into
chapters: Global → Country hub (Poland first) → City chapter (Kraków = chapter #1, Warsaw launching).
Cultural Bubbles (groups by country of origin, each with a Bubble Lead) cut across every chapter.
Right now it runs LOCALLY for a stakeholder demo (Ziyan Sinnen). It must stay deployment-ready.

Brief: docs/PROJECT_BRIEF.md. Plan: docs/BUILD_PLAN.md (M1–M16). Progress log: docs/PROGRESS.md. Decisions: docs/DECISIONS.md.

## Standing instructions (read every session)

1. Plan before coding. For any task touching more than 2 files, propose a plan (files, steps, risks) and wait for approval.
2. Work in small, reviewable steps. One milestone = one feature branch = several small commits (Conventional Commits).
3. Never invent company facts. No fake testimonials, partners, statistics, prices, people or addresses.
   Use clearly labeled placeholders ("Placeholder testimonial", "Partner logo, permission pending", "Demo profile").
   Real facts allowed: those in docs/FACTS.md (each with a source).
4. Every legal/tax/immigration statement in content/guides must cite an official source and carry `lastVerified`.
   The AI concierge may only answer from those guides and must cite them.
5. Never commit secrets or personal data. Never read or print `.env`. Use `.env.example` for new variable names.
6. Nothing hard-codes "Kraków", "PLN", "Europe/Warsaw" or "en". Use the chapter's config.
7. Every clickable element works or is not rendered as clickable (the old portal's main bug class).
8. No page ships empty: seed data or a designed empty state with a next action.
9. Finish every task by running `npm run check` and fixing failures, then update docs/PROGRESS.md and propose a commit message.
10. If something is unclear or a requirement conflicts, ask instead of guessing.

## Tech stack

Next.js 16 (App Router, Server Components, Server Actions) · TypeScript strict · Tailwind CSS v4 + shadcn/ui · Motion (`motion/react`)
· PostgreSQL 17 + pgvector (Docker) · Prisma ORM 7 (ESM, prisma.config.ts, @prisma/adapter-pg) · Better Auth
· Zod + React Hook Form · Vercel AI SDK v6 via lib/ai/provider.ts · local embeddings (@huggingface/transformers, all-MiniLM-L6-v2, 384 dims)
· Stripe test mode (card, BLIK, Przelewy24) · Mailpit (local email) · next-intl (en, pl, uk) · MDX guides
· d3-geo SVG maps (no tile APIs) · qrcode + @zxing/browser · Vitest + Testing Library · Playwright + @axe-core/playwright.
Package manager: npm. Node 24 LTS. OS of the developer: Windows 11 (PowerShell). Keep scripts cross-platform (use Node scripts, not bash-only).

## Folder structure (keep to it)

- app/[locale]/(public) – marketing pages, chapters, guides, pricing, legal
- app/[locale]/(member) – dashboard, roadmap, concierge, connections, bubbles, settings
- app/[locale]/(provider) – provider inbox and analytics
- app/[locale]/(admin) – admin and chapter-lead tools
- app/api – route handlers only for external callers (stripe webhook, concierge stream, pulse SSE, ics, checkin, health)
- components/ui (shadcn) · components/motion · components/layout · components/<feature>
- lib/ (auth, permissions, ai, db, env, rate-limit, i18n, money, time, chapters, nav, roadmap) · server/actions/<feature>.ts
- config/ – swappable values: facts registry, partners, plans, chapter defaults, feature flags (see docs/BUILD_PLAN.md §0)
- prisma/ (schema.prisma, migrations, seed/{base,demo}) · prisma.config.ts · generated/prisma (git-ignored)
- content/guides/<country>/_.mdx · content/legal/_.mdx · messages/{en,pl,uk}.json · public/brand · public/maps
- tests/unit · tests/e2e · scripts/ · docs/

## Brand rules

- Colors: tokens in app/globals.css (mirrored in lib/design/tokens.ts, kept in sync by a test), taken from the live site
  in Milestone 2 (docs/brand/BRAND.md): Deep Teal #093334 (headings, top bar, footer), logo teal #074C4C, EiB Green #12635A
  (primary buttons, links), tint #C5E8EB, ember #FF3514 (decoration only) / #C2260C (one "Join" highlight button).
  Never hard-code hex in components or app (a unit test scans for it). Every new text/background pair goes into
  contrastPairs in lib/design/tokens.ts and must pass 4.5:1 (3:1 for borders and focus).
- Fonts: Cabin 600–700 for headings (sentence case), Nunito Sans for body: the live site's fonts, via lib/fonts.ts.
  All caps only for short eyebrow labels (.eyebrow).
- Class names: import { cn } from "@/lib/utils" (knows the custom text-body/text-small/shadow-card tokens); ESLint
  blocks the bare "cn" package because it silently drops colours next to custom font sizes.
- Living reference: /styleguide (development and demo mode only).
- Logo: eib-logo.png on white, eib-logo-white.png on Deep Teal, eib-monogram.png for the circle mark; originals in
  docs/brand/source/, regenerate with `node scripts/brand-assets.mjs`.
- Tone: warm, inclusive, concrete. Sentence-case buttons, at most one exclamation mark, always date, time, venue, price.
- Images: real EiB photos only or labeled illustrated placeholders. No stock photos presented as EiB events.

## Coding conventions

- Server Components by default; "use client" only where needed. Data access only in server code (lib/db, server/actions).
- Every Server Action: requireRole/requireEntitlement → Zod parse → permission check → write → audit log (admin actions) → revalidate.
- Money = integer minor units + currency. Times stored UTC, shown in chapter timezone. IDs = cuid2.
- Named exports, small files (< 250 lines), descriptive names, no `any`, no default-exported utilities.
- UI strings go through next-intl (messages/*.json); no hard-coded English in components.
- Accessible by default: semantic HTML, labels, focus rings, 44px touch targets, alt text, no color-only meaning.

## Animation rules

- Use components/motion (Reveal, StatCounter, PageTransition, SuccessCheck). Animate only transform and opacity.
- Micro 120–180ms, entrances 400–600ms with 60ms stagger, nothing over 600ms except counters (1.2s) and the skyline (1.6s).
- MotionConfig reducedMotion="user" wraps the app; CSS transitions have prefers-reduced-motion fallbacks. No CLS from animation.

## Security and privacy rules

- Validate env with Zod in lib/env.ts. Security headers in next.config.ts. Rate-limit auth, concierge, quotes, check-in.
- Never send personal data to an LLM. Concierge prompts contain only the question and retrieved guide passages.
- GDPR: consent before non-essential cookies; data export and deletion in settings; hide aggregates under 5 people.
- Stripe: verify webhook signatures, never trust client amounts, idempotency keys.

## Commands

- `npm run setup` – install, docker compose up, migrate, seed, embed guides (first run)
- `npm run dev` – app on http://localhost:3000, Mailpit on http://localhost:8025
- `npm run check` – lint + typecheck + unit tests (run before every commit)
- `npm run e2e` – Playwright tests incl. axe and link crawler (needs dev db)
- `npm run build && npm start` then `npm run lighthouse` – performance audit
- `npm run db:reset` / `npm run demo:reset` – reset database / restore demo seed
- `npm run stripe:listen` – forward Stripe test webhooks (needs Stripe CLI)

## Definition of done (every milestone)

- [ ] Acceptance criteria in the milestone prompt all pass, shown in the browser
- [ ] `npm run check` green; new logic has unit tests; new pages have an e2e smoke test incl. axe
- [ ] No dead links or no-op buttons (crawler green); no empty pages; works at 375px and 1440px widths
- [ ] Reduced-motion checked; keyboard navigation works; no console errors
- [ ] Strings translated keys exist for en (pl/uk may fall back to en until Milestone 15)
- [ ] docs/PROGRESS.md updated; no secrets or personal data in the diff; commit message proposed

## Gotchas

- Windows: use `cross-env` for env vars in scripts; paths via node:path; line endings LF (.gitattributes).
- Prisma 7: run `prisma generate` explicitly; client output is in generated/prisma; import from `@/generated/prisma/client`.
- Next 16.4 has Cache Components on: request-time data (DB, cookies) must sit inside <Suspense> after `await connection()` or use "use cache". Read node_modules/next/dist/docs before using a new API.
- `npm run typecheck` runs `next typegen` first (PageProps/LayoutProps are generated types).
- TypeScript is pinned to 6.0.x because typescript-eslint does not support TS 7 yet.
- MCP stdio servers on native Windows need `cmd /c npx ...`.
