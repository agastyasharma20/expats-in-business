You are the lead engineer, product designer and QA lead for the new Expats in Business (EiB) platform. I am a solo developer
on Windows 11 (PowerShell, VS Code) and I will build it with you milestone by milestone. This message is the complete project
brief. First save it, word for word, as docs/PROJECT_BRIEF.md (create docs/ if needed). That is the only file you may write in
this session. Then follow "YOUR TASK NOW" at the end.

==================================================================
1. THE BUSINESS (real facts only, never invent more)
==================================================================
- Expats in Business (EiB) is a free, community-run business network for expat entrepreneurs and professionals. It was
  co-founded in Kraków, Poland in spring 2024 by Ziyan Sinnen ("Zee"). Tagline: "Your Global Business Community!"
- It has held 35+ in-person sessions (session 35: 22 Jan 2026). Formats: Connect & Collaborate, Guest Speaker, Cultural Exchange,
  Virtual Connect, Business Development workshops. It also runs Cultoura (a cultural-exchange series) and the
  "Expat Business Stories" podcast on YouTube.
- Collaborators so far: City of Kraków, Centrum Wielokulturowe (Multicultural Centre), KMS Foundation / Kraków Miastem Startupów,
  Cracow University of Economics, InterNations (joint meetup 19 Feb 2026). Partner logos may NOT be shown until written
  permission exists.
- Channels today: WhatsApp community, Facebook groups (Kraków, Warsaw, Poland), Instagram, LinkedIn, YouTube, and 6+ separate
  Google/Microsoft Forms. Contact: info.expatsinbusiness@gmail.com, Messenger m.me/expatsinbusiness. No public street address.
- Revenue today: none confirmed. A paid "EiB Business" module and sponsorship are planned.
- EiB's own concept "Cultural Bubbles": attendees grouped by country or region of origin, each led by a Bubble Lead.
- The current portal (portal.expatsinbusiness.org) has 14 known bugs that the new platform must make impossible:
  1 dashboard stat links dead · 2 Facebook link on event page unstyled · 3 "Need Help" dead · 4 "Copy profile link" dead ·
  5 "Add email" dead · 6 Account "Save changes" doesn't persist · 7 sign-in redirect slow · 8 privacy policy shows raw markdown ·
  9 Session Types page empty · 10 article cards have no images and dead links · 11 "Home" twice in footer ·
  12 event cards misaligned · 13 profile stat icons dead · 14 public profile not visible.
- RULE: docs/FACTS.md is the only source of company facts shown in the UI. Everything else is a clearly labeled placeholder:
  "Demo profile", "Demo provider", "Demo data", "Placeholder testimonial", "Partner logo, permission pending".

==================================================================
2. PRODUCT VISION AND MODEL
==================================================================
Vision: "The business network for internationals: starting in Kraków, built for every city." Free to join, verified,
business-first. North-star metric: CONFIRMED CONNECTIONS per month (two members confirm they met, at an event via QR check-in or
via matching).

Global chapter model (must scale Kraków → Poland → world without rewrites):
- Global (EiB HQ): brand, platform, billing, global directory, content templates.
- Country hub (Poland first): verified guides for that country, currency, legal pages, languages (en, pl, uk), national partners.
- City chapter (Kraków = chapter #1, live; Warsaw = launching, waitlist): events, venues, chapter leads, local providers,
  sponsors, district data.
- Cultural Bubbles: global groups by origin country that exist in every chapter.
- Chapter-in-a-box: an admin launches a new city from the admin panel in < 60 seconds, no deploy.

Personas (fictional composites, use them for demo users and test scenarios):
- Priya, 27, newcomer: QA engineer from India, 3 months in Kraków. Needs PESEL, trusted profile, residence permit, friends.
- Karim, 34, founder: one-person digital agency (sole trader), planning an sp. z o.o.; needs clients, KSeF, an accountant.
- Daniel, 41, long-term expat: consultant, 8 years in Kraków, wants recognition as a speaker/mentor.
- Marta, 38, local provider: Polish accountant working in English, wants qualified expat leads (Verified Provider).
- Anna, 45, corporate HR: business-services centre hiring foreigners; corporate package / sponsor.
- Alex, chapter lead: volunteer who runs sessions; needs fast event creation, check-in, reports.

==================================================================
3. COMPLETE FEATURE LIST (MVP = everything below; all must work in the local demo)
==================================================================
A. Accounts and profiles
   - Better Auth: email magic link (delivered to Mailpit locally), Google sign-in only if keys exist, email+password for demo users.
     Sign-in to dashboard < 2 s locally.
   - Onboarding (6 steps, saved per step): chapter, country of origin, languages, industry, goals (find clients, find a job,
     settle in, meet people, give back), arrival date + residence situation (EU citizen / non-EU employee / non-EU founder /
     student / family member).
   - Public profile /members/[slug] with per-field visibility toggles; copy-profile-link (Clipboard API + fallback + toast).
   - Settings tabs: Profile, Account (persists, toast, survives reload), Email (secondary email + verification), Billing,
     Privacy (download my data as JSON, delete account with 30-day grace, visibility toggles).
   - Help centre /help: FAQ + contact form (emails admin inbox) + link to the concierge.
   - Member dashboard: next RSVP'd event, roadmap progress ring, stat cards (events joined, connections, businesses) that each
     link to a filtered list, suggested people, skeleton loaders.
   - Founding-member badge: numbered for the first 500 members per chapter ("Founding member #017").
B. Chapters
   - Chapter switcher (Global / Kraków / Warsaw), chapter home pages /c/[chapter], waitlist for launching chapters,
     /chapters world map of live, launching and requested cities, "Request a chapter in my city" (one vote per user).
   - Chapter-in-a-box admin form: country, city, slug, timezone, currency, locales, cover image, leads → chapter page with
     default groups, event templates and waitlist goes live immediately.
C. Events and ticketing
   - /c/[chapter]/events: filters (format, date, free/paid), equal-height EventCard grid, list/calendar toggle, past events with photos.
   - /events/[id]: date/time in the chapter timezone, venue + map link, capacity bar, sponsor slot, consented attendee avatars,
     styled external links, "Add to calendar" (.ics), JSON-LD Event.
   - RSVP with capacity and waitlist (auto-promotion + email). Paid tickets: Stripe Checkout TEST mode with card, BLIK and
     Przelewy24; webhook verifies the signature and marks tickets paid idempotently. With no Stripe keys: simulated test success.
   - QR ticket (random single-use token) by email + ticket page.
   - /events/[id]/scan (chapter lead only): phone-camera scanner (@zxing/browser), success/duplicate/invalid states, manual search.
   - /events/[id]/pulse ("Session Pulse" projector screen): live check-in counter, mini map of countries in the room, today's sponsor,
     "Join EiB" QR; live via server-sent events.
   - "Who I met": after check-in, a list of attendees who opted in; one-tap connection request; follow-up reminder email after 48 h.
   - Event builder for chapter leads (< 2 minutes, templates per EiB format).
D. Membership, pricing and billing (prices are proposals; show "net of VAT" and a "Test mode" banner in demo mode)
   - Community: free (profile, events, directory, guides, Bubbles, roadmap, 10 concierge questions/day).
   - Member Plus: 19 PLN/month or 190 PLN/year (unlimited concierge, Coffee Roulette priority, early event access,
     workshop discounts, deadline reminders).
   - Business: 49 PLN/month or 490 PLN/year (business listing, lead inbox, featured in Bubble, 2 workshop seats/year).
   - Verified Provider: 149 PLN/month or 1,490 PLN/year + 40 PLN per accepted lead (badge, quote requests, analytics).
   - Corporate: from 7,900 PLN/year (25 Plus seats, 2 branded onboarding sessions, aggregate report) → contact form, no checkout.
   - Stripe subscriptions in test mode, customer portal link, entitlements via hasEntitlement(user, feature); upgrade prompts only
     where a limit is hit. Prices come from Plan rows, never hard-coded.
E. Directories and marketplace
   - /members: search + filters (industry, skills, languages, origin, chapter, open to coffee); visitors see limited fields.
   - Connections: request → accept/decline (double opt-in); contact details only after acceptance; /connections.
   - /businesses and /providers: categories (legal, tax & accounting, relocation, housing, language, insurance); ProviderCard;
     provider page (services, languages, response time, reviews only from members with a shared quote request or event).
   - Verification: admin checklist (registry number checked, references, insurance); badge links to the published criteria page.
   - Quote requests to providers; provider inbox and profile analytics.
F. Guides and the AI Expat Concierge
   - /guides, /guides/[slug]: MDX guides for Poland with frontmatter (title, countryCode, sources[] = official URLs only,
     lastVerified, disclaimer): MOS online residence applications (mandatory online since 27 Apr 2026, requires a trusted profile),
     PESEL, trusted profile (profil zaufany), banking basics, health insurance basics, ZUS basics for sole traders, KSeF e-invoicing
     (mandatory 1 Apr 2026 for VAT-registered firms; micro firms ≤ PLN 10,000 monthly sales from 1 Jan 2027), free help: the
     Information Point for Foreigners at the Multicultural Centre (Zabłocie 20, Mon–Fri 9:00–17:00). Write only what an official
     source you can open supports; otherwise leave a TODO.
   - /concierge chat: streaming answers that MUST cite retrieved guide chunks (source chips: guide title + official link +
     last verified date). Below the similarity threshold, or with no valid citation → no answer, show a handoff card
     ("Ask a verified provider" + "Free help: Information Point for Foreigners"). Label: "General information, not legal advice".
   - Suggested questions; 10/day for free members; rate limit; log question + cited chunk ids + provider only (no personal data).
G. Landing Roadmap 30/60/90
   - Deterministic rules (lib/roadmap/rules.ts) choose and order tasks from onboarding answers: PESEL → trusted profile → MOS
     application → bank account → health insurance → address registration → tax basics → KSeF (founders) → join your Bubble →
     first session. Dependencies and due offsets (day 7/30/60/90). The AI writes only a 2-sentence personal intro
     (template fallback). Done toggles with a success animation, progress ring, .ics export, reminder emails 7 days before.
H. Community
   - Groups per chapter and Bubbles: posts, questions, pinned announcements, reactions, reporting, moderation queue; Bubble Leads moderate.
   - /bubbles: SVG world map (d3-geo + Natural Earth 110m TopoJSON, no tile service), shaded by member count, hide < 5,
     keyboard-accessible list alternative; Bubble pages with lead, opted-in members and Bubble events.
   - Coffee Roulette: weekly opt-in matching per chapter or Bubble (complementary goals/skills, no repeats within 8 weeks,
     trio for odd numbers, both accept), suggested partner café (placeholder perks).
I. Admin command centre
   - /admin (chapter-scoped for leads, global for admins): KPI cards, funnel visitors → sign-ups → RSVPs → check-ins → confirmed
     connections, chapter health table, recent activity; tables with search and CSV export.
   - Applications board (speaker, story, contributor) replacing Google/Microsoft Forms; applicants see their status.
   - Provider verification queue; content management; AuditLog viewer (all admin writes logged).
   - Sponsor ROI report /sponsor/reports/[id] (signed shareable link): attendance, industries, origin countries (hide < 5),
     Pulse impressions, QR scans, consented leads, photos; print-to-PDF stylesheet.
J. Homepage and public pages
   - Hero: eyebrow "YOUR GLOBAL BUSINESS COMMUNITY", sentence-case headline, two CTAs (Join free, See upcoming sessions),
     original line-drawn Kraków skyline (Wawel, St Mary's towers, the Vistula; drawn from scratch) animating in.
   - Stats strip with animated counters (FACTS values like "35+ sessions"; anything else tagged "Demo data"), next 3 events,
     "How it works" (3 steps), Bubbles teaser, chapters strip, partner placeholder tiles, placeholder testimonials, final CTA band.
   - /about (from FACTS only), /partners, /pricing, /stories (podcast/YouTube placeholders), /help, /legal/privacy|terms|cookies
     (MDX drafts labeled "Draft: to be reviewed by a lawyer"), styled 404 and error pages.
K. Trust, privacy, SEO, i18n
   - Cookie banner (essential only until consent; "Reject all" as prominent as "Accept all").
   - Security headers + CSP with nonces; rate limits on sign-in (5/min/IP), concierge, quotes (5/day), check-in (60/min).
   - SEO: metadata for every route, OG images (site, events, guides), sitemap with hreflang, robots, JSON-LD Organization/Event/Breadcrumb.
   - next-intl: en (default), pl, uk; dates, numbers and currency per chapter. Guides in EN with PL/UK summaries marked
     "machine-translated, reviewed: no".
L. Demo mode (DEMO_MODE=true)
   - Deterministic seed (fixed faker seed): Poland; Kraków live (Europe/Warsaw, PLN); Warsaw launching; 120 fictional members
     (initials avatars, isDemo); 30 demo providers; 24 past + 6 upcoming events in EiB's real formats at fictional demo venues;
     8 Bubbles (India, Sri Lanka, Ukraine, Turkey, Mexico, Italy, Tunisia, Poland); plans; roadmap task library;
     140 chapter-request votes across 12 cities; sponsorships and check-ins for past events (so reports have data).
   - Demo accounts (password Demo!2026): admin@demo.eib.local, lead@demo.eib.local, priya@demo.eib.local,
     karim@demo.eib.local, marta.provider@demo.eib.local, sponsor@demo.eib.local. Shown on the sign-in page only in demo mode.
   - "Demo mode" ribbon; npm run demo:reset restores the exact state in < 30 s.

==================================================================
4. TECH STACK (check current versions with the Context7 MCP or the web before installing; pin exact versions)
==================================================================
- Node.js 24 LTS, npm. Windows 11 + PowerShell must work for every script (Node scripts, cross-env; no bash-only commands).
- Next.js 16: App Router, React Server Components, Server Actions, route handlers only for external callers.
- TypeScript strict (no any). ESLint + Prettier (+ tailwind plugin).
- Tailwind CSS v4 (@theme tokens in app/globals.css) + shadcn/ui (Radix), restyled to the EiB tokens.
- Motion (motion/react) for animation.
- PostgreSQL 17 + pgvector via Docker image pgvector/pgvector:pg17; Mailpit (axllent/mailpit) for local email.
  docker-compose.yml is already in the repo. Fallback: npm run setup:nodocker with a local Postgres install.
- Prisma ORM 7: ESM, prisma.config.ts, driver adapter @prisma/adapter-pg, generator output generated/prisma, explicit prisma generate.
- Better Auth (Prisma adapter): magic link, Google, email+password; sessions in DB.
- Zod (shared validation) + React Hook Form.
- Vercel AI SDK v6 behind lib/ai/provider.ts: one interface generate({system, messages, stream}). Adapters: groq (default,
  free tier, model openai/gpt-oss-120b), gemini (free tier), openrouter (:free models), demo (offline: formats retrieved passages
  as a cited answer, no generation), anthropic (paid, later). Automatic fallback chain on 429/5xx/timeouts; final fallback demo.
  AI_PROVIDER env selects the first adapter. Never send personal data to any model.
- Embeddings: @huggingface/transformers with all-MiniLM-L6-v2 (384 dims), run locally, model cached in .cache/models;
  stored in GuideChunk.embedding vector(384) with an HNSW or IVFFlat cosine index (raw SQL migration).
- Stripe (test mode only): Checkout, subscriptions, customer portal, webhooks via Stripe CLI (npm run stripe:listen).
- next-intl (en, pl, uk). MDX for guides and legal pages (with frontmatter). d3-geo + topojson-client for maps.
- qrcode (generate) + @zxing/browser (scan). Server-sent events for the Pulse screen.
- Testing: Vitest + Testing Library + jsdom (unit), Playwright + @axe-core/playwright (e2e, accessibility, link crawler,
  timing). Lighthouse (local, on a production build).
- npm scripts: setup, setup:nodocker, dev, dev:https, build, start, lint, typecheck, test, check (= lint + typecheck + test --run),
  e2e, lighthouse, db:reset, db:seed, demo:reset, embed, jobs, stripe:listen, format.

Folder structure:
app/[locale]/(public) · app/[locale]/(member) · app/[locale]/(provider) · app/[locale]/(admin) · app/api ·
components/ui · components/motion · components/layout · components/<feature> · lib/ (auth, permissions, ai, db, env,
rate-limit, money, time, chapters, nav, i18n, roadmap) · server/actions/<feature>.ts · prisma/ (schema, migrations, seed/) ·
prisma.config.ts · content/guides/<country>/*.mdx · content/legal/*.mdx · messages/{en,pl,uk}.json ·
public/brand · public/maps · scripts/ · tests/unit · tests/e2e · docs/

==================================================================
5. DATA MODEL AND PERMISSIONS
==================================================================
Rules: every chapter-specific model has chapterId; every jurisdiction-specific model has countryCode; money = Int minor units +
currency; times stored UTC and shown in the chapter timezone; ids = cuid2; nothing hard-codes "Kraków", "PLN", "Europe/Warsaw"
or English UI strings; isDemo flag on seeded records.
Models (plus Better Auth's own tables):
- Geography: Country, Chapter (slug, city, timezone, currency, locales, status live|launching|requested), ChapterRequest
- People: User, Profile (originCountry, languages, industry, skills, goals, arrivalDate, residenceSituation, visibility flags,
  foundingNumber), ChapterRole (member|bubble_lead|moderator|chapter_lead|admin), Consent
- Billing: Plan, Subscription (+ stripeCustomerId on User)
- Events: Event (format enum matching EiB's formats), TicketType, Ticket (qrToken single use, status), CheckIn, Sponsor, Sponsorship
- Network: Connection (status pending|accepted|declined, metAtEventId), Bubble, BubbleMember, Group, Post (+ reports)
- Marketplace: Business, Provider, Verification, QuoteRequest, Review
- Knowledge/AI: Guide, GuideChunk (embedding vector(384)), ConciergeQuery, RoadmapTemplate, RoadmapTask, UserTask
- Engagement/ops: Application (speaker|story|contributor, status), PointsEntry, Badge, AuditLog
Permissions in lib/auth/permissions.ts (requireUser, requireRole(role, chapterId?), hasEntitlement(user, feature)), unit-tested:
visitor < member (+ Plus/Business entitlements) < provider; bubble_lead/moderator moderate their group; chapter_lead manages
their chapter's events, scanning, Pulse, applications, analytics and sponsor reports; admin does everything.
Every Server Action: requireRole/requireEntitlement → Zod parse → permission check → write → AuditLog (admin actions) → revalidate.
Route handlers: POST /api/stripe/webhook, POST /api/concierge (stream), GET /api/pulse/[eventId] (SSE), GET /api/ics/[eventId],
POST /api/checkin, GET /api/health.

==================================================================
6. BRAND, DESIGN SYSTEM AND MOTION
==================================================================
- Take the brand from the live web in Milestone 2: open https://expatsinbusiness.org/ and https://expatsinbusiness.org/eib-connect/
  with the Playwright MCP, read computed fonts/colors/CSS variables, download the logo and favicon
  (https://expatsinbusiness.org/wp-content/uploads/2025/01/cropped-favicon-270x270.png) into public/brand/.
- Starting tokens until then: brand-950 #0A3335 (Deep Teal: logo, headings, footer), brand-800 #0E4A48, brand-700 #12635A
  (EiB Green: primary buttons, links), brand-500 #2E8F80, brand-100 #E0F4F3, brand-50 #F2FAF9; ink #0F1A1A, muted #51605F,
  line #DCE5E4, surface #FFFFFF, canvas #F7FAF9; success #1F7A4D, warning #A15C00, danger #B3261E; accent #F2B544 (proposal,
  badges only). Radius 8/12/20/pill. Card shadow 0 1px 2px rgb(10 51 53/.06), 0 8px 24px rgb(10 51 53/.06).
  Easing cubic-bezier(0.22,1,0.36,1). No hex values inside components.
- Fonts: Montserrat 700–800 for headings in sentence case, Inter for body, via next/font. All caps only for short eyebrow labels
  (letter-spacing 0.08em). Type scale: display 56/64 (mobile 36/44), h1 40/48, h2 32/40, h3 24/32, body 16/26, small 14/22.
- Layout: 4px spacing base, 12-column grid, 1200px container, 24px gutters (16 mobile), breakpoints 640/768/1024/1280, mobile first.
- Components: Button (primary/secondary/ghost/link, sentence case), Card (equal-height variant), Badge (verified, founding, demo,
  bubble flag), Avatar with flag, EventCard, ProviderCard, StatCounter, Stepper, ChatPanel with source chips, DataTable,
  EmptyState (with next action), Skeleton, Toast, Dialog, Sheet, Tabs, Breadcrumbs, ExternalLink (icon + rel), ChapterSwitcher,
  LanguageSwitcher, CookieBanner.
- Look and feel: professional, trustworthy, warm. Generous whitespace, real EiB photos or labeled illustrated placeholders,
  never stock photos presented as EiB events. Logo only on white or Deep Teal. Tone: warm, concrete, sentence-case buttons,
  at most one exclamation mark, always date, time, venue and price.
- Motion (components/motion: Reveal, StatCounter, PageTransition, SuccessCheck, Skyline): animate only transform and opacity;
  micro 120–180ms; entrances 400–600ms with 60ms stagger (spring stiffness 260, damping 30); page transition 200ms fade + 8px rise
  (app/[locale]/template.tsx); counters 1.2s; skyline pathLength 1.6s staggered; success check 500ms; skeleton shimmer 1.4s.
  MotionConfig reducedMotion="user" + CSS prefers-reduced-motion fallbacks. Nothing loops except skeletons and the live dot.
  No layout shift (CLS < 0.1). 60 fps.

==================================================================
7. SECURITY, PRIVACY AND QUALITY
==================================================================
- lib/env.ts validates env with Zod (SKIP_ENV_VALIDATION for CI). Secrets only in .env (never read or print it; add new names to
  .env.example). Stripe test keys only. Verify webhook signatures; never trust client amounts; idempotency keys.
- Security headers in next.config.ts: CSP with nonces (allow Stripe), HSTS in production, X-Content-Type-Options, Referrer-Policy,
  Permissions-Policy (camera only on /events/[id]/scan), frame-ancestors none.
- Postgres-backed rate limiting (lib/rate-limit.ts). Uploads: images ≤ 5 MB, re-encoded to WebP, stored outside the code.
- GDPR: lawful basis per data type; explicit opt-in for marketing email, matching, "who I met" and avatar display; data export and
  deletion; aggregates hide groups under 5; retention: concierge logs 90 days, audit log 1 year. The deadline radar stores only
  document type and date, never scans or document numbers.
- Quality targets: Lighthouse mobile 90+ in all 4 categories on /, /c/krakow/events, /events/[id], /pricing; LCP < 2.5s,
  CLS < 0.1, INP < 200ms; WCAG 2.1 AA with zero serious axe violations; zero dead links/no-op buttons (crawler); sign-in < 2s;
  works with AI_PROVIDER=demo and no internet; a fresh clone runs with npm run setup + npm run dev in < 10 minutes.

DEFINITION OF DONE (every milestone):
- Acceptance criteria pass and are visible in the browser; npm run check green; new logic has unit tests; new pages have a
  Playwright smoke test with axe; crawler green; no empty pages; correct at 375px and 1440px; keyboard works; reduced motion checked;
  no console errors; en message keys exist; docs/PROGRESS.md updated (built, how to test, known gaps, old bugs fixed);
  no secrets/personal data/invented facts in the diff; Conventional Commit messages and the tag proposed.

==================================================================
8. GIT AND CI
==================================================================
- Bitbucket is origin (main remote); GitHub may be a second push URL. Branches: main (demo-ready, tagged) ← develop ←
  feat/mNN-name. Never work on main. Never commit, push, merge, rebase or reset without asking me.
- Conventional Commits, small and frequent. Tags v0.1.0 … v0.15.0, then v1.0.0-demo.
- bitbucket-pipelines.yml (already in repo): fast checks only (lint, typecheck, unit, build) on PRs and main, because
  Bitbucket Free has 50 build minutes/month. .github/workflows/ci.yml: full checks + Postgres + Playwright e2e on the mirror.
- Keep every command in those CI files working as package.json evolves.

==================================================================
9. HOW WE WORK
==================================================================
- One milestone per session and per branch. I will paste a detailed milestone prompt each time.
- Always plan first: restate the goal and acceptance criteria, list files, risks and commits, and wait for my OK.
- Build in small steps; run npm run check after each; fix failures without weakening tests or adding ignores.
- Use the subagents in .claude/agents (reviewer, test-writer, a11y-auditor) and the skills /milestone, /check, /ship.
- Use the Playwright MCP to look at what you built (screenshots at 375/768/1440) and fix visual issues before saying it's done.
- Ask instead of guessing about legal or tax wording, real partner names or logos, prices shown to real users, deleting data,
  or security settings. If something in this brief conflicts with CLAUDE.md or reality, stop and ask.
- If we fall behind, cut in this order: Coffee Roulette → Session Pulse → Bubbles map becomes a list. Never cut the concierge,
  the roadmap, QR check-in or chapter-in-a-box.

==================================================================
YOUR TASK NOW
==================================================================
1. Save this brief as docs/PROJECT_BRIEF.md (exact text).
2. Read CLAUDE.md, docs/DECISIONS.md, docs/FACTS.md, docs/PROGRESS.md and the .claude/ folder. Summarise the rules in 10 bullets.
3. List every conflict, gap or question you see between this brief, CLAUDE.md and the starter-kit files.
4. Propose docs/BUILD_PLAN.md for milestones M1–M16 (goal, acceptance criteria, files, tests, risks each), but do NOT write it
   until I approve. Do not write any other file or run any install yet.
