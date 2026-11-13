"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { CONNECTION_REQUESTS_PER_DAY, QUOTE_REQUESTS_PER_DAY } from "@/config/verification";

import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { formId } from "@/lib/festivals/form";
import { reviewEligibility } from "@/lib/directory/eligibility";
import { bumpProviderStat } from "@/lib/directory/stats";
import { actionEmail, sendEmail } from "@/lib/email";
import { getEnv } from "@/lib/env";
import { emailTranslator, localizedUrl } from "@/lib/i18n/email";
import { firstName, notify } from "@/lib/notifications";
import { withinLimits } from "@/lib/security/limits";
import { rateLimit } from "@/lib/rate-limit";

import type { ActionState } from "./account";

const DAY = 86_400;

/** Directory connection request (double opt-in). A declined request cannot be sent again. */
export async function sendConnectionRequest(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const parsed = z
    .object({ slug: z.string().min(1).max(80), message: z.string().trim().max(300).optional() })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "invalid" };
  const user = await requireUser(`/members/${parsed.data.slug}`);
  const db = getDb();
  const target = await db.profile.findUnique({
    where: { slug: parsed.data.slug },
    select: { userId: true, isPublic: true, user: { select: { deletionRequestedAt: true } } },
  });
  if (!target || !target.isPublic || target.user.deletionRequestedAt || target.userId === user.id) {
    return { ok: false, message: "invalid" };
  }
  const existing = await db.connection.findFirst({
    where: {
      OR: [
        { requesterId: user.id, addresseeId: target.userId },
        { requesterId: target.userId, addresseeId: user.id },
      ],
    },
  });
  if (existing)
    return { ok: false, message: existing.status === "declined" ? "declined" : "exists" };
  if (!(await rateLimit(`connect-dir:${user.id}`, CONNECTION_REQUESTS_PER_DAY, DAY)).ok) {
    return { ok: false, message: "rateLimited" };
  }
  await db.connection.create({
    data: {
      requesterId: user.id,
      addresseeId: target.userId,
      message: parsed.data.message || null,
    },
  });
  await notify(target.userId, "connectionRequest", "/connections", { name: firstName(user.name) });
  revalidatePath(`/members/${parsed.data.slug}`);
  return { ok: true };
}

/** Quote request to a provider: 5 per member per day; the provider is told by notification and email. */
export async function requestQuote(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = z
    .object({ slug: z.string().min(1).max(120), message: z.string().trim().min(20).max(2000) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "invalid" };
  const user = await requireUser(`/providers/${parsed.data.slug}`);
  const db = getDb();
  const provider = await db.provider.findUnique({
    where: { slug: parsed.data.slug },
    select: {
      id: true,
      name: true,
      ownerId: true,
      owner: { select: { email: true, locale: true } },
    },
  });
  if (!provider || provider.ownerId === user.id) return { ok: false, message: "invalid" };
  if (!(await rateLimit(`quote:${user.id}`, QUOTE_REQUESTS_PER_DAY, DAY)).ok)
    return { ok: false, message: "rateLimited" };
  await db.quoteRequest.create({
    data: { providerId: provider.id, requesterId: user.id, message: parsed.data.message },
  });
  await bumpProviderStat(provider.id, "quoteRequests");
  if (provider.ownerId && provider.owner) {
    await notify(provider.ownerId, "quoteRequest", "/provider/inbox", {
      name: firstName(user.name),
    });
    // The email carries a link only; the request itself stays in the inbox.
    const { locale, t } = emailTranslator(provider.owner.locale);
    await sendEmail({
      to: provider.owner.email,
      subject: t("quote.subject", { provider: provider.name }),
      ...actionEmail({
        heading: t("quote.heading"),
        body: t("quote.body"),
        cta: t("quote.cta"),
        url: localizedUrl("/provider/inbox", locale, getEnv().APP_URL),
      }),
    });
  }
  revalidatePath(`/providers/${parsed.data.slug}`);
  return { ok: true };
}

/** Provider owner accepts or declines a quote request; contact details are shared only on accept. */
export async function respondQuote(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/provider/inbox");
  if (!(await withinLimits(user.id, "account"))) return { ok: false, message: "rateLimited" };
  const accept = form.get("decision") === "accept";
  const db = getDb();
  const quote = await db.quoteRequest.findFirst({
    where: { id: formId(form, "id"), status: "open", provider: { ownerId: user.id } },
    select: { id: true, requesterId: true, provider: { select: { slug: true, name: true } } },
  });
  if (!quote) return { ok: false, message: "invalid" };
  await db.quoteRequest.update({
    where: { id: quote.id },
    data: { status: accept ? "accepted" : "declined", acceptedAt: accept ? new Date() : null },
  });
  await notify(
    quote.requesterId,
    accept ? "quoteAccepted" : "quoteDeclined",
    `/providers/${quote.provider.slug}`,
    { provider: quote.provider.name },
  );
  revalidatePath("/provider/inbox");
  return { ok: true, message: accept ? "accepted" : "declined" };
}

/** Review: re-checks eligibility on the server (shared quote request or shared session, once). */
export async function submitReview(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = z
    .object({
      slug: z.string().min(1).max(120),
      rating: z.coerce.number().int().min(1).max(5),
      body: z.string().trim().min(20).max(1000),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "invalid" };
  const user = await requireUser(`/providers/${parsed.data.slug}`);
  if (!(await withinLimits(user.id, "review"))) return { ok: false, message: "rateLimited" };
  const db = getDb();
  const provider = await db.provider.findUnique({
    where: { slug: parsed.data.slug },
    select: { id: true, ownerId: true },
  });
  if (!provider) return { ok: false, message: "invalid" };
  const [quote, shared, existing] = await Promise.all([
    db.quoteRequest.findFirst({
      where: { providerId: provider.id, requesterId: user.id },
      select: { id: true },
    }),
    provider.ownerId
      ? db.checkIn.findFirst({
          where: { userId: user.id, event: { checkIns: { some: { userId: provider.ownerId } } } },
          select: { eventId: true },
        })
      : null,
    db.review.findUnique({
      where: { providerId_authorId: { providerId: provider.id, authorId: user.id } },
      select: { id: true },
    }),
  ]);
  const verdict = reviewEligibility({
    viewerId: user.id,
    ownerId: provider.ownerId,
    hasQuoteRequest: Boolean(quote),
    sharedEvent: Boolean(shared),
    alreadyReviewed: Boolean(existing),
  });
  if (verdict !== "eligible") return { ok: false, message: verdict };
  await db.review.create({
    data: {
      providerId: provider.id,
      authorId: user.id,
      rating: parsed.data.rating,
      body: parsed.data.body,
      quoteRequestId: quote?.id ?? null,
      eventId: quote ? null : (shared?.eventId ?? null),
    },
  });
  revalidatePath(`/providers/${parsed.data.slug}`);
  return { ok: true };
}

/** Marks all of the user's notifications read. */
export async function markNotificationsRead(): Promise<ActionState> {
  const user = await requireUser("/notifications");
  if (!(await withinLimits(user.id, "account"))) return { ok: false, message: "rateLimited" };
  await getDb().notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
  return { ok: true };
}
