# EiB business model

Status: working document for the founders, 2026-11-12. Revenue today: none confirmed (docs/PROJECT_BRIEF.md §1).
Every price below is a **proposal from the brief (§3D, seeded as `PriceStatus.proposal`)**, not an approved price, and no
figure here is a measured result. Replace proposals in `/admin` (plans) once EiB decides.

## The principle: members never pay to belong

Joining, the directory, Bubbles, groups, Coffee Roulette, guides, the Landing Roadmap and free sessions stay free. The
north-star metric is **confirmed connections per month**; anything that taxes connecting works against it. Money comes
from the people who get **commercial value** out of a large, verified international community: businesses that want to
reach it, providers who serve it, employers who relocate people into it, and partners who want to be seen at its events.

## Who pays, for what

| Who pays                                                         | What they buy                                                                                                | Built in the platform                                          | Proposed price (not approved)        |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------ |
| Members who want more (optional)                                 | **Member Plus**: unlimited concierge, roulette priority, early access, workshop discount, deadline reminders | `/pricing`, Stripe subscriptions, entitlements                 | 19 PLN / month or 190 / year         |
| Founders and small businesses                                    | **Business**: directory listing, lead inbox, featured in their Bubble, 2 workshop seats                      | `/businesses`, lead inbox                                      | 49 PLN / month or 490 / year         |
| Service providers (tax, legal, relocation, housing, translation) | **Verified Provider**: verification badge, quote requests, analytics                                         | `/providers`, verification queue, provider inbox and analytics | 149 PLN / month or 1490 / year       |
| Employers relocating staff                                       | **Corporate**: 25 Member Plus seats, branded onboarding, aggregate report                                    | `/pricing/corporate` enquiry                                   | 7900 PLN / year                      |
| Attendees of paid formats                                        | **Session tickets** (workshops, special formats)                                                             | Paid tickets via Stripe (card, BLIK, Przelewy24)               | Set per session                      |
| Festival visitors                                                | **Festival tickets**: tiers (early bird, standard, family, supporter), group orders                          | `/festivals`, tier capacity, QR per group                      | Set per festival                     |
| Vendors and exhibitors                                           | **Festival stalls**                                                                                          | Stall applications, review, fee shown to applicants            | Set per festival                     |
| Sponsors and partners                                            | **Event and festival partnership** (headline, gold, silver, community, media) with a signed ROI report       | Partners on festival pages, `/sponsor-report/<token>`          | Packages to be defined with partners |

### Why each payer says yes

- **Businesses and providers** pay for qualified attention: internationals actively looking for an accountant, a lawyer, a
  flat or a client. The concierge hands off unanswerable questions to verified providers, and quote requests are tracked, so
  the value is measurable (provider analytics).
- **Employers** pay because relocation support is expensive and staff who settle quickly stay. Corporate seats give their
  hires the roadmap, guides and community from day one; the aggregate report never shows individuals.
- **Sponsors** pay for reach with proof. The sponsor report shows registered and checked-in people and countries of origin,
  with every number under 5 hidden, so it is useful to them and safe for members.
- **Festival visitors and vendors** pay for a great day out. Group tickets and a free family tier keep it accessible;
  supporter tiers let people who can pay more do so.

## Unit economics to watch (no numbers yet: measure first)

- **Activation**: sign-up → onboarding complete → first session attended → first confirmed connection (the admin funnel).
- **Conversion**: share of active members on Member Plus; providers verified per chapter; businesses listed.
- **Retention**: monthly renewal of paid plans; sessions attended per member per quarter.
- **Event margin**: ticket and stall revenue minus venue, catering and Stripe fees, per session and per festival (the
  festival console already shows gross ticket revenue).
- **Cost to serve**: hosting, email, AI concierge calls (capped by `AI_GLOBAL_DAILY_BUDGET`, free tiers first).

## How it scales by chapter

Each city chapter runs the same playbook (chapter-in-a-box): local providers and businesses pay locally, sponsors buy local
festival partnerships, and plans are priced in the chapter's currency (no hard-coded PLN). EiB HQ keeps the platform,
brand and corporate contracts that span cities. A chapter lead can see their chapter's numbers; only admins see all.

## Sequencing proposal

1. **Now (no pricing risk)**: free core, festival tickets and stalls, sponsor reports. These need no subscription habit and
   prove demand with real money at the first big festival.
2. **Next**: Verified Provider and Business plans in Kraków (supply side, where value is clearest).
3. **Then**: Member Plus once the concierge and roadmap show retention, and Corporate once two or three employers ask.

## Decisions needed from EiB (open)

- Approve or change every proposed price above (they are placeholders in the database).
- Sponsorship packages and what each tier includes; written permission before any partner name or logo is shown.
- Stall fee policy (free for non-profits?) and refund policy for cancelled festivals.
- Legal entity that sells tickets and issues invoices (needed before Stripe live mode and VAT setup).
