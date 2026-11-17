# EiB platform: test report (V1.0.0 release candidate)

Date: 14 Nov 2026 · Branch: `feat/team-page` · Tester: Claude Code with the repository's own test tooling
Evidence files: `docs/test-evidence/` (access matrix, summary) · Scripts: `scripts/qa-access.mjs`, `scripts/qa-sweep.mjs`, `scripts/capture-screenshots.mjs`

## 1. Verdict

**Ready for a stakeholder demo and for a first deployment, with four open items (none exposes data) and one
defect found and fixed during this test.** Nothing in this report is a claim of "bug-free": it lists what was
run, what passed, what failed, and what was not covered (section 9).

| Area                                                | Result                                                                                                                                                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Static checks (ESLint, strict TypeScript, Prettier) | Pass                                                                                                                                                                                              |
| Unit tests                                          | **315 of 315 pass** (28 files)                                                                                                                                                                    |
| Production build                                    | Pass (77 pages, 14 API routes)                                                                                                                                                                    |
| Browser tests (Playwright, Chromium)                | ****136 tests per project; every file passes in a clean serial run** (99 of 99 runnable desktop tests in 17 of 18 files; the 18th, the crawl spec, passed in the first full run)**, see section 4 |
| Link crawler                                        | **300 pages followed, 0 problems**                                                                                                                                                                |
| Access control and security probes                  | **39 of 39 pass** (section 6)                                                                                                                                                                     |
| Lighthouse (mobile)                                 | Accessibility 100 and best practices 100 on all 6 pages; performance 80 to 100 (section 7)                                                                                                        |
| Production dependency audit                         | 0 vulnerabilities                                                                                                                                                                                 |
| Defects found                                       | 1 fixed (High), 4 open (Low to Medium), 4 informational                                                                                                                                           |

## 2. Environment

- Windows 11 laptop with limited free memory (about 1.7 GB free during tests), Node 24, Docker Desktop.
- App: `next build` then `next start` (production mode, Next.js 16.4), PostgreSQL 17 + pgvector in Docker,
  Mailpit for email, demo seed data (`npm run demo:reset`), AI provider `demo`, Stripe keys empty (checkout simulated).
- Browser: Chromium via Playwright, at 1440 px (desktop project) and 375 px (mobile project).
- Because the laptop is slow, parallel runs (two workers) produced timeouts that did not occur serially. Where
  this matters it is called out.

## 3. Method

| Layer           | How                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Static          | `npm run check`: ESLint, `tsc --noEmit`, Vitest                                                                                 |
| Unit            | 28 files: permissions, capacity and waitlist, money, time zones, env, i18n parity, contrast pairs, schemas, concierge gate      |
| End to end      | 18 Playwright specs, 136 tests per project, driving real flows with seeded personas (admin, chapter lead, members, provider)    |
| Accessibility   | axe-core (WCAG 2 A and AA) inside the browser tests; keyboard skip link; reduced motion                                         |
| Link crawler    | `scripts/crawl-links.ts` from every nav and footer route in 3 languages, following internal links (cap 300 pages)               |
| Access control  | `scripts/qa-access.mjs`: 26 page checks as visitor, member and admin; 11 API checks; sign-in rate limit; foreign-origin sign-in |
| Security probes | curl: headers, anonymous API calls, wrong methods, path traversal, reflected input                                              |
| Performance     | Lighthouse mobile (simulated slow 4G) on 6 pages                                                                                |
| Manual review   | A sample of the captured screenshots and of the PDF pages was reviewed by eye; the server log was read for errors               |

## 4. Browser (end-to-end) results

Two runs are reported honestly because they differ.

**Run A: full suite, desktop and mobile, two parallel workers, one retry (12.7 minutes).**
168 passed, 3 failed, 2 flaky (passed on retry), 78 skipped by design (desktop-only tests on the mobile project and tests that
need the database), 17 did not run (they follow a failed test in a serial chain).

| Failed in run A                                                                    | What happened                                                  | After a clean serial rerun   |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------- |
| `auth.spec` magic link signs in in under 2 s                                       | 4.2 s on the loaded laptop (budget 2 s)                        | Pass (2.9 s)                 |
| `community.spec` posts in her Bubble group                                         | Timeout                                                        | Pass                         |
| `events.spec` member reserves a free place                                         | The "Reserve" button stayed on "One moment…" for the full 30 s | Pass (4.9 s); see finding F2 |
| Flaky: `checkin.spec` door check-in, `festivals.spec` organiser creates a festival | Passed on retry                                                | Pass                         |

**Run B: the four most stateful files, serial, clean state:** `auth`, `events`, `checkin`, `community` = **31 of 31 pass**. Run B and run C together cover every spec file except `crawl`.

**Run C: all other files, serial, clean state, desktop:** all other files except `crawl` = **68 passed, 0 failed**, 6 skipped (phone-width checks that run in the mobile project instead). In run A the mobile project had 62 passed and 0 failed.

Stale state caused extra failures in earlier attempts: an interrupted run leaves the Bubbles feature flag off in the
database and a reserved ticket on a demo member. `demo:reset` does not clear the flag row. This is documented in the
project notes; it is a test-hygiene problem, not an app defect.

### 4.1 Feature coverage map

| Feature                    | Tests (spec)                                                         | What is checked                                                                                                                                                                                                                           |
| -------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign-in, account           | `auth` (8)                                                           | Redirect when signed out; email link sign-in; stat cards navigate; edits persist; second email verified through the Mailpit link; hidden profile fields stay hidden; styled 403; help form                                                |
| Events and tickets         | `events` (7)                                                         | List filters; event facts and `.ics`; sign-in prompt; reserve, QR ticket, cancel; RSVP and un-RSVP from the event page; simulated paid ticket; Stripe webhook rejects unsigned calls                                                      |
| Event builder, door, Pulse | `checkin` (5)                                                        | Lead publishes a session in under 2 minutes; waitlist and automatic promotion; manual check-in, single use, members cannot scan; live Pulse; "Who I met" double opt-in                                                                    |
| Festivals                  | `festivals` (5)                                                      | Builder with programme, tier, shift and FAQ; tampered party size refused; family ticket, volunteering, stall application; console access refused for members; stall acceptance and sales                                                  |
| Community                  | `community` (11)                                                     | Bubbles map and list; groups members-only; posting and reacting; cannot post in a Bubble not joined; Coffee Roulette; dashboard cards; admin area refused; KPIs; command palette; feature flag hides the map; moderation decision audited |
| Directory and providers    | `directory` (6)                                                      | Filters in the URL; limited visitor fields; review eligibility; verification badge rules; connection opt-in; provider inbox and analytics                                                                                                 |
| Guides and concierge       | `concierge` (5), `i18n`                                              | Cited answer opens the official source; off-topic hand-off; prompt-injection attempt refused; guide disclaimer and dates; Polish summary labelled machine-translated                                                                      |
| Roadmap                    | `roadmap` (4)                                                        | Plan by residence situation; marking done persists; onboarding edits keep completed steps                                                                                                                                                 |
| Pricing and billing        | `pricing` (4)                                                        | Plans from the database labelled as proposals; subscribe and cancel at period end (simulated); corporate enquiry; static shell                                                                                                            |
| Growth                     | `growth` (7)                                                         | Landmark panoramas; festival spotlight; careers filters; ambassador application and review; role application and withdrawal                                                                                                               |
| Admin tools                | `admin-tools` (4)                                                    | Speaker application board; catalogs list; refusal for non-admins                                                                                                                                                                          |
| Team page (new)            | `team` (4)                                                           | Public page with axe; admin guard; add person with photo, public display, email revealed only on click and not in page source, hide, delete; non-image rejected                                                                           |
| Personal data export (new) | `privacy` (2)                                                        | Visitors refused; member downloads her own data and nobody else's                                                                                                                                                                         |
| Home, SEO, accessibility   | `home` (7), `i18n` (4), `quality` (3), `styleguide` (6), `crawl` (5) | Sections render without console errors; placeholders labelled; no serious axe violations; no sideways scroll; JSON-LD and social card; robots and sitemap; reduced motion; keyboard skip link; styled 404; no raw markdown in legal pages |

## 5. Link crawler

`CRAWL_BASE_URL=http://localhost:3200 npx tsx scripts/crawl-links.ts` followed **300 pages** (the cap) across en, pl and uk
and reported no broken links, no duplicate links in the header or footer, and no unsafe external links.

## 6. Access control and security

### 6.1 Access matrix (`docs/test-evidence/access-matrix.json`): 39 of 39 pass

- **Visitors** on member, admin and provider pages (9 checks): no personal or admin data in any response.
- **A member** on 9 admin and provider pages: no admin data in any response; own pages work.
- **An admin** on 5 admin pages: all open.
- **APIs:** admin export refused to visitors and members (403); account export refused to visitors (401) and works for a
  member (200); roadmap calendar needs sign-in (401); attendee export refused (403); team email route is POST-only and
  returns 404 for unknown ids; team photo route returns 404 for unknown ids; unsigned Stripe webhook is not accepted (503
  here because Stripe is not configured; 400 when it is); health returns 200.
- **Rate limit:** 9 rapid wrong-password sign-ins return 401, 401, then 429.
- **Cross-site sign-in:** a request with a foreign `Origin` header is rejected (403).

Note on status codes: denied pages are streamed, so the HTTP status is 200 even when the person sees a sign-in prompt or a
403 page (finding F4). The check therefore asserts that no seeded personal data appears in the response body.

### 6.2 Headers and other probes

- Present on pages: Content-Security-Policy, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy
  strict-origin-when-cross-origin, Permissions-Policy, COOP and CORP same-origin. HSTS is added only on HTTPS (not testable locally).
- `X-Powered-By` is absent. `robots.txt` blocks `/api/`, `/admin`, `/dashboard`, `/settings`, `/tickets`, `/notifications`.
- Reflected input in `?q=` parameters (script tag and attribute break-out payloads) was not echoed unescaped (0 matches).
- Path traversal and a 200-character id on the photo route return 404.
- `npm audit --omit=dev`: **0 vulnerabilities**.

## 7. Performance and accessibility (Lighthouse, mobile)

| Page                                   | Perf | A11y | Best practices | SEO* | Notes                                                                                                    |
| -------------------------------------- | ---- | ---- | -------------- | ---- | -------------------------------------------------------------------------------------------------------- |
| `/events`                              | 100  | 100  | 100            | 92   | LCP 1.1 s, TBT 80 ms                                                                                     |
| `/guides`                              | 100  | 100  | 100            | 92   | LCP 1.1 s                                                                                                |
| `/pl`                                  | 100  | 100  | 100            | 92   | LCP 1.1 s                                                                                                |
| `/pricing`                             | 97   | 100  | 100            | 92   | CLS 0.023                                                                                                |
| `/team`                                | 85   | 100  | 100            | 92   | LCP 4.2 s (finding F3)                                                                                   |
| `/festivals/demo-festival-of-cultures` | 80   | 100  | 100            | 92   | LCP 4.6 s, TBT 200 ms (finding F3)                                                                       |
| `/`                                    | n/a  | n/a  | n/a            | n/a  | Lighthouse tracing error (`NO_NAVSTART`) in two attempts; earlier milestone runs recorded 99/100/100/100 |

\*SEO is 92 only because the test server's canonical URL (built from `APP_URL`) pointed at a different local port; the audit
"valid rel=canonical" then fails. Earlier runs with a matching address scored 100.

## 8. Findings

Severity: High = wrong or unsafe behaviour for real users; Medium = likely to hurt in production; Low = polish.

| ID  | Severity      | Status           | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                    | Evidence                                                                            | Recommendation                                                                                                                                                     |
| --- | ------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F1  | **High**      | **Fixed**        | The "download my data" export (`/api/account/export`) returned HTTP 500 for every signed-in member since milestone 6. The query asked for a relation called `emails`; the schema calls it `userEmails`. This breaks the GDPR access promise. TypeScript did not catch it.                                                                                                                                                                  | Server log `PrismaClientValidationError`; access matrix check failed before the fix | Fixed in `app/api/account/export/route.ts`; regression tests in `tests/e2e/privacy.spec.ts`. Consider a typed wrapper so unknown `select` keys fail the type check |
| F2  | Medium        | Open             | Under parallel load, the reserve action sometimes did not finish within 30 s (button stuck on "One moment…"). Not reproduced serially (31 of 31 pass). The server log shows the `pg` warning "Calling client.query() when the client is already executing a query", which comes from running queries concurrently with `Promise.all` inside one database transaction in `lib/events/tickets.ts` (`fits`). A link is plausible but unproven | Run A log; error-context snapshot; server log                                       | Run the transaction's queries one after another; add a transaction timeout and log duration; repeat the load test with 5 to 10 concurrent reservations             |
| F3  | Low to Medium | Open             | Slow Largest Contentful Paint on `/team` (4.2 s) and the festival page (4.6 s) in simulated slow mobile; server response is fast (9 ms) and the element is the page lead paragraph. Other pages are 1.1 s                                                                                                                                                                                                                                  | Lighthouse JSON in `.lighthouseci/`                                                 | Investigate render delay on partially prerendered pages (Suspense boundary, font swap, entrance animation); retest on the live host                                |
| F4  | Low           | Open (by design) | Denied pages return HTTP 200 with a sign-in or 403 view, because the page shell streams before the auth check. No protected data is in the response. Search engines are told not to index these areas                                                                                                                                                                                                                                      | Access matrix                                                                       | Acceptable for V1; if exact status codes matter, move guards into the layout or middleware                                                                         |
| F5  | Low           | Open             | The admin tab bar is clipped on the right by the "Jump to…" search box ("Catalogs", "Team", "Settings" and "System" scroll under it). It now has 15 tabs                                                                                                                                                                                                                                                                                   | `docs/screenshots/admin-desktop.png`                                                | Let the tab bar wrap or reserve space; keep the scroll                                                                                                             |
| F6  | Info          | Noted            | The Content Security Policy allows inline scripts (`'unsafe-inline'`), because streaming rendering cannot use per-request nonces. Protection against script injection relies on output encoding                                                                                                                                                                                                                                            | `next.config.ts`                                                                    | Revisit when nonce support for streamed pages is available                                                                                                         |
| F7  | Info          | Noted            | `APP_URL` is baked into canonical links at build time; the deploy guide now says so                                                                                                                                                                                                                                                                                                                                                        | Lighthouse SEO audit                                                                | Redeploy after changing the address                                                                                                                                |
| F8  | Info          | Noted            | Stripe webhook returns 503 when Stripe is not configured (400 when configured and unsigned)                                                                                                                                                                                                                                                                                                                                                | Access matrix                                                                       | None                                                                                                                                                               |
| F9  | Info          | Noted            | Server log warns "11 close listeners added to ServerResponse" (streaming routes)                                                                                                                                                                                                                                                                                                                                                           | `/tmp` server log                                                                   | Check Pulse (SSE) route cleanup                                                                                                                                    |

Also fixed during this phase (earlier in the session, with tests): refund wording, billing and review rate limits, clock reads at build time,
Bubbles flag cache, the `/team` email being visible in HTML (now fetched on demand), and a missing SMTP login that would have
stopped sign-in emails on any real mail provider.

## 9. Not covered (limits of this report)

- **A complete route-by-route sweep** at both widths in all three languages. The script exists (`scripts/qa-sweep.mjs`); a
  first run was stopped after 18 routes at the request of the project owner to save time. Route coverage comes from the
  browser tests, the crawler (300 pages) and the access matrix instead.
- **Cross-browser** (Safari, Firefox) and real phones: Chromium only.
- **Screen readers** and manual keyboard walkthrough of every page: axe and the keyboard skip-link test only.
- **Load and stress tests** beyond the two-worker e2e runs, and a concurrency test for the last seat.
- **Real integrations**: Stripe (test or live), real email delivery, Google sign-in, live AI providers.
- **Penetration test or dependency review beyond `npm audit`.**
- **Polish and Ukrainian text quality** (machine-translated; only key parity is tested).
- **The live deployment** (not deployed yet).

## 10. How to reproduce

```powershell
npm run check
npm run build ; npm start                              # or: $env:PORT=3000 ; npx next start
npm run demo:reset
$env:E2E_BASE_URL="http://localhost:3000"; $env:E2E_EXPECT_DB="true"
npx playwright test --project=desktop --workers=1      # serial is the reliable mode on a slow machine
$env:QA_BASE_URL="http://localhost:3000"; node scripts/qa-access.mjs docs/test-evidence/access-matrix.json
$env:CRAWL_BASE_URL="http://localhost:3000"; npm run crawl
$env:LH_BASE_URL="http://localhost:3000"; npm run lighthouse -- /events /guides /pricing /team
```

Clear leftovers between runs: `npm run demo:reset`, then delete the `featureFlags` row from `SiteSetting` and truncate `RateLimit`.

## 11. Update 17 Nov 2026: accessibility audit and security scans

Evidence: `docs/test-evidence/qa-sweep.json`, `gitleaks.json`, `trivy.json`. The presentation of these results is in `docs/EiB-Platform-Report.pdf` (sections 13 and 14).

**Accessibility sweep (completes the sweep that was stopped on 14 Nov).** `scripts/qa-sweep.mjs`, axe-core 4.14 with WCAG 2.0 and 2.1 A and AA rules, production build on the developer laptop. 76 distinct routes as visitor, member, provider or admin; 208 page checks (1440 px and 375 px, plus public pages in Polish and Ukrainian). All 208 loaded with HTTP 200 and had no console error, no failed request, no sideways overflow, exactly one `h1` and no empty page. **167 checks had no violation; 41 had one finding:** `label-content-name-mismatch` (WCAG 2.5.3, serious), always the same element, the account button in the header of signed-in pages at desktop width. **Fixed (A11Y-1):** the button's accessible name is now "Name, Account menu"; a unit test (`tests/unit/user-menu.test.tsx`) asserts it. A browser re-check on a rebuilt app is pending because the laptop was out of memory: `QA_PERSONAS=karim,admin,provider node scripts/qa-sweep.mjs`.

**Security scans.**

| Scan                                                                                 | Result                                                                                                                               |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Gitleaks (Docker) over the whole git history, 90 commits with changes plus 11 merges | 0 leaks                                                                                                                              |
| Trivy (Docker) on `package-lock.json`                                                | 0 vulnerabilities in production dependencies; it recognised no misconfiguration targets in the compose, pipeline and blueprint files |
| `npm audit`                                                                          | Production: 0. All dependencies: 12 (10 moderate, 2 low), development tooling only                                                   |
| OWASP ZAP baseline                                                                   | **Not completed**: the image download and scan were stopped by the system under low memory. Rerun on a machine with more memory      |
| Static analysis                                                                      | ESLint and strict TypeScript clean; no dedicated security analyser (Semgrep, CodeQL) was run                                         |

**Other facts recorded.** GitHub Actions has the `CI` workflow enabled but **zero recorded runs** (F11). The brief asked for items that do not exist in the code: the admin form to launch a chapter, `/about`, `/partners`, `/stories`, a cookie banner and a retention purge job (F12, F13). Environment versions are in appendix A of the PDF.

| ID     | Severity                | Status        | Finding                                              |
| ------ | ----------------------- | ------------- | ---------------------------------------------------- |
| A11Y-1 | Serious (accessibility) | Fixed in code | Account button name did not contain its visible text |
| F11    | Medium                  | Open          | CI never ran                                         |
| F12    | Low to medium           | Open          | No purge job for the stated log retention            |
| F13    | Decision                | Open          | Brief items not built (see above)                    |
| F14    | Medium                  | Open          | Web scan (ZAP) incomplete; no penetration test       |
| F15    | Low                     | Noted         | 12 advisories in dev-only tools                      |
