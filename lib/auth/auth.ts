import { createId } from "@paralleldrive/cuid2";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins/magic-link";

import { getDb } from "@/lib/db";
import { actionEmail, sendEmail } from "@/lib/email";
import { getEnv } from "@/lib/env";
import { emailTranslator } from "@/lib/i18n/email";
import { rateLimit } from "@/lib/rate-limit";

const env = getEnv();
const google =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
    : undefined;

export const googleEnabled = Boolean(google);

/**
 * Better Auth: email magic link (delivered to Mailpit locally), Google only when keys exist,
 * email + password for the seeded demo accounts. Sessions live in the database; ids are cuid2.
 * Sign-in endpoints are limited to 5 attempts per minute per IP.
 */
export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: prismaAdapter(getDb(), { provider: "postgresql" }),
  advanced: { database: { generateId: () => createId() } },
  emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 8 },
  socialProviders: google,
  session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
  // Limits are stored in Postgres (lib/rate-limit.ts) so they hold across server instances and
  // restarts; process memory would let a bot reset them by hitting another instance.
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-in/magic-link": { window: 60, max: 5 },
      "/magic-link/verify": { window: 60, max: 10 },
    },
    customStorage: {
      consume: async (key, rule) => {
        const result = await rateLimit(`auth:${key}`, rule.max, rule.window);
        return { allowed: result.ok, retryAfter: result.ok ? null : result.retryAfterSeconds };
      },
    },
  },
  databaseHooks: {
    session: {
      create: {
        // Suspended accounts cannot start a session by any sign-in method.
        before: async (session) => {
          const user = await getDb().user.findUnique({
            where: { id: session.userId },
            select: { suspendedAt: true },
          });
          if (user?.suspendedAt) throw new APIError("FORBIDDEN", { message: "Account suspended" });
        },
      },
    },
  },
  plugins: [
    magicLink({
      expiresIn: 60 * 15,
      sendMagicLink: async ({ email, url }) => {
        const account = await getDb().user.findUnique({
          where: { email },
          select: { locale: true },
        });
        const { t } = emailTranslator(account?.locale);
        const message = actionEmail({
          heading: t("magicLink.heading"),
          body: t("magicLink.body"),
          cta: t("magicLink.cta"),
          url,
        });
        await sendEmail({ to: email, subject: t("magicLink.subject"), ...message });
      },
    }),
    nextCookies(),
  ],
});
