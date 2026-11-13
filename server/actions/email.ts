"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { actionEmail, sendEmail } from "@/lib/email";
import { getEnv } from "@/lib/env";
import { emailTranslator } from "@/lib/i18n/email";
import { rateLimit } from "@/lib/rate-limit";
import { hashToken } from "@/lib/tokens";

import type { ActionState } from "./account";

const TOKEN_HOURS = 24;

async function sendVerification(email: string, token: string, savedLocale: string | null) {
  // API routes are not locale-prefixed; only the copy follows the member's language.
  const url = new URL(`/api/email/verify?token=${token}`, getEnv().APP_URL).toString();
  const { t } = emailTranslator(savedLocale);
  const message = actionEmail({
    heading: t("verify.heading"),
    body: t("verify.body", { email, hours: TOKEN_HOURS }),
    cta: t("verify.cta"),
    url,
  });
  await sendEmail({ to: email, subject: t("verify.subject"), ...message });
}

async function issueToken(id: string, email: string) {
  const token = randomBytes(24).toString("base64url");
  const row = await getDb().userEmail.update({
    where: { id },
    data: {
      tokenHash: hashToken(token),
      tokenExpiresAt: new Date(Date.now() + TOKEN_HOURS * 3_600_000),
    },
    select: { user: { select: { locale: true } } },
  });
  await sendVerification(email, token, row.user.locale);
}

/** Settings → Email: add a secondary address and email a verification link (old bug 5). */
export async function addEmail(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/settings/email");
  const parsed = z.object({ email: z.email().max(200) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "invalid" };
  if (!(await rateLimit(`email-add:${user.id}`, 10, 3600)).ok)
    return { ok: false, message: "rateLimited" };
  const email = parsed.data.email.toLowerCase();
  const db = getDb();
  const taken =
    (await db.user.count({ where: { email } })) + (await db.userEmail.count({ where: { email } }));
  if (taken) return { ok: false, message: "taken" };
  const row = await db.userEmail.create({ data: { userId: user.id, email } });
  await issueToken(row.id, email);
  revalidatePath("/settings/email");
  return { ok: true, message: email };
}

export async function resendEmail(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/settings/email");
  const row = await getDb().userEmail.findFirst({
    where: { id: String(form.get("id")), userId: user.id, verifiedAt: null },
  });
  if (!row) return { ok: false };
  if (!(await rateLimit(`email-resend:${user.id}`, 5, 3600)).ok)
    return { ok: false, message: "rateLimited" };
  await issueToken(row.id, row.email);
  return { ok: true, message: row.email };
}

export async function removeEmail(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/settings/email");
  await getDb().userEmail.deleteMany({ where: { id: String(form.get("id")), userId: user.id } });
  revalidatePath("/settings/email");
  return { ok: true };
}
