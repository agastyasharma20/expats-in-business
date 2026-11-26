# Deploying EiB for free: step by step

This guide takes the platform from your laptop to a public URL using free plans only. It matches what the
code does today (env rules in `lib/env.ts`, scripts in `package.json`). Free plans change, so each limit
below says where it came from; check the linked page before you rely on it.

**Recommended stack (all free, no credit card needed for the first three):**

| Part           | Service                                | Why                                                                                                                         | Free-plan limits to know                                                                                                                                                                                                                                                                     |
| -------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App            | **Render** (Web Service, Node)         | Runs `next start` as a normal long-running server, so server actions, SSE (Pulse) and caching behave as in local production | Spins down after 15 minutes without traffic; the next visit waits roughly 30 to 60 s. 750 free instance hours per month ([Render free plan](https://render.com/docs/free)). Check the RAM of the free instance before you deploy: the build needs more memory than a tiny instance may give. |
| Database       | **Neon** (Postgres 17 with `pgvector`) | The schema needs `vector` and `pg_trgm`; both are supported                                                                 | Free plan: 1 GB storage per project, 100 compute hours a month, compute sleeps when idle ([Neon free plan](https://neon.com/faqs/free-plan-limits-and-quotas)). Team photos are stored in the database and count toward the 1 GB.                                                            |
| Email          | **Brevo** SMTP                         | Sign-in links are sent by email, so real email is required                                                                  | 300 emails a day on the free plan; a new account may need approval before it can send ([Brevo](https://www.brevo.com/free-smtp-server))                                                                                                                                                      |
| Scheduled jobs | **GitHub Actions** cron                | Daily reminders and weekly Coffee Roulette (`npm run jobs`)                                                                 | Included with a GitHub account; scheduled runs can be delayed                                                                                                                                                                                                                                |

> **Vercel instead of Render?** It works for the Next.js app, but (1) the Hobby plan is for **personal,
> non-commercial use only** ([Vercel pricing](https://vercel.com/pricing)), so ask whether a community
> business network qualifies; (2) the local embedding model (`onnxruntime-node`, about 290 MB in
> `node_modules`) may not fit in a serverless function (Vercel documents a 250 MB function size limit), in
> which case the AI concierge uses its keyword fallback. Render has neither problem, which is why it is
> the default here.

## Sandbox deploy (no email, no AI key)

For a public test site with fake data and nothing connected. Same steps as below, with these differences:

| Step             | Sandbox value                                                                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seed (step 2)    | `npm run db:seed` (base **and** demo layer: fake members, events and tickets). Skip `--base-only`.                                                            |
| `DEMO_MODE`      | `true`. It must be set **before the build**, because it is read when pages are prerendered. Sign-in page then lists the demo accounts (password `Demo!2026`). |
| `EMAIL_DISABLED` | `true`. No SMTP, no Brevo: emails are skipped instead of failing. Do not set the `SMTP_*` variables.                                                          |
| `AI_PROVIDER`    | `demo` (answers from the guides, no key). No `GROQ_*` or `GEMINI_*` variables.                                                                                |
| Stripe           | Leave unset.                                                                                                                                                  |
| Other variables  | `NODE_ENV=production`, `NODE_VERSION=24`, `APP_URL`, `BETTER_AUTH_URL` (same value), `BETTER_AUTH_SECRET`, `DATABASE_URL`, `TRUSTED_PROXY_HOPS=1`.            |

Sandbox rules: share the link only with testers, enter no real personal data, and never reuse this database for the
real launch (start a new Neon project with `--base-only`). Anyone with the link can sign in as a demo user.

## 0. Before you start (once)

- [ ] The code is on GitHub (private repository is fine). Render deploys from GitHub.
- [ ] `npm run check` is green and `npm run build` works locally.
- [ ] You know the final public URL, or accept the free `https://<name>.onrender.com` address for now.
- [ ] Decide who is the first admin (an email address you can open).

**What a public deployment is and is not (read this):**

- Set `DEMO_MODE=false`. The demo accounts (password `Demo!2026`) must never exist on a public site.
- Seed only the base layer (`--base-only`), never the demo layer.
- Stripe is **test mode only**: `lib/env.ts` rejects any key that does not start with `sk_test_` or
  `pk_test_`. Payments on the deployed site are therefore not real. Accepting real money is a separate,
  later step that needs code and legal review.
- Real prices, partners and legal texts are still placeholders (see `docs/PROJECT_OVERVIEW.md`, "Known gaps").

## 1. Create the database (Neon)

1. Sign up at [neon.com](https://neon.com) and create a project. Pick the region closest to your Render
   region (for Poland: a Frankfurt region). Use Postgres 17 if offered.
2. Open **Connection details**. Copy two strings:
   - **Direct connection** (host without `-pooler`): use it for migrations and seeding.
   - **Pooled connection** (host with `-pooler`): optional for the running app.
     Both must end with `?sslmode=require`. Example shape:
     `postgresql://USER:PASSWORD@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`
3. You do not need to create extensions by hand. The migrations run `CREATE EXTENSION IF NOT EXISTS vector`
   and `pg_trgm`.

## 2. Prepare the database from your laptop (once)

Run these in PowerShell from the repo folder. Replace the URL with your **direct** Neon string.

```powershell
$env:DATABASE_URL = "postgresql://USER:PASSWORD@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require"

npx prisma migrate deploy        # creates every table (applies all migrations in prisma/migrations)
npm run db:seed -- --base-only   # real configuration only: Poland, Kraków, Warsaw, formats, plans
npm run embed                    # downloads the embedding model once, indexes the guides for the concierge
```

Notes:

- `migrate deploy` is the production command. Never run `migrate reset` or `db:reset` against this database:
  they erase it.
- `npm run embed` needs internet access (it downloads the `all-MiniLM-L6-v2` model, about 90 MB, to
  `.cache/models`) and takes a few minutes. Without it the concierge falls back to keyword search.
- Close the PowerShell window afterwards so the database password does not stay in your session.

## 3. Create the email sender (Brevo)

1. Sign up at [brevo.com](https://www.brevo.com) and verify your account.
2. Go to **SMTP & API → SMTP**. Note the SMTP server (`smtp-relay.brevo.com`), the port (**587**), your
   **login** and create an **SMTP key** (this is the password).
3. Add a **sender** and verify the address or domain you will send from. Use a real address you control.
   Sending from a domain you own (with SPF and DKIM records that Brevo shows) keeps messages out of spam.
4. Keep these four values for step 4: `SMTP_HOST`, `SMTP_PORT=587`, `SMTP_USER`, `SMTP_PASSWORD`.

## 4. Deploy the app (Render)

> **Faster: use the Blueprint.** The repository contains `render.yaml`. In Render choose **New → Blueprint**, pick the
> repository, and Render creates the service with every setting below pre-filled; you only type the secret values
> (`APP_URL`, `BETTER_AUTH_URL`, `DATABASE_URL`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`, `ADMIN_INBOX_EMAIL`).
> `BETTER_AUTH_SECRET` is generated for you. The manual steps below give the same result.

1. Sign up at [render.com](https://render.com) with GitHub. Click **New → Web Service** and choose the repo.
2. Settings:

   | Field             | Value                                                          |
   | ----------------- | -------------------------------------------------------------- |
   | Runtime           | Node                                                           |
   | Branch            | `main` (after you merge)                                       |
   | Build command     | `npm ci --include=dev && npx prisma generate && npm run build` |
   | Start command     | `npm start`                                                    |
   | Instance type     | Free                                                           |
   | Health check path | `/api/health`                                                  |

   Set the Node version to 24 with an environment variable `NODE_VERSION` = `24` (the repo requires Node ≥ 24).

3. **Environment variables.** Add every row. The build also needs `DATABASE_URL`, because pages are
   prerendered with database data, so set the variables before the first deploy. `APP_URL` is also read **at build time** (it becomes the canonical link on every page), so if you change the address later you must redeploy, not just restart.

   | Variable             | Value                                                                           |
   | -------------------- | ------------------------------------------------------------------------------- |
   | `NODE_ENV`           | `production`                                                                    |
   | `DEMO_MODE`          | `false`                                                                         |
   | `APP_URL`            | your public URL, e.g. `https://eib-platform.onrender.com` (no trailing slash)   |
   | `BETTER_AUTH_URL`    | exactly the same as `APP_URL`                                                   |
   | `BETTER_AUTH_SECRET` | a new random string of at least 32 characters (see below)                       |
   | `DATABASE_URL`       | the Neon connection string (the pooled one is fine for the running app)         |
   | `TRUSTED_PROXY_HOPS` | `1` (Render puts one proxy in front of the app; needed for correct rate limits) |
   | `SMTP_HOST`          | `smtp-relay.brevo.com`                                                          |
   | `SMTP_PORT`          | `587`                                                                           |
   | `SMTP_USER`          | your Brevo SMTP login                                                           |
   | `SMTP_PASSWORD`      | your Brevo SMTP key                                                             |
   | `SMTP_SECURE`        | `false`                                                                         |
   | `EMAIL_FROM`         | `Expats in Business <your-verified-sender@example.org>`                         |
   | `ADMIN_INBOX_EMAIL`  | the inbox that receives contact-form messages                                   |
   | `AI_PROVIDER`        | `demo` (answers from the guides, no key) or `groq` / `gemini` with its key      |
   | `MODEL_CACHE_DIR`    | `.cache/models`                                                                 |

   Generate the secret in PowerShell:
   `[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))`
   Never reuse the local `.env` secret and never commit secrets.

   Optional: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (Google sign-in; add your public URL plus
   `/api/auth/callback/google` as an authorised redirect in Google Cloud), the `AI_*` and `FEATURE_*` values
   from `.env.example`, and Stripe **test** keys if you want to demo checkout.

4. Click **Create Web Service**. The first build takes several minutes. When it is live, open
   `https://<your-service>.onrender.com/api/health`. You should see `{"status":"ok","db":true}`.

> The local embedding model is not part of the build, so on Render the concierge uses keyword search until
> the model is downloaded into the instance. This is acceptable for V1: answers still cite the guides.
> A paid instance with a persistent disk would keep the model between restarts.

## 5. Create the first admin

1. Open your site, go to **Sign in** and enter the admin's email. Open the link that arrives by email.
   (If no email arrives, see Troubleshooting.)
2. On your laptop, with the **direct** Neon URL set as in step 2, run:

   ```powershell
   npm run admin:grant -- admin@yourdomain.org
   ```

3. Reload the site while signed in. The **Admin** area now appears. From there you can grant roles to other
   people (**Admin → Roles**) and fill the Team page (**Admin → Team**).

## 6. Scheduled jobs (reminders and Coffee Roulette)

Add this file as `.github/workflows/jobs.yml`, then add repository secrets `DATABASE_URL` (direct Neon
string), `APP_URL` and `BETTER_AUTH_URL` (your public URL), `BETTER_AUTH_SECRET` and `SMTP_*` as in step 4
(**Settings → Secrets and variables → Actions**).

```yaml
name: Scheduled jobs
on:
  schedule:
    - cron: "0 7 * * *" # reminders: daily, 07:00 UTC
    - cron: "0 8 * * 1" # coffee roulette: Mondays, 08:00 UTC
  workflow_dispatch:
jobs:
  run:
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      APP_URL: ${{ secrets.APP_URL }}
      BETTER_AUTH_URL: ${{ secrets.BETTER_AUTH_URL }}
      BETTER_AUTH_SECRET: ${{ secrets.BETTER_AUTH_SECRET }}
      SMTP_HOST: ${{ secrets.SMTP_HOST }}
      SMTP_PORT: ${{ secrets.SMTP_PORT }}
      SMTP_USER: ${{ secrets.SMTP_USER }}
      SMTP_PASSWORD: ${{ secrets.SMTP_PASSWORD }}
      EMAIL_FROM: ${{ secrets.EMAIL_FROM }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: npm }
      - run: npm ci && npx prisma generate
      - run: npm run jobs -- reminders
        if: github.event.schedule == '0 7 * * *' || github.event_name == 'workflow_dispatch'
      - run: npm run jobs -- roulette
        if: github.event.schedule == '0 8 * * 1' || github.event_name == 'workflow_dispatch'
```

Each job is idempotent, so a repeated run sends nothing twice.

## 7. Custom domain (optional, still free)

1. In Render: **Settings → Custom Domains → Add**. Render shows a DNS record to create at your domain
   registrar (a CNAME for a subdomain such as `platform.yourdomain.org`).
2. When the certificate is issued, change `APP_URL` and `BETTER_AUTH_URL` to the new address and redeploy.
   They must match the address people use, or sign-in links will point to the wrong place.
3. Update the Google redirect URL and the Stripe webhook URL (if used) to the new address.

## 8. After deploying: checklist

- [ ] `/api/health` returns `{"status":"ok","db":true}`.
- [ ] Sign in with a real email: the link arrives and works. Check the spam folder on the first try.
- [ ] `Admin` is visible for the first admin and hidden for a normal member.
- [ ] `/team`, `/events`, `/guides`, `/pricing` and `/chapters` load; no page shows demo accounts.
- [ ] No "Demo profile" content: if you see any, the demo layer was seeded by mistake (see Troubleshooting).
- [ ] Open the site on a phone (375 px wide) and click through the main menu.
- [ ] Fill **Admin → Team** (founder's message and people) and check `/team`.
- [ ] Run Lighthouse against the live URL: `$env:LH_BASE_URL="https://your-url"; npm run lighthouse`.
- [ ] Add the public URL to your uptime monitor if you want one (see "Keeping it awake").

## 9. Updating the site later

1. Push or merge to `main`. Render rebuilds and deploys automatically.
2. If the change adds a database migration, run `npx prisma migrate deploy` against the Neon direct URL
   **before or right after** the deploy (as in step 2). Migrations only ever add; never reset.
3. To roll back, use Render's **Deploys → Rollback**. A rolled-back app still works with a database that has
   extra, unused tables or columns.

## 10. Keeping it awake (optional)

The free Render instance sleeps after 15 minutes without traffic, so the first visit can take up to a minute.
An external uptime monitor that opens `/api/health` every 10 to 14 minutes keeps it awake while staying inside
the 750-hour allowance for one service. Render's terms and free allowances can change; for a launch event, move
to a paid instance (from about 7 USD a month) so nobody waits.

## Troubleshooting

| Symptom                                          | Likely cause and fix                                                                                                                                                                    |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build fails with `Invalid environment variables` | A variable is missing or malformed. The message names it. Common: `APP_URL` without `https://`, or `BETTER_AUTH_SECRET` under 32 characters.                                            |
| Build fails with `ETIMEDOUT` or `P1001`          | The build cannot reach the database. Check `DATABASE_URL` is set for the build, ends with `?sslmode=require`, and the Neon project is not suspended (open it once in the Neon console). |
| Build runs out of memory                         | The instance is too small for `next build`. Retry; if it persists, build on GitHub Actions or use a paid instance for the build.                                                        |
| Sign-in email never arrives                      | Check Brevo's logs. Confirm the sender is verified, `SMTP_PORT=587`, `SMTP_SECURE=false`, and the SMTP key is correct. The free Brevo plan allows 300 emails a day.                     |
| Sign-in link points to `localhost`               | `BETTER_AUTH_URL` or `APP_URL` still has the local value. Fix both, redeploy.                                                                                                           |
| Error "Invalid origin" on sign-in                | The address in the browser differs from `BETTER_AUTH_URL` (for example `www.` or `http://`). They must match exactly.                                                                   |
| Rate limits seem to block everyone               | `TRUSTED_PROXY_HOPS` is `0` behind a proxy, so all visitors share one address. Set it to `1`.                                                                                           |
| First request is very slow                       | Cold start of the free instance, or Neon waking from sleep. Both are normal on free plans (see step 10).                                                                                |
| Demo content is visible                          | The database was seeded without `--base-only`. Back up anything real, then remove demo rows (they are flagged `isDemo`), or recreate the database and repeat step 2.                    |
| `admin:grant` says "No account for…"             | That person has not signed in yet. Sign in once with that address, then run it again.                                                                                                   |
| Photos fail to upload                            | Files must be JPEG, PNG or WebP and at most 2 MB. Check the 1 GB Neon storage limit has not been reached.                                                                               |

## Security reminders

- Secrets live only in Render, Neon, Brevo and GitHub secrets, never in the repository or in chat.
- Rotate the Neon password, Brevo key and `BETTER_AUTH_SECRET` if they are ever shown to someone else.
  Changing `BETTER_AUTH_SECRET` signs everyone out.
- The repository is proprietary (see `LICENSE`). Keep it private on GitHub and grant access only to people
  working for Expats in Business.
- Before real members join, have a lawyer review the privacy policy, terms and cookie text in `content/legal`.
