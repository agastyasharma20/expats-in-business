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
git clone https://github.com/agastyasharma20/expats-in-business.git
cd expats-in-business
npm run setup     # first run: install, start Docker services, migrate, seed, embed guides
npm run dev       # http://localhost:3000 · emails: http://localhost:8025
```

**Demos on a low-memory laptop:** `next dev` can use about 1.7 GB, and orphaned dev servers can survive a restart
(low-memory kills have corrupted `.next`). For demos use `npm run build && npm start`. If the app misbehaves,
stop leftover `node` processes (Task Manager, or `Get-Process node | Stop-Process` in PowerShell), delete the `.next`
folder and start again.

## Demo accounts (demo mode only)

| Role              | Email                         | Password  |
| ----------------- | ----------------------------- | --------- |
| Admin             | admin@demo.eib.local          | Demo!2026 |
| Chapter lead      | lead@demo.eib.local           | Demo!2026 |
| Member (newcomer) | priya@demo.eib.local          | Demo!2026 |
| Member (founder)  | karim@demo.eib.local          | Demo!2026 |
| Provider          | marta.provider@demo.eib.local | Demo!2026 |
| Sponsor           | sponsor@demo.eib.local        | Demo!2026 |

All demo people, providers and venues are fictional and labeled. Payments use Stripe test mode.

## Scripts

`setup` · `setup:nodocker` · `dev` · `dev:https` · `build` · `start` · `lint` · `typecheck` · `test` · `check` · `e2e` · `lighthouse` · `db:reset` · `db:seed` · `demo:reset` · `embed` · `jobs` · `stripe:listen` · `format`

Scripts for later milestones print which milestone delivers them and exit 0.

## Roadmap

MVP (this build) → V1 paid pilot in Kraków → V2 Poland, then global.

## Built with Claude Code

CLAUDE.md and the `.claude/` skills, subagents and hooks are committed. See docs/PROGRESS.md for the milestone log.
