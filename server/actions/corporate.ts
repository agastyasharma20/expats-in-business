"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { sendEmail } from "@/lib/email";
import { getEnv } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

import type { ActionState } from "./account";

const schema = z.object({
  company: z.string().trim().min(2).max(120),
  name: z.string().trim().min(2).max(80),
  email: z.email().max(200),
  size: z.enum(["s", "m", "l", "xl"]),
  message: z.string().trim().min(10).max(4000),
});

/** Corporate plan enquiry → team inbox. Sold by conversation, never by checkout. 3 per hour per IP. */
export async function sendCorporateEnquiry(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "invalid" };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!(await rateLimit(`corporate:${ip}`, 3, 3600)).ok)
    return { ok: false, message: "rateLimited" };
  const { company, name, email, size, message } = parsed.data;
  await sendEmail({
    to: getEnv().ADMIN_INBOX_EMAIL,
    subject: `Corporate enquiry: ${company}`,
    text: `Company: ${company}\nContact: ${name} <${email}>\nInternational employees: ${size}\n\n${message}`,
  });
  return { ok: true };
}
