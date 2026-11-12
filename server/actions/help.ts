"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { sendEmail } from "@/lib/email";
import { clientIp } from "@/lib/client-ip";
import { getEnv } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

import type { ActionState } from "./account";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().max(200),
  message: z.string().trim().min(10).max(4000),
});

/** /help contact form → admin inbox (old bug 3: "Need help" did nothing). 5 per hour per IP. */
export async function sendHelpMessage(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "invalid" };
  // Per client (trusted proxy IP, else the address given) and a global hourly cap against floods.
  const ip = clientIp((await headers()).get("x-forwarded-for"), getEnv().TRUSTED_PROXY_HOPS);
  const who = ip ?? `email:${parsed.data.email.toLowerCase()}`;
  if (!(await rateLimit(`help-all`, 50, 3600)).ok) return { ok: false, message: "rateLimited" };
  if (!(await rateLimit(`help:${who}`, 5, 3600)).ok) return { ok: false, message: "rateLimited" };
  const { name, email, message } = parsed.data;
  await sendEmail({
    to: getEnv().ADMIN_INBOX_EMAIL,
    subject: `Help request from ${name}`,
    text: `From: ${name} <${email}>\n\n${message}`,
  });
  return { ok: true };
}
