# Progress log

| Milestone                  | Status                        | Branch / tag                               | Notes                               |
| -------------------------- | ----------------------------- | ------------------------------------------ | ----------------------------------- |
| M1 Scaffolding and tooling | done                          | develop · v0.1.0                           |                                     |
| M2 Brand and design system | done; reviewer approved       | develop · v0.2.0 (local)                   |                                     |
| M3 Layout and navigation   | done                          | develop · v0.3.0                           |                                     |
| M4 Data, seed, guides      | done; reviewer findings fixed | feat/m04-m05-data-home · v0.4.0            |                                     |
| M5 Homepage                | done                          | feat/m04-m05-data-home → v0.5.0 (proposed) | Lighthouse mobile 99/100/100/100    |
| M6 Accounts and profiles   | done                          | feat/m06-auth · v0.6.0                     | 80/80 e2e, crawler green            |
| M7 Events and ticketing    | done                          | develop · v0.7.0                           | builder, check-in, Pulse, Who I met |
| M8 Membership and billing  | done; security review fixed   | develop · v0.8.0                           | Lighthouse /pricing 96/100/100/100  |
| M9 Directory and providers | done                          | develop · v0.9.0                           | 104/104 e2e, crawler 200 pages      |
| M10 Guides and concierge   | done; prompt safety approved  | develop · v0.10.0                          | 109/109 e2e, demo works offline     |
| M11 Landing Roadmap        | done                          | develop · v0.11.0                          | 6 scenarios TDD, reminders job      |
| M12 Community + admin      | done; pending review          | feat/m12-community → v0.12.0 (proposed)    | community e2e, command centre       |
| M13 Festivals              | done; pending review          | feat/m13-festivals → v0.13.0 (proposed)    | group tickets, console, stalls      |
| M14 Admin tools + SEO base | done; pending review          | feat/m13-festivals → v0.14.0 (proposed)    | 132/132 e2e (CI=1), sitemap         |
| M15 i18n, SEO and quality  | done; pending native review   | feat/m15-i18n-quality → v0.15.0 (proposed) | Lighthouse 100×4 on 7 routes        |
| M15b Growth                | done; pending review          | feat/m16-growth                            | chapters, ambassadors, careers      |

## Log

### 2026-11-21 · Product-owner audit fixes (branch `fix/po-audit`)

**Fixed**

- **F2 reservation stall:** queries inside reservation transactions now run one at a time and transactions time out after 10 s. New concurrency test (12 people, 5 places): exactly 5 confirmed, 7 waitlisted, finished in under 15 s (`TEST_DATABASE_URL=postgresql://eib:eib_local_only@localhost:5433/eib npx vitest run tests/unit/ticket-concurrency`).
- **F3 slow LCP:** `PageHeader` moves in without fading, so its lead paragraph paints on the first frame. performance 72 to 99, LCP 4.7 s to 1.1 s. The festival page jumped (layout shift 0.48) because its body streamed in behind a hero-only placeholder; the placeholder now fills a screen. Five valid runs: layout shift 0, LCP 1.0 to 1.1 s.
- **F5 admin tabs:** from 1024 px the tab bar wraps, so no tab hides under the search box (phones still scroll sideways).
- **F12 retention:** `npm run jobs -- purge` (concierge 90 days, audit 1 year, deletion requests after 30 days), with unit tests. Not scheduled anywhere yet: add a daily cron on the host.
- **F11 CI:** the workflow only ran on pushes to main or develop and on pull requests, so feature branches never ran. It now runs on every push and pull request, split into a fast check job and a browser-test job (production build, seeded database, embedded guides).

**Verified**: `npm run check` green (331 tests); production build; browser tests 19 of 19 (events, festivals, PWA including a live saved ticket opened offline). Lighthouse above. The first GitHub Actions run has not happened yet: it starts when this branch is pushed.

**Not done, by decision or because it needs you**

- No cookie banner (nothing to consent to, see DECISIONS). About, Partners, Stories and the chapter-launch form need your call.
- pl and uk strings still need a native reviewer (F13 context). Files over 250 lines (audit #8) not split. ZAP and a penetration test (F14) need a machine with more memory.
- Denied pages still return HTTP 200 (F4, by design for V1).

### 2026-11-21 · PWA: installable app, offline page and saved tickets (branch `feat/pwa`)

**Built**

- **Installable:** `app/manifest.ts` (standalone, Deep Teal theme colour, three icon files incl. a maskable one, shortcuts to tickets, events and the concierge), icons made by `scripts/brand-assets.mjs`, viewport with `viewport-fit=cover`, Apple web-app tags. App identity lives in `config/pwa.ts`.
- **Service worker** written in TypeScript (`lib/pwa/sw.ts`, rules in `lib/pwa/rules.ts`) and bundled to the git-ignored `public/sw.js` by `scripts/build-sw.mjs` (runs before `dev` and `build`; esbuild is now an explicit dev dependency). Precaches one offline page per language; keeps hashed build files, logos and optimised images; **never** touches `/api`, Next data requests, writes or other origins. Registered in production only. Served with `Cache-Control: no-cache`.
- **Saved tickets:** the ticket page saves the member's confirmed ticket (QR included) on the device and shows "Saved on this device". At the door the worker shows the saved copy when the network is gone or slower than 4 s. Copies expire a day after the event, are limited to 12, live in their own cache and are wiped on sign-out (`lib/pwa/private-cache.ts`).
- **UI:** designed `/offline` page (self-drawing Wi-Fi illustration, retry, auto-reload on reconnect, saved-ticket list, empty state), network pill that slides in when offline and confirms when back, update toast with "Reload", install card (Chrome/Edge dialog, or "Add to Home Screen" steps on iOS; 15 s delay, 30-day snooze, never inside the app), footer "Install the app" link that only exists when installing is possible, and an app-style bottom tab bar that appears only in the installed app on phones (with safe-area padding). CSS-only entrances, transform and opacity only, reduced motion respected.
- Strings for the `pwa` namespace in en, pl and uk (pl/uk machine-translated, pending native review).

**Verified**: `npm run check` green (329 unit tests, 14 new); production build green; `tests/e2e/pwa.spec.ts` 11 passed (manifest and icons, worker headers, offline page with axe at 1440 and 375 px, Polish page, saved-ticket list, real offline fallback and recovery). A signed-in demo member's reserved ticket was also verified in a real browser: saved, opened offline with its QR code, and gone offline after the saved data was cleared. Not yet run on a phone: the install prompt, the iOS steps and the installed-app tab bar.

**Known gaps**

- Push notifications and offline check-in for door staff are not part of this step.
- Large app icons are upscaled from the 270 px monogram (a vector logo from EiB would make them sharper).
- Saved tickets are removed on sign-out but not yet when an account is deleted from settings.

### 2026-11-17 · Evidence pass and the complete project report

**Built and fixed**

- **Accessibility:** full axe sweep of every route (76 routes, 208 checks). One serious finding (account button name did not contain its visible text, WCAG 2.5.3), fixed in `components/auth/user-menu.tsx` with a unit test. Browser re-check pending a rebuild.
- **Security scans:** Gitleaks over the whole history (0 leaks), Trivy and `npm audit` (0 production vulnerabilities). OWASP ZAP did not finish (stopped by low memory).
- **Findings recorded:** GitHub Actions has 0 runs; the brief's chapter-launch form, About/Partners/Stories pages, cookie banner and retention purge job do not exist.
- **Document:** `docs/EiB-Platform-Report.pdf` (30 pages for Ziyan: requirements traceability, features, admin features, environments, testing, accessibility and security reports, findings register, go-live plan). Source `docs/pdf/report.html`, data `docs/test-evidence/report-data.json`; build with `node scripts/build-pdf.mjs docs/pdf/report.html docs/EiB-Platform-Report.pdf docs/test-evidence/report-data.json`.

**Known gaps**: ZAP and a penetration test; manual screen-reader review; the unbuilt brief items (decision needed); CI never ran.

### 2026-11-14 · Navigation: Team in the header, footer split in two

**Built**

- `Team` is now the sixth item of the main menu (header and mobile menu), and is no longer repeated in the footer directory list.
- The 12-link "Platform" footer column is split into two balanced columns, **Explore** (the main menu) and **Community** (businesses, Bubbles, festivals, get involved, sign in, help). Strings added in en, pl and uk; the footer grid is 8 columns on large screens.
- The footer email breaks at the "@" instead of in the middle of a word.
- The festival pill in the header now shows from 1536 px (was 1280 px): with six menu items it made the header overflow sideways between 1280 and about 1440 px. The home banner still links to the festival at every width.

**Verified**: header has no sideways overflow at 1920, 1536, 1440, 1366, 1280, 1100, 1024, 768 and 375 px; `npm run check` green (315 tests); link crawler 300 pages, 0 problems (no duplicate header or footer links); browser tests for home, quality (phone width), growth, i18n and team: 54 passed, 0 failed. Screenshots and the PDF were refreshed.

**Note**: after changing shared layout code, delete `.next` before building locally; a stale prerender kept the old footer on `/` until a clean build.

### 2026-11-14 · Release candidate: deep testing, fixes, README, PDF and deploy guide

**Built and fixed**

- **Defect found and fixed (High):** `/api/account/export` (GDPR data download) returned HTTP 500 for every member since M6; the relation is `userEmails`, not `emails`. Regression tests in `tests/e2e/privacy.spec.ts`.
- Team emails are no longer in the page HTML: "Show email address" fetches them on demand from a POST-only, rate-limited route.
- Real email providers: `SMTP_USER`, `SMTP_PASSWORD` and `SMTP_SECURE` added (before, only a login-less Mailpit worked).
- `npm run admin:grant -- email` creates the first admin on a clean production database.
- `docs/DEPLOY.md` (free path: Render, Neon, Brevo, GitHub Actions), a rewritten `README.md`, `docs/EiB-Platform-Overview.pdf` (25 designed pages, numbers filled from `docs/test-evidence/summary.json`) and `docs/TEST_REPORT.md`.
- Scripts: `qa-access.mjs`, `qa-sweep.mjs`, `qa-analyze.mjs`, `capture-screenshots.mjs`, `build-pdf.mjs`, `check-pdf-overflow.mjs`, `grant-admin.ts`.

**Verified**: `npm run check` green (315 unit tests); production build; 99 of 99 runnable desktop e2e tests pass in clean serial runs (first parallel run: 168 passed, 3 failed, 2 flaky on a slow laptop); link crawler 300 pages, 0 problems; access and security probes 39 of 39; `npm audit --omit=dev` 0 vulnerabilities; Lighthouse accessibility and best practices 100 on 6 pages.

**Known gaps (details in docs/TEST_REPORT.md)**

- F2 intermittent reservation delay under parallel load (unproven link to concurrent queries inside one transaction).
- F3 slow LCP on `/team` and the festival page; F4 denied pages return HTTP 200 (no data exposed); F5 admin tab bar clipped by the search box.
- The full route sweep (`scripts/qa-sweep.mjs`) was stopped after 18 routes; cross-browser, screen-reader, load and live-integration tests are not done.
- The three team migrations were not squashed: Prisma refuses `migrate reset` from an agent. To squash, delete the three `20261114*` migration folders, run `npx prisma migrate reset --force` yourself, then `npx prisma migrate dev --name team_page`.

### 2026-11-14 · Team page, admin editor and proprietary license

**Built**

- Public `/team`: the founder's message and people grouped as founders, leads, team and volunteers, with photo or initials, designation, time with EiB, LinkedIn and an opt-in email. Designed empty state with a next action.
- Admin editor `/admin/team` (admins only): edit the founder's message, add, edit, hide and delete people, upload photos. Every change is rate-limited, Zod-validated and audited, and refreshes the `team` cache tag.
- Photos are decoded and re-encoded as 640 px WebP by `sharp` (so non-images are rejected and EXIF data is dropped), stored in Postgres and served by `/api/team/photo/[id]` with a versioned URL. Hidden people's photos are not served.
- Models `FounderMessage` and `TeamMember` (3 migrations), labeled "Demo profile" seed rows flagged `isDemo` (cleared by `demo:reset`; saving in the editor clears the flag), strings in en, pl and uk, footer and admin links.
- `LICENSE`: proprietary, all rights reserved, Expats in Business only (draft: have a lawyer review it). `package.json` license is `UNLICENSED`.
- Tests: 7 schema unit tests, 4 e2e tests (visitor + axe, admin guard, add/hide/delete with a photo, non-image rejected). `npm run check` green (315 tests).

**Known gaps**

- Server Actions body limit raised to 3 MB for photo uploads (`next.config.ts`).
- Public mailto links can still be scraped; emails are shown only when the person opted in.
- Not yet run: full e2e suite and the link crawler with the new footer link.

### 2026-11-13 · Final polish, part 2: audit follow-up

**Built**

- Clock reads moved behind `connection()` on admin members/applications, event page and festival tickets panel; chapter and country queries cached with the `chapters` tag and refreshed by ambassador actions (audit #4).
- `scripts/lighthouse.mjs`: optional `LH_JSON=1` output and LCP error reporting.
- README: low-memory demo advice (audit #9).
- Audit #1, #2, #3, #5, #6, #7, #8 were already done in earlier commits (verified in code).

**Verified**: `npm run check` green (308 unit tests).

**Known gaps**: audit parts 3 to 7 (screenshot pass, axe and keyboard per route, Lighthouse, coverage) not run yet.

### 2026-11-13 · RSVP and un-RSVP on every event and festival

- **Un-RSVP where you RSVP'd**: event page, festival tickets panel and ticket page share one component with an inline two-step confirmation (no browser dialog; focus moves to "Yes, un-RSVP"; Escape or "Keep my place" closes it). Waitlist spots get "Leave the waitlist".
- **Server**: `cancelTicket` validates the id with Zod, is rate-limited with RSVPs (20 per hour), refuses after check-in or start, cancels with a conditional update (a double click promotes the waitlist once), and refreshes the festival page at once.
- **Fixes**: the event and festival builders preselect a chapter that has venues (the demo Indore chapter sorted first and made "Create" fail).
- **Verified**: `npm run check` green (308 unit tests); e2e events, check-in (waitlist promotion via un-RSVP) and festivals all green on desktop; the new test covers RSVP → un-RSVP → RSVP again, focus and Escape.

### 2026-11-13 · Growth: chapters, ambassadors, careers, volunteering, festival spotlight

**Built**

- **Chapters world view** (`/chapters`): every country with its landmark panorama, live and launching chapters and the cities members ask for; members vote for their city (rate-limited, duplicates ignored, refused where a chapter already exists).
- **Country hubs** (`/countries/[code]`) and **city chapter pages** (`/chapters/[slug]`): facts (members shown only from 5), upcoming sessions, ambassadors, join or help-launch actions.
- **India and Indore (demo)**: original line drawings of India Gate (with Lotus Temple, Himalaya and Ganga) and Rajwada Palace (storeys, jharokhas, corner chhatris, river Khan); lotus accents.
- **Ambassador programme** (`/ambassadors`): global, country and city tiers, detailed application (place, motivation, experience, languages, hours, LinkedIn), my applications with withdraw, public list of ambassadors.
- **Careers** (`/careers`, `/careers/[slug]`) with a filter by type, and **Volunteer** (`/volunteer`): festival shifts with open places, ongoing volunteer roles, ambassador path.
- **Admin**: `/admin/ambassadors` and `/admin/roles` (review boards with only server-allowed moves, role editor draft/open/closed), audited, applicants notified; new sections in the command centre.
- **Festival spotlight**: header pill and homepage banner with an animated ring and a days-until countdown for the next festival; seeded "Cultoura (demo edition)".
- Footer column "Grow with EiB"; en, pl and uk strings with few/many plurals.

**Verified**

- `npm run check` green: 308 unit tests (new tests/unit/growth.test.ts: review moves, place and details validation incl. LinkedIn host and scheme, city keys, labels, nav).
- All new routes 200 in en, pl and uk on the dev server; India and Indore art checked at 1440 px and the chapters page at 375 px (no sideways scroll).
- e2e on the dev server (2 workers): growth.spec.ts 21/21 (pages + axe on desktop and mobile, panoramas, spotlight, careers filter, ambassador apply → admin accept, role apply and withdraw), festivals.spec.ts 5/5, admin-tools.spec.ts green.
- Fixed during the work: chapter metadata no longer reads the clock while prerendering (cached `getChapterMeta`); the ambassador form gets country and language names from the server (Node and Chrome differ, which broke hydration); review-board buttons toast when the action resolves (`toastOnResolve`; the card moving column used to swallow the confirmation); the festival builder preselects a chapter that has venues (the new demo Indore chapter sorted first); the tamper e2e waits for hydration before editing the party size.

### 2026-11-13 · M15 i18n, SEO and quality

**Built**

- **Polish and Ukrainian**: every user-facing string (about 1,700 per language) translated, with correct Slavic plurals (1 osoba / 2 osoby / 5 osób; 1 людина / 2 людини / 5 людей). Marked machine-translated, not reviewed. The language switcher now also remembers the choice for signed-in members.
- **Emails in the member's language**: sign-in link, email verification, ticket confirmed/waitlisted/promoted, roadmap reminders and provider quote notices; links point to the member's language version.
- **Guides**: Polish and Ukrainian titles and summaries for all 8 guides, labelled "machine-translated, not reviewed"; the guide body stays English with its official sources.
- **Formats per chapter**: next-intl default timezone from the live chapter (database, not hard-coded); dates, numbers and currency follow the reader's language and the chapter's zone and currency.
- **SEO**: canonical + hreflang (en, pl, uk, x-default) on every indexable public page; social cards for every session and festival; Article JSON-LD on guides; FAQPage on help and festival FAQs; Bubble pages indexable with real titles.
- **Quality**: festival page restructured (cached public data, streamed viewer parts, skeleton with the hero's height), split into components; countdown gets `role="timer"`.
- **Fixes**: messages deep-merged over English (no raw keys if a nested key is missing).

**Verified**

- `npm run check`: 296 unit tests, including catalogue checks (same keys, valid ICU, every placeholder kept, few/many plural forms), email language, hreflang and guide-summary units.
- Lighthouse (mobile, production, installed Chrome): `/`, `/events`, `/festivals/demo-festival-of-cultures`, `/pricing`, `/pl`, `/uk/festivals/…`, `/uk/guides` all **100 / 100 / 100 / 100** (performance, accessibility, best practices, SEO), LCP 0.9 to 1.1 s, CLS 0 to 0.007.
- New e2e: `tests/e2e/i18n.spec.ts` (html lang, translated headings, canonical and hreflang, axe clean in pl and uk, machine-translation label, festival OG image and FAQ JSON-LD, robots and sitemap) and `tests/e2e/quality.spec.ts` (reduced motion stops animations, skip link and visible focus in Ukrainian, no sideways scroll at 375 px on six localized pages).
- A Polish sign-in email checked in Mailpit ("Twój link do logowania").

**Known gaps**

- Translations need a native-speaker review before launch (the status marker stays until then).
- Concierge answers stay English (grounding compares against the English guides).
- Legal documents are English only (labelled on the page).

### 2026-11-13 · M14 completed: applications board, catalogs, sponsor report; SEO basics

**Built**

- **Get involved** (`/get-involved`, footer link): members apply to speak, share their story or contribute. Name and email come from the account (nothing extra collected); one open application per kind; 3 an hour, 6 a day; text cleaned like posts. Members see the status of their applications.
- **Applications board** (`/admin/applications`): New → In review → Accepted / Declined columns with one-click moves, pitch and link on each card; chapter leads see their chapter only; every move audited with from/to; applicants notified on accept/decline.
- **Catalogs** (`/admin/catalogs`, admin only): edit plan prices, proposal/approved status and "on sale"; edit or add event formats and provider categories. New checkouts use a new price at once; existing subscriptions keep theirs. Audit entries record old and new amounts. Cache tags (`plans`, `formats`, `directory`) refresh the public pages immediately.
- **Signed sponsor report** shipped with M13 (`/sponsor-report/<token>`).
- **SEO**: `robots.txt` (member, admin, API, token and tool URLs disallowed in every locale) and `sitemap.xml` (46 URLs in the demo: static pages, guides, upcoming sessions and festivals, Bubbles) with en/pl/uk alternates.

**Verified**: `npm run check` green (281 unit tests); production build; Playwright 132 passed, 0 failed, 1 flaky (free reservation redirect over 5 s under load, then the waitlist promotion passed on retry); robots and sitemap fetched from the production server.

**Not done yet (M15/M16)**: Polish and Ukrainian translations of all new screens; Lighthouse pass on the new pages; demo script and handover README for v1.0.0-demo.

### 2026-11-13 · M13 Festivals (big cultural events)

**Built**

- **Public** `/festivals` (upcoming and past) and `/festivals/[slug]`: hero with live countdown and places left, sticky section nav, ticket tiers with live state (on sale, only N left, sold out, sales ended), group orders with a +/− party picker and running total, programme by day and stage, partners, volunteer shifts with fill bars, stall application form, FAQ, schema.org Festival JSON-LD with sub-events.
- **Organiser console** `/admin/festivals` (list with sales bars and stalls to review), `/admin/festivals/new`, `/admin/festivals/[id]` with tabs: Overview (6 live stats: places sold, ticket revenue, checked in, waitlist, volunteers, stalls; launch checklist ring), Tickets (tiers with caps, early-bird deadlines, order), Programme, Volunteers (shifts and who signed up), Stalls (accept / waiting list / decline with note, applicant notified), Partners & FAQ (partners get a signed report link), Settings (details, capacity, max per order, volunteering and stalls switches, stall fee). Publish / unpublish, cancel behind a confirmation, door check-in, attendee CSV. All actions audited and rate-limited; chapter leads manage only their chapters.
- **Ticket engine**: party size and tier caps throughout (claim, hold renewal, Stripe line quantity, webhook amount check, waitlist promotion); door check-in shows "(×3)" for groups; ticket page says "Admits 3 people".
- **Sponsor report** `/sponsor-report/<token>` (M14 item): 192-bit token per sponsorship, aggregates only with counts under 5 hidden, no-referrer, noindex, print stylesheet and "Print or save as PDF".
- **Business model** written up in `docs/BUSINESS_MODEL.md` (who pays for what, sequencing, open decisions; proposals only, no invented numbers).
- Demo seed: "Demo: Festival of Cultures" (3 weeks out, two days, four demo tiers, eight programme items on five stages, four shifts, two placeholder partners with permission pending, three FAQs, group tickets, two stall applications).

**Security checks done in the browser**: a party size changed to 15 in DevTools is refused by the server ("Please check the number of people") and no ticket is created; members get the 403 page on the console and 403 from the attendee export; shift sign-up locks the shift row, so the last place can't be taken twice, and overlapping shifts are refused.

**How to test**: `npm run demo:reset`, `npm run dev`. As Priya: /festivals → Demo: Festival of Cultures → Family day pass → 3 people → Reserve → ticket "Admits 3 people"; volunteer for a shift; apply for a stall (as another member). As admin: /admin/festivals → console tabs; accept the stall; download the attendee CSV; open a partner's sponsor report and print it.

**Known gaps**: stall fees are shown and invoiced by the team (no online stall payment yet); refunds for a cancelled festival are done in the Stripe dashboard; partner logos need written permission before upload (names only for now); pl/uk strings fall back to English.

### 2026-11-12 · M12 Community, command centre, dashboard and security hardening

Covers BUILD_PLAN M13 (community) and the core of M14 (admin command centre). Numbering note: this log numbers milestones in the order they shipped, one behind BUILD_PLAN.md.

**Community**

- **Groups** (`/community`, `/community/[slug]`): chapter and Bubble groups; posts, questions and moderator announcements (pinned automatically); reactions from a fixed allow-list with optimistic updates; report with a reason; authors delete their own posts; "older posts" pagination; group guidelines. Who can post: Bubble members (Bubble groups), home-chapter members (chapter groups), moderators everywhere.
- **Moderation** (`/moderation`): reported posts in the groups you moderate (Bubble Lead: own Bubble; chapter lead or moderator: own chapter; admin: all). Keep (restore, dismiss reports) or remove (author notified). Audited. Auto-hide after 3 distinct reports.
- **Bubbles** (`/bubbles`, `/bubbles/[slug]`): server-rendered SVG world map (no map JS) shaded by members, counts under 5 hidden, each shaded country a labelled, keyboard-focusable link; the list alternative is always shown; map behind the `bubblesMap` flag. Bubble page: lead, opted-in members, Bubble sessions (Event.bubbleId), group link, join/leave, show/hide me (hidden by default).
- **Coffee Roulette** (`/roulette`, `npm run jobs -- roulette`): opt in per chapter or joined Bubble; weekly idempotent draw (unique scope + week); no repeats within 8 weeks; trios for odd numbers; Member Plus first; everyone must accept, any decline cancels; emails shown only after confirmation; placeholder café labelled "no partnership yet" (config/roulette.ts).

**Dashboard**: time-of-day greeting in the chapter timezone, quick actions, pending-connection banner, four animated stat cards (all links), roadmap with the next three steps, profile-strength ring naming what is missing, next session, Coffee Roulette state, unread notifications, activity from your groups, suggested people.

**Admin command centre** (sub-navigation on every admin page, Ctrl/Cmd+K command palette)

- **Overview**: 8 KPI cards (chapter leads see only their chapters), sign-ups and check-ins over 30 days (SVG bars with tooltips and a table view), member-journey funnel up to "made a connection", recent activity, chapter health table (flags chapters without a lead).
- **Members** (admin only): search, status and role filters, pagination; grant/revoke chapter roles; suspend (ends every session) / reinstate; CSV export (same-origin only, 10 an hour, audited, safe against formula injection).
- **Audit log** viewer with an action filter. **Settings**: feature-flag toggles, site banner, chapter announcements (max 5 a day). **Roulette**: per-scope stats and "draw now". **System**: DB latency, payments/AI/proxy checks, rate-limit pressure per bucket (aggregated, no ids), latest migration, last job runs.

**Security**: static CSP + COOP/CORP + HSTS (https only) + camera for the scanner only; Postgres-backed per-account limits on every new write and on Better Auth; suspension enforced at sign-in and on every request; every id from a form re-checked server-side; plain-text posts with invisible and bidi characters stripped. Details in docs/DECISIONS.md.

**Schema**: migration `20261112150000_community` (roulette tables, Event.bubbleId, User.suspendedAt/suspendedReason, Post.removedAt, PostReport.resolvedAt/resolvedById, SiteSetting, audit index). Demo seed `prisma/seed/demo/engagement.ts`: labelled demo posts and reactions, one reported post, two Bubble sessions, a roulette round including Priya and Karim.

**How to test**

1. `npm run demo:reset`, then `npm run dev`. As Priya (`priya@demo.eib.local` / `Demo!2026`): /dashboard, /community/bubble-in (post, react, report), /bubbles, /roulette (accept the match).
2. As admin (`admin@demo.eib.local`): /admin (press Ctrl+K), /moderation (remove the reported post), /admin/members (suspend a demo member, then try to sign in as them), /admin/settings (turn the Bubbles map off and look at /bubbles; set a banner), /admin/audit, /admin/system.
3. `npm run check` and `npm run build`; start the production server on port 3000 with `AI_PROVIDER=demo`, then `CI=1 E2E_BASE_URL=http://localhost:3000 E2E_EXPECT_DB=true npx playwright test`.

**Verified**: `npm run check` green (unit tests include tests/unit/community.test.ts, admin-rules.test.ts and roulette.test.ts); production build; Playwright 123 passed, 1 flaky (magic-link 2 s timing), 0 failed, including the new tests/e2e/community.spec.ts; manual browser pass at 1024/1280 and 375 px (dashboard, groups, Bubbles map, moderation, admin pages).

**Known gaps**

- Under parallel e2e load two timing tests are sensitive: "magic link to dashboard < 2 s" (2.0 to 2.4 s while the crawler runs, 0.7 s idle) and the free-ticket redirect (5 s budget). Both pass on retry.
- Restart the server after `npm run demo:reset`: cached venue lists otherwise point at deleted rows (the event builder shows no venues).
- This database had no guide embeddings (fresh Docker volume): run `npm run embed` after setup, or the concierge e2e fails.
- Not built yet from M14: applications board, /admin/catalogs (formats, categories, plans), signed sponsor report with a print stylesheet.
- The CSP still allows inline scripts (needed by the streamed App Router bootstrap without nonces).
- pl/uk strings for the new screens fall back to English until M15.

### 2026-11-12 · M11 Landing Roadmap 30/60/90

**Shipped** (test-driven: `tests/unit/roadmap.test.ts` was written before the rules)

- **`lib/roadmap/rules.ts`**, a pure, deterministic function: onboarding answers + country + arrival date → ordered tasks. Selection by residence situation, goals (founders imply "find clients") and `skipForCitizens` (a Polish returnee needs no PESEL or residence application); dependency-first order (Kahn) with the brief's sequence as tie-break; due date = arrival + day 7/30/60/90 offset, never before a dependency.
- **Scenarios** (unit tests): Priya (non-EU employee), Karim (non-EU founder: + tax basics, KSeF after tax basics), student, family member, EU citizen (no MOS), Polish returnee (no PESEL, no MOS; trusted profile no longer waits for PESEL).
- **Regeneration** (`mergeRoadmap`, `syncRoadmap`): completed steps are always kept, new ones added, open ones that no longer apply removed, open due dates follow a changed arrival date. Runs on every onboarding save once onboarding is complete.
- **/roadmap**: three columns (first 30 days, 31–60, 61–90) on desktop, numbered stepper on mobile; each step shows why it matters, the guide link, the official page, due or overdue date, dependencies, and a done toggle (real form; SuccessCheck draws in; toast). Progress ring and count, "Add deadlines to my calendar" (.ics, all-day events, open steps only), "Change my answers".
- **Dashboard**: roadmap card with progress ring, next step and link.
- **AI intro**: two sentences from task titles only (no personal data); rejected unless 1–2 plain sentences, no links or numbers; cached per plan; template fallback with AI_PROVIDER=demo or offline. The AI never sees or changes selection or order (unit test).
- **Reminders**: `npm run jobs -- reminders` emails each member once about steps due in about 7 days (`UserTask.remindedAt`; a changed due date resets it). `scripts/jobs.ts` is the job runner (roulette arrives in M12).
- Seed: "why it matters" text per task (no legal detail; that lives in sourced guides); Priya and Karim have fixed residence situations and recent arrival dates for demos. Migration `20261112130000_roadmap` (`RoadmapTask.skipForCitizens`, `UserTask.remindedAt`).

**Verification**: `npm run check` green (236 unit tests incl. 18 roadmap); production build; Playwright 112 passed, 1 flaky (waitlist redirect timing, passed on retry), including `tests/e2e/roadmap.spec.ts` (founder plan in columns with official link and axe, done persists, editing onboarding regenerates and keeps the completed step, calendar export, dashboard ring); reminder job verified against Mailpit (one email, none on the second run); crawler green on 200 pages.

### 2026-11-12 · M10 Guides and AI concierge

**Shipped**

- **/guides** and **/guides/[slug]** (prerendered): last-verified badge, official sources box (https, allow-listed hosts in `config/official-sources.ts`), "General information, not legal advice" disclaimer, related guides, "Ask the concierge". Frontmatter gains `verificationStatus` (drafts are never embedded) and `related`.
- **`npm run embed`** (`scripts/embed-guides.ts`, part of setup): heading-aware ~500-token chunks (TODO notes excluded), local all-MiniLM-L6-v2 embeddings (384-d, cached in `MODEL_CACHE_DIR`, offline after the first run), pgvector HNSW; idempotent per guide. 8 guides → 29 chunks in 18 s. The model is warmed at server start (`instrumentation.ts`).
- **`lib/ai/provider.ts`**: one interface over groq → gemini → openrouter → anthropic → demo (AI SDK v7 `streamText`, `instructions`, first-chunk and total timeouts, SDK retries off). `lib/ai/chain.ts` falls back on 429, 408, 5xx, timeouts and network errors (unit-tested with fake adapters), demo always last.
- **Retrieval** (`lib/ai/retrieval.ts`): top 5 passages by cosine similarity in the member's country, threshold 0.4 (calibrated: on-topic 0.49–0.82, off-topic and injection ≤ 0.20); keyword fallback needs two real terms.
- **Answer gate** (`lib/ai/concierge.ts`): the whole answer is buffered and judged before anything is sent. Every sentence must cite a retrieved passage, contain no malformed citation, not be NO_ANSWER in any spelling, and be grounded: its content words largely, and every number, date, amount and code entirely, must appear in the cited passage. Otherwise a handoff card (verified providers, free Information Point for Foreigners). Only cited sources reach the browser.
- **Privacy**: questions are redacted (email, phone, PESEL, NIP, IBAN and Polish account numbers, cards, documents, street addresses, postcodes, self-introduced names in EN/PL/UK, URLs) before the model and the log; the prompt contains only the question and passages, wrapped as escaped data with injection rules; `ConciergeQuery` stores the redacted question, cited chunk ids, provider and outcome only.
- **Abuse limits**: members only; 5/min burst; 10/day free (unlimited with Member Plus); per-IP daily limit through `TRUSTED_PROXY_HOPS`; platform-wide daily budget (`AI_GLOBAL_DAILY_BUDGET`) after which the offline demo adapter answers; 4 KB request cap; SSE closes cleanly on disconnect.
- **/concierge**: chat with suggested questions, numbered citations linked to source chips (guide, official page, last verified), Stop, quota hint, privacy note.

**Reviews**: prompt-safety reviewer: first "changes required" (uncited text could be shown), then "approved with notes" after the fixes; its blocking note (numbers not grounded) is fixed. Open notes: a sentence could still negate passage words (label and source links stay visible); verified email not yet required (global budget caps cost).

**Verification**: `npm run check` green (217 unit tests); production build; Playwright 109/109 including `tests/e2e/concierge.spec.ts` with `AI_PROVIDER=demo` (cited answer with official gov.pl link, off-topic handoff, injection not answered, guide page sources and disclaimer, axe); crawler green on 200 pages; zero server errors.

**Also fixed**: DB pool connection timeout 2 s → 10 s (spurious failures under load); `demo:reset` removes events created by demo accounts; event `<head>` metadata cached and time-independent; guide pages `instant = false` (header reads the URL during background re-renders).

**Notes**: answers are in English until translated guides exist (grounding compares against the English text). AI SDK installed as v7 (the brief says v6; v7 is current; checked against the installed docs because Context7 is not configured). The project now lives in `D:\eib-platform` (C: was full).

### 2026-11-12 · M9 Directory, connections and verified providers

**Shipped**

- **/members**: search by name or headline plus filters (chapter, industry, language, origin, skill, open to coffee) as a plain GET form, so filters combine, live in the URL, survive reloads and work without JavaScript. Strict parsing (`lib/directory/filters.ts`): malformed values are dropped and wildcards stripped. Privacy: a filter only matches members who show that field (filtering on a hidden field would reveal it); visitors see name, headline and chapter only and cannot filter by private fields even with a crafted URL; the origin list offers only countries with 5+ visible members.
- **Connections** from profiles: double opt-in with an optional note, 20 requests a day, no new request after a decline; the contact email appears only to the two people after acceptance (profile panel and /connections).
- **Notifications**: connection requests and acceptances, quote requests and replies, verification decisions; header bell with unread count, /notifications with mark-all-read. Messages are stored as type + values and rendered in the reader's language.
- **/providers** and provider pages: categories, language and verified filters, ProviderCard with rating, response time and a Verified badge that links to the criteria page; services, languages, reviews. **/businesses** with category filter (8 labelled demo businesses).
- **Reviews** only for members who sent the provider a quote request or attended a session with its owner; never the owner, once per member; checked again on the server (`lib/directory/eligibility.ts`).
- **Quote requests** (5 per member per day) → provider inbox (accept or decline; the requester's email appears after accepting) with notification and a link-only email.
- **Analytics** for providers: views and quote requests from daily counters (`ProviderDailyStat`), weekly table and accept rate; no per-viewer data is ever stored.
- **Verification**: owners request it; admins work a queue and a checklist built from `config/verification.ts`, the same list the public **/providers/verification-criteria** page shows; approval requires every check, is audited, and is the only way to get the badge.
- **Database**: GIN indexes on profile languages and skills, B-tree indexes for chapter, industry and coffee filters, and `pg_trgm` trigram indexes on member, provider and business names and headlines (migration `20261112090000_directory`).
- Shared `Fact` component with valid definition-list markup (axe `definition-list`/`dlitem` fix, also on the event page).

**Verification**: `npm run check` green (173 unit tests); production build; Playwright 104/104 including the new `tests/e2e/directory.spec.ts` (filters combine in the URL, visitor limits and crafted URLs, ineligible member cannot review until a quote request, badge only after approval with all checks, double opt-in with contact after acceptance and notifications, provider inbox and analytics, 403 for non-providers, axe on each page); link crawler green on 200 pages.

**Notes**

- Migration gotcha: Better Auth's user table is mapped to `"user"`; raw SQL must use that name.
- The lead fee per accepted request (Verified Provider plan) is not recorded yet; it belongs with provider billing in a later milestone.

### 2026-11-11 · M8 Membership, billing and entitlements

**Shipped**

- **/pricing** built from the Plan table (no price in code): Community, Member Plus, Business, Verified Provider, Corporate. Banner "Test mode · proposed prices, not yet approved · net of VAT". Equal-height plan cards, per-lead fee shown for providers, FAQ. Static page: the monthly/yearly switch is two radio buttons and CSS `:has()`, so it works without JavaScript. Lighthouse (mobile) 96 / 100 / 100 / 100.
- **Subscriptions** (`server/actions/billing.ts`): Stripe Checkout in subscription mode with the amount and interval from the Plan row; a Stripe customer per member (stored once). Without keys, demo mode simulates an active plan and says so. Existing Stripe subscribers switch plans in the billing portal (no double billing).
- **Webhook** syncs `customer.subscription.*` and subscription checkouts (`lib/billing/sync.ts`); our ids travel in subscription metadata; one active plan per member.
- **Settings, Billing**: current plan, price, "renews on" or "ends on", cancel at period end and resume (Stripe first when real), Stripe portal when configured.
- **Entitlements**: `past_due` keeps access while Stripe retries the card (shared `ENTITLED_STATUSES`); `hasEntitlement` reads the tiers from the session.
- **/pricing/corporate**: enquiry form to the team inbox, rate-limited.
- Navigation: Pricing is live.

**Security review** (reviewer subagent over M6–M8; no critical findings). Fixed:

- High: a lapsed hold could overbook (`renewHold`, re-decided claims); a stale or cheaper Checkout session could confirm a ticket and an old session's expiry could cancel a newer hold (tickets now confirm only from their current session at the ticket-type amount while a place is free; anything else is refunded; stale sessions are expired).
- Medium: webhook marker removed when handling fails, so Stripe retries; open redirect via `/\` on sign-in (`lib/safe-redirect.ts`); double subscriptions; Checkout `expires_at` below Stripe's 30-minute minimum (now 31 min, hold 35 min) and idempotency-key reuse.
- Low: online links https only; Pulse origins respect `showOrigin` and private profiles.
- Accepted for now (documented): Pulse streams are not capped per user (leads only, 4 h maximum); contact and corporate form limits key on `x-forwarded-for`, which a client can set; behind the production proxy use the platform's client IP or add a captcha (M16 hardening).

**Verification**: `npm run check` green (161 unit tests); production build; Playwright 98/98 at 1440 and 375 px including axe; link crawler green on 117 pages; Lighthouse `/` 99/100/100/100 and `/pricing` 96/100/100/100.

### 2026-11-11 · M7 part 2: check-in, Pulse, Who I met, event builder

**Shipped**

- **Event builder** `/admin/events/new` (chapter leads for their own chapters, admins everywhere): format with its usual length, date and time in the chapter's timezone, venue of that chapter or an https online link, places, price; publishes straight away; audit-logged. The e2e test builds two events well under the two-minute target.
- **Admin events** `/admin/events`: upcoming and last two weeks, with Check-in, Pulse and public-page links.
- **Door check-in** `/admin/events/[id]/check-in`: camera QR scanning (`@zxing/browser`, lazy-loaded) and manual name search; big colour-and-icon result (never colour alone) with vibration; `/api/checkin` checks the chapter permission, allows 60 scans per minute, rejects malformed tokens, and a ticket checks in once (unique CheckIn row, safe for two scanners at once). Wrong-event, unconfirmed and unknown tickets never reveal a name.
- **Pulse** `/admin/events/[id]/pulse`: big-screen live view over Server-Sent Events (every 3 s, auto-reconnect): checked in, room filled, arrivals in the last 10 minutes, countries only for groups of 5 or more.
- **Who I met** `/met/[slug]`: after check-in, opt in to be visible to other attendees who also opted in; one-tap connection request; the other person accepts or declines on `/connections` (double opt-in). The ticket page links to it after check-in.
- Shared `lib/slug.ts` (Polish letters) and `lib/audit.ts`.

**Tests**: `tests/e2e/checkin.spec.ts` (builder, waitlist promotion on cancel, manual check-in and single use through the API, members get 403 on scanning, Pulse SSE, Who I met to accepted connection); unit tests for scan classification and token parsing. Test sign-ins now happen once per run in `tests/e2e/global-setup.ts` (shared personas), so the suite stays under the 5-per-minute sign-in limit.

### 2026-11-11 · M7 part 1: events, RSVP, waitlist, payments, tickets

**Shipped**

- **/events**: upcoming and past sessions, filtered by format through plain links (shareable, no JavaScript needed), equal-height cards, designed empty state. **/events/formats** explains each session type with its usual length (old bug 9).
- **/events/[slug]**: date and time in the chapter's timezone (with the zone name), venue, address and map link (styled external link), price, places left, waitlist size, description, schema.org Event JSON-LD, and an **.ics** download (`/api/events/[slug]/ics`, RFC 5545: UTC times, escaping, 75-octet folding).
- **RSVP** (`server/actions/rsvp.ts`, `lib/events/`): free sessions confirm straight away; paid sessions hold a place for 30 minutes while the member pays; full sessions put people on the waitlist. The event row is locked (`SELECT … FOR UPDATE`), so two people can never take the last place. Cancelling (or an expired or failed payment) promotes the oldest waitlisted member at once and emails them; a promoted paid ticket is held and the email asks them to pay.
- **Payments**: Stripe Checkout in test mode only (live keys are refused). BLIK and Przelewy24 are offered for PLN, card everywhere; the amount always comes from the database; one Checkout session per hold (idempotency key). Without Stripe keys, demo mode simulates the payment and the ticket page says so.
- **Webhook** `/api/stripe/webhook`: signature verified; each Stripe event handled once (`StripeEvent` table, migration `20261111120000_stripe_events`); status changes are conditional (reserved → confirmed or cancelled), so retries are harmless.
- **/tickets/[id]**: owner-only page with the QR code (a random token, never the ticket id; server-rendered SVG in brand colours), status, payment notice, online joining link, pay and cancel buttons. Emails for confirmation, waitlist and promotion link to it.
- Navigation: Events is live.

**Verification**: `npm run check` green (148 unit tests, including capacity, waitlist order, reservation window and .ics); production build; full Playwright suite 86/86 (new `tests/e2e/events.spec.ts`: filters and axe, event facts and .ics, sign-in prompt, free RSVP → QR → cancel, paid ticket via simulated payment, webhook rejects unsigned calls); link crawler green on 60 pages.

**Notes**

- The waitlist end-to-end path (fill an event, promote on cancel) is covered by unit tests of the pure rules and the row-locked transaction; a browser test needs a full event fixture and is planned with the event builder in part 2.
- Real Stripe payments need test keys in `.env` and `npm run stripe:listen` for the webhook; without them, demo mode simulates payment.
- Cancelling a paid ticket shows "refund within 5 working days" but does not refund automatically yet (a Stripe refund call arrives with the admin tools).

**Next (M7 part 2)**: check-in scanner (QR, manual search, single-use, rate-limited), Pulse live screen (SSE), "Who I met" with one-tap connection requests, event builder for chapter leads; then tag v0.7.0.

### 2026-11-11 · M6 Accounts, onboarding, profiles, settings and help

**Shipped**

- **Sign-in** (Better Auth): magic link through Mailpit (15 min, single use), password sign-in for demo accounts (listed on /sign-in in demo mode only), Google only when keys exist. 5 sign-in attempts per minute per IP; only same-site `?next=` targets (no open redirect); inline validation instead of silent native popups.
- **Guards**: the `(member)` layout redirects once to /sign-in; the `(admin)` layout calls `requirePermission("admin.access")` and renders the styled 403 (`app/[locale]/forbidden.tsx`). No middleware redirect chains.
- **Permissions**: `lib/auth/permissions.ts` (roles, actions, plan entitlements) with a unit-tested matrix.
- **Onboarding**: 6 steps (chapter, origin, languages, industry, goals, arrival). Each step saves on its own; you can go back but not skip ahead; finishing assigns the chapter's founding-member number (race-safe).
- **Dashboard**: founding badge, next session, people you could meet. Every stat card links to its list (/my/events, /connections, /my/businesses), each with a designed empty state.
- **Public profile** /members/[slug]: per-field visibility (`lib/member/visibility.ts`, unit-tested; email never exposed), demo label, copy link with a manual fallback when the clipboard is blocked.
- **Settings** tabs as real URLs: Profile (fields and visibility), Account (name, language), Email (secondary addresses verified by an emailed link; hashed single-use tokens, 24 h), Billing (placeholder until M8), Privacy (JSON data export; deletion scheduled after 30 days and cancellable).
- **Help** /help: FAQ and a contact form to `ADMIN_INBOX_EMAIL`, rate-limited 5 per hour per IP; linked from the footer.
- **Header account menu**: dashboard, my profile, settings, admin (only when permitted), sign out. Streams in under Suspense, so the shell stays static.
- **Country hero panoramas**: `components/home/hero-art/` is a registry keyed by ISO country code. Poland is original line art (Tatras under a Łowicz-style paper-cut sun, Wawel and St Mary's, Warsaw's Palace of Culture, the Gdańsk crane, storks, the Vistula); any other country falls back to a world-connections design. Chosen from the visitor's chapter; Global uses the hub with the most live chapters. Replaces the hard-coded Kraków skyline (CLAUDE.md rule 6). CSS line drawing plus pop-in accents; reduced-motion safe; no layout shift.

**Old portal bugs fixed** (tests in `tests/e2e/auth.spec.ts` unless noted)

| Bug                                    | Fix                                                  | Test                                                                                      |
| -------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1, 13 Dead dashboard stat cards, icons | Every card links to its filtered list                | `every dashboard stat card navigates (bugs 1, 13)`                                        |
| 3 "Need help" did nothing              | /help with FAQ and contact form                      | `help form sends a message to the team (bug 3)`                                           |
| 4 Copy profile link did nothing        | Clipboard API with a manual fallback                 | `visitors cannot see fields switched off (bug 14); copy link fills the clipboard (bug 4)` |
| 5 Secondary email never verified       | Emailed single-use link, hashed token                | `a secondary email is verified through the Mailpit link (bug 5)`                          |
| 6 Account edits lost on reload         | Server Action writes and revalidates                 | `account edits persist after reload (bug 6)`                                              |
| 7 Slow sign-in                         | Magic link to dashboard under 2 s (production build) | `magic link signs in to the dashboard in under 2 s (bug 7)`                               |
| 14 Private fields visible to visitors  | Per-field visibility with an owner-only override     | the bug 4 test above, plus `tests/unit/visibility.test.ts`                                |

**Verification**: `npm run check` green (141 unit tests); production build; full Playwright suite 80/80 at 1440 and 375 px including axe; link crawler green on 39 pages.

**Notes and decisions**

- /admin shows the styled 403 with HTTP status 200: the static shell streams before the layout guard runs, so the status cannot change afterwards. The test asserts the content.
- Windows testing gotcha: stopping a background `npx next start` kills the shell but not the node server, which keeps serving the old build. Run the server and the tests in one command and kill the server's PID afterwards.
- The hero art reads the chapter cookie outside `try`, so prerendering bails out to Suspense instead of caching the world design for everyone.

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
