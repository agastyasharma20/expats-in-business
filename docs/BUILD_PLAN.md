# EiB build plan (M1–M16)

Source of truth: docs/PROJECT_BRIEF.md and CLAUDE.md. Progress: docs/PROGRESS.md. Tags: v0.1.0 … v0.15.0, then v1.0.0-demo.
Cut order if late: Coffee Roulette → Session Pulse → Bubbles map becomes a list. Never cut: concierge, roadmap, QR check-in, chapter-in-a-box.

## 0. Principle: build big, keep every unconfirmed value swappable

Many inputs are not confirmed yet: partners, channels, session counts, prices, legal dates, the meeting day and the brand values.
The platform is built at full ambition with rich demo data. Every value that may change lives in **one typed, validated place**
with a **status**. The UI labels anything that is not verified automatically. When the real data arrives, replacing it is a
one-line edit (or an admin form), with no component changes.

### 0.1 Truth registry (`config/facts/`)

- `config/facts/registry.ts`: a typed list of `Fact { key, value, status: "verified" | "unconfirmed" | "placeholder", source?, lastReviewed, notes? }`.
  Examples: `org.tagline`, `org.foundedSeason`, `org.sessionsHeld`, `org.contactEmail`, `channels.instagram`, `org.meetingDay`.
- A Zod schema enforces the rules. `verified` requires a `source` URL and a `lastReviewed` date. `placeholder` values must contain the word "Placeholder" or "Demo".
- `<Fact k="org.sessionsHeld" />` and `getFact()` render the value. Anything not `verified` gets a badge automatically
  ("Unconfirmed", "Placeholder"). A component can never show an unverified fact as true.
- `npm run facts:doc` regenerates docs/FACTS.md from the registry, so the registry is the single source and FACTS.md is its human-readable mirror.
- Unit test: every `verified` fact has a source, there are no duplicate keys, and every `<Fact k>` used in code exists (type-checked through a key union).

### 0.2 Partners and collaborators (`config/partners.ts`)

- `Partner { slug, name, relationship, status, logoPermission: "granted" | "pending" | "none", logoFile?, url?, source? }`.
- A logo renders only when `logoPermission === "granted"`. Otherwise the tile shows "Partner logo, permission pending".
- A partner's name is shown only when its status is `verified`. Until then the tiles stay generic placeholders.

### 0.3 Catalogs as data, not code enums

Lists that EiB may rename or extend become seeded DB tables (managed in admin) or typed config. They are never TS/Prisma enums:

- Event formats (Connect & Collaborate, Guest Speaker, …) → `EventFormat` table (slug, name i18n key, default duration, template).
  _This deviates from the brief's "format enum" for changeability. Decision to log in DECISIONS.md._
- Provider categories, onboarding goals, residence situations, industries, languages, Bubble origins → seeded lookup tables.
- Plans and prices → `Plan` rows seeded from `config/plans.ts` with `priceStatus: "proposal" | "approved"`. While any plan is a
  `proposal`, /pricing shows the "Proposed prices · net of VAT · Test mode" banner automatically.
- Roadmap tasks → `RoadmapTemplate` and `RoadmapTask` rows (content and offsets editable). Only the ordering rules stay in `lib/roadmap/rules.ts`.

### 0.4 Chapters, countries and site settings

- Chapter and country data live only in the DB (chapter-in-a-box). New-chapter defaults are in `config/chapter-defaults.ts`.
- A `SiteSetting` table (key/value, Zod-validated per key) holds the contact email, social links, the default chapter, demo banner text, and so on.
  It is seeded from the registry and editable in /admin/settings (audited).
- Brand: tokens only in `app/globals.css`, and copy only in `messages/*.json`, so a rebrand or rewording means editing those files.

### 0.5 Feature flags (`config/features.ts`)

- `features.coffeeRoulette`, `features.sessionPulse`, `features.bubblesMap`, `features.paidTickets`, `features.googleAuth` …
  Defaults live in code, can be overridden by env (`FEATURE_*`), and there's an admin toggle later. Navigation and the crawler respect the flags, so a cut feature
  disappears cleanly with no dead links.

### 0.6 Legal and guide content

- Guide frontmatter: `sources[]`, `lastVerified`, `verificationStatus: "verified" | "needs-review"`, `todo[]`.
- The concierge embeds and cites only `verified` guides. `needs-review` pages render with a visible "Being verified" notice.
- Every date-sensitive claim (KSeF phases, MOS online-only date, Information Point hours) is a frontmatter field, so updating it means editing one field.

### 0.7 Seed layering

- `prisma/seed/` is split into `base` (countries, catalogs, plans, settings: real or config-driven) and `demo` (fictional people,
  providers, events, isDemo = true). `npm run db:seed -- --base-only` produces a clean real-data install, and demo:reset reruns both.

---

## Milestones

Each entry: **Goal · Acceptance criteria · Files · Tests · Risks.**

### M1 Scaffolding and tooling (v0.1.0)

- **Goal:** an empty, deployable app with every script working on Windows.
- **AC:**
  - Next 16, TS strict, Tailwind v4 and shadcn are initialised; ESLint and Prettier (with the tailwind plugin) are set up.
  - Vitest and Playwright are configured.
  - Every npm script from the brief exists.
  - `lib/env.ts` uses Zod, with SKIP_ENV_VALIDATION support.
  - `/api/health` reports DB status.
  - `config/features.ts` and the `config/` folder exist.
  - `npm run setup` takes under 10 minutes on a fresh clone.
  - git is initialised with a `develop` branch (the remote is added with the user's OK).
- **Files:**
  - package.json, tsconfig.json, next.config.ts, proxy.ts (stub)
  - app/[locale]/layout.tsx, lib/env.ts, config/features.ts
  - scripts/*.mjs, vitest.config.ts, playwright.config.ts
  - .env.example (new names), CLAUDE.md (folder list + config/)
- **Tests:** env schema unit, feature-flag unit, health e2e smoke.
- **Risks:** version drift (pin exact versions after checking), Windows paths, the CI files staying in sync.

### M2 Brand, design system, shell and motion (v0.2.0)

- **Goal:** the EiB look, from the live site, in reusable pieces.
- **AC:**
  - Tokens are extracted with the Playwright MCP into globals.css, and the logo and favicon are in public/brand.
  - shadcn components are restyled.
  - Built: Badge (verified/founding/demo/unconfirmed), EmptyState, Skeleton, ExternalLink, Breadcrumbs.
  - Header and footer come from `lib/nav` config (no duplicate Home, fixes bug 11).
  - Motion pieces: Reveal, PageTransition, StatCounter, SuccessCheck, Skyline.
  - Styled 404 and error pages; /dev/ui showcase in demo mode.
- **Tests:** component units, axe on the showcase.
- **Risks:** CLS from fonts, readable contrast for the extracted colours.

### M3 Data model, permissions, truth registry and seed (v0.3.0)

- **Goal:** the full schema plus the configurable truth layer from section 0.
- **AC:**
  - Prisma schema with the lookup tables, pgvector migration (HNSW).
  - `config/facts`, `config/partners`, `config/plans`; `<Fact>` and `npm run facts:doc`.
  - `lib/auth/permissions.ts` (roles plus capabilities: provider = owns a Provider record, sponsor = signed link).
  - Layered seed (base + demo) at the brief's sizes, with ≥ 5 members per Bubble.
  - demo:reset under 30 s; demo ribbon.
- **Files:** prisma/schema.prisma, prisma/seed/{base,demo}/_, prisma.config.ts, lib/db.ts, config/_, components/facts/Fact.tsx.
- **Tests:** permission matrix, registry rules, seed determinism, facts:doc output.
- **Risks:** Prisma 7 + Better Auth table compatibility (cuid2 through generateId), seed speed.

### M4 Auth, onboarding, profile, settings and help (v0.4.0)

- **Goal:** accounts that work, which fixes bugs 3–7 and 14.
- **AC:**
  - Sign-in: magic link via Mailpit, demo accounts listed in demo mode, Google only when keys exist, sign-in under 2 s.
  - 6-step onboarding saved per step, with options from the lookup tables.
  - /members/[slug] with visibility toggles; copy link with clipboard fallback and toast.
  - Settings tabs persist and survive a reload (secondary email with verification, data export, deletion with 30-day grace).
  - /help with FAQ (from messages) and a contact form to the inbox in SiteSetting.
  - Sign-in is rate-limited to 5/min/IP.
- **Tests:** sign-in timing e2e, settings-persist e2e, Zod units, axe.
- **Risks:** Better Auth + next-intl routing, the proxy.ts order.

### M5 Public site and trust (v0.5.0)

- **Goal:** the homepage and public pages, driven by the registry.
- **AC:**
  - Homepage per brief J. Stats come from `<Fact>`, and unverified or demo values are labelled automatically.
  - Partner tiles come from `config/partners`.
  - /about, /partners, /stories; legal MDX drafts render properly (bug 8).
  - Cookie banner with equal-weight "Reject all".
  - Nonce CSP in proxy.ts and static headers in next.config.ts; base metadata.
- **Tests:** crawler, axe, CSP and header test, "no unverified fact without a badge" test.
- **Risks:** CSP vs Motion/Stripe, Lighthouse cost of dynamic rendering.

### M6 Chapters and chapter-in-a-box (v0.6.0)

- **Goal:** one product for any city.
- **AC:**
  - ChapterSwitcher, /c/[chapter], waitlist, /chapters d3-geo map plus a list, one vote per user.
  - An admin launches a city in under 60 s using `config/chapter-defaults`, and it gets default groups and event templates.
  - Basic Bubble list and detail pages.
- **Tests:** chapter config units (tz/currency/locale formatting), launch-chapter e2e.
- **Risks:** TopoJSON size, keyboard-accessible map.

### M7 Events and ticketing (v0.7.0)

- **Goal:** events that work end to end (bugs 2, 9, 12).
- **AC:**
  - Filters, an equal-height grid, list and calendar views, past events.
  - Detail page shows chapter-tz times, venue map link, capacity, styled external links, .ics and JSON-LD.
  - RSVP with waitlist auto-promotion and email.
  - Paid tickets: Stripe Checkout (card/BLIK/P24) or simulated; idempotent signed webhook.
  - QR ticket by email.
  - Event builder under 2 minutes, using EventFormat templates.
  - The Session Types page lists the EventFormat rows.
- **Tests:** waitlist units, webhook signature and idempotency units, RSVP and checkout e2e.
- **Risks:** Stripe PLN methods in test mode, DST edge cases.

### M8 Check-in, Session Pulse, "Who I met", connections, directory (v0.8.0)

- **Goal:** the north-star metric: confirmed connections.
- **AC:**
  - Scanner with success/duplicate/invalid states and manual search; single-use tokens; 60/min limit.
  - Pulse over SSE (behind a flag).
  - "Who I met" opt-in, plus a 48 h follow-up job.
  - Double opt-in connections.
  - /members filters; visitors see limited fields.
- **Tests:** token reuse units, scanner e2e with a fake camera, SSE smoke.
- **Risks:** the phone camera needs HTTPS (dev:https).

### M9 Membership, billing and entitlements (v0.9.0)

- **Goal:** plans entirely from data.
- **AC:**
  - /pricing renders from Plan rows, with the proposal banner driven by `priceStatus`.
  - Subscriptions and customer portal, or simulated without keys.
  - `hasEntitlement` reads a plan→feature map in config; upgrade prompts appear only when a limit is hit.
  - Corporate contact form.
- **Tests:** entitlement units, subscription webhook units, pricing e2e.
- **Risks:** wording of prices shown to real users (stays labelled as proposals).

### M10 Businesses and verified providers (v0.10.0)

- **Goal:** the marketplace (bug 10).
- **AC:**
  - /businesses and /providers with categories from the lookup table; ProviderCard; provider page.
  - Verification checklist (criteria from config) and a published criteria page.
  - Quote requests (5/day) with inbox and analytics.
  - Reviews only when the member shares a quote request or event with the provider.
  - Lead fee recorded as usage in test mode.
  - Article cards with images and working links.
- **Tests:** review-eligibility units, quote e2e.
- **Risks:** the provider capability model.

### M11 Guides and AI concierge (v0.11.0)

- **Goal:** cited answers only.
- **AC:**
  - MDX guides with sources, lastVerified and verificationStatus; TODOs where no source can be opened.
  - `npm run embed` produces 384-d vectors from verified guides only.
  - lib/ai/provider.ts with a groq → gemini → openrouter → demo fallback chain.
  - Streaming answers with source chips; a handoff card below the similarity threshold.
  - Quota from config; logs with no personal data.
- **Tests:** threshold, citation-required and fallback units; offline e2e with AI_PROVIDER=demo.
- **Risks:** legal accuracy (re-verify the KSeF, MOS and Information Point details), model download on Windows and CI.

### M12 Landing Roadmap and member dashboard (v0.12.0)

- **Goal:** a personal 30/60/90 plan (bugs 1, 13).
- **AC:**
  - Deterministic rules over RoadmapTask rows, with dependencies and offsets.
  - AI intro with a template fallback.
  - Done toggle with SuccessCheck; progress ring; .ics export; reminders 7 days before.
  - Dashboard: stat cards link to filtered lists; suggested people; skeletons.
  - Founding-member badge (the 500 limit is in config).
- **Tests:** rules units per persona, dashboard links in the crawler.
- **Risks:** rule correctness depends on M11 guide facts.

### M13 Community: groups, Bubbles map, Coffee Roulette (v0.13.0)

- **Goal:** belonging.
- **AC:**
  - Posts, questions, pinned announcements, reactions, reports, and a moderation queue for Bubble Leads.
  - /bubbles map shaded by member count, hiding groups under 5, with a list alternative (behind a flag).
  - Coffee Roulette: no repeats within 8 weeks, trios for odd numbers, both accept, placeholder café perks (behind a flag).
- **Tests:** matching algorithm units, moderation permission units.
- **Risks:** first in the cut order; map accessibility.

### M14 Admin command centre and reports (v0.14.0)

- **Goal:** run EiB from one place, including updating "the truth" without a deploy.
- **AC:**
  - KPI cards and funnel up to confirmed connections; chapter health table; activity feed; searchable tables with CSV export.
  - Applications board; verification queue; AuditLog viewer.
  - **/admin/settings and /admin/catalogs:** edit SiteSetting, EventFormat, categories and plans (audited).
  - Signed sponsor report with a print stylesheet.
- **Tests:** lead-vs-admin scoping units, signed-link units, settings-edit e2e.
- **Risks:** the aggregate privacy threshold, editing permissions.

### M15 i18n, SEO and quality (v0.15.0)

- **Goal:** pl and uk, findable, fast and accessible.
- **AC:**
  - pl/uk messages; guide summaries labelled "machine-translated, reviewed: no".
  - Per-chapter date, number and currency formats.
  - Sitemap with hreflang, OG images, JSON-LD.
  - Lighthouse 90+ on the 4 key routes; zero serious axe violations; reduced motion verified.
- **Tests:** message-key parity, a11y-auditor run.
- **Risks:** translation quality (needs native review).

### M16 Demo hardening and handover (v1.0.0-demo)

- **Goal:** a 6-minute demo that cannot fail.
- **AC:**
  - Crawler green.
  - DEMO_SCRIPT rehearsed offline.
  - `setup:nodocker` works.
  - README with screenshots and an architecture diagram.
  - Fresh-clone time measured.
  - **"Going live" checklist:** every `unconfirmed` or `placeholder` fact and every `pending` partner listed from the registry.
- **Tests:** full e2e on CI.
- **Risks:** scope slip (apply the cut order).

---

## Open items (resolved later by data, not by code changes)

- Facts to confirm with Ziyan: collaborators, channels, founding season, session count, meeting day, member count, legal entity → registry `status`.
- Partner logo permissions → `config/partners.ts` `logoPermission`.
- Final prices → `config/plans.ts` `priceStatus`.
- Legal dates (KSeF phases, MOS, Information Point) → guide frontmatter, re-verified in M11.
- Bitbucket remote URL → needed at M1.
