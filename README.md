# Expats in Business: platform (demo build)

The business network for internationals: starting in Kraków, built for every city.

> Milestone 16 completes this README with screenshots, timings and the architecture diagram.

## What's inside
- Chapters (Global › Poland › Kraków/Warsaw) and Cultural Bubbles
- Events with RSVP, test-mode tickets, QR check-in and a live Session Pulse screen
- Member, business and verified provider directories
- AI Expat Concierge that answers only from verified, cited guides
- Landing Roadmap 30/60/90, Coffee Roulette, admin command centre, sponsor ROI reports

## Tech stack
Next.js 16 · TypeScript · Tailwind v4 + shadcn/ui · Motion · PostgreSQL 17 + pgvector · Prisma 7 · Better Auth · Stripe (test mode) · Vercel AI SDK

## Run it locally (Windows, macOS, Linux)
Prerequisites: Node 24 LTS, Git, Docker Desktop.

```bash
git clone git@bitbucket.org:expatsinbusiness/eib-platform.git
cd eib-platform
npm run setup     # first run: install, start Docker services, migrate, seed, embed guides
npm run dev       # http://localhost:3000 · emails: http://localhost:8025
```

## Demo accounts (demo mode only)
| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@demo.eib.local | Demo!2026 |
| Chapter lead | lead@demo.eib.local | Demo!2026 |
| Member (newcomer) | priya@demo.eib.local | Demo!2026 |
| Provider | marta.provider@demo.eib.local | Demo!2026 |
| Sponsor | sponsor@demo.eib.local | Demo!2026 |

All demo people, providers and venues are fictional and labeled. Payments use Stripe test mode.

## Scripts
`setup` · `dev` · `check` · `e2e` · `build` · `lighthouse` · `demo:reset` · `stripe:listen`

## Roadmap
MVP (this build) → V1 paid pilot in Kraków → V2 Poland, then global.

## Built with Claude Code
CLAUDE.md and the `.claude/` skills, subagents and hooks are committed. See docs/PROGRESS.md for the milestone log.
