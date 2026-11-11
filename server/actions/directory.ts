"use server";

import { revalidatePath } from "next/cache";
import { forbidden } from "next/navigation";
import { z } from "zod";

import {
  CONNECTION_REQUESTS_PER_DAY,
  QUOTE_REQUESTS_PER_DAY,
  canApprove,
} from "@/config/verification";
import { audit } from "@/lib/audit";
import { isAdmin } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { reviewEligibility } from "@/lib/directory/eligibility";
import { bumpProviderStat } from "@/lib/directory/stats";
import { actionEmail, sendEmail } from "@/lib/email";
import { getEnv } from "@/lib/env";
import { firstName, notify } from "@/lib/notifications";
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
    select: { id: true, name: true, ownerId: true, owner: { select: { email: true } } },
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
    const url = new URL("/provider/inbox", getEnv().APP_URL).toString();
    await sendEmail({
      to: provider.owner.email,
      subject: `New quote request for ${provider.name}`,
      ...actionEmail({
        heading: "You have a new quote request",
        body: "A member sent you a quote request. Open your inbox to read it and reply.",
        cta: "Open inbox",
        url,
      }),
    });
  }
  revalidatePath(`/providers/${parsed.data.slug}`);
  return { ok: true };
}

/** Provider owner accepts or declines a quote request; contact details are shared only on accept. */
export async function respondQuote(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/provider/inbox");
  const accept = form.get("decision") === "accept";
  const db = getDb();
  const quote = await db.quoteRequest.findFirst({
    where: { id: String(form.get("id")), status: "open", provider: { ownerId: user.id } },
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

/** Provider owner asks for verification (none or rejected → pending). */
export async function requestVerification(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser("/provider/inbox");
  const { count } = await getDb().provider.updateMany({
    where: {
      id: String(form.get("providerId")),
      ownerId: user.id,
      verificationStatus: { in: ["none", "rejected"] },
    },
    data: { verificationStatus: "pending" },
  });
  if (!count) return { ok: false, message: "invalid" };
  revalidatePath("/provider/inbox");
  return { ok: true };
}

const decisionSchema = z.object({
  providerId: z.string().min(1),
  decision: z.enum(["approve", "reject"]),
  registryChecked: z.preprocess((v) => v === "on", z.boolean()),
  referencesChecked: z.preprocess((v) => v === "on", z.boolean()),
  insuranceChecked: z.preprocess((v) => v === "on", z.boolean()),
  notes: z.string().trim().max(1000).optional(),
});

/** Admin verification decision: the badge exists only after an approval with every check ticked. */
export async function decideVerification(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/admin/providers");
  if (!isAdmin(user)) forbidden();
  const parsed = decisionSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "invalid" };
  const { providerId, decision, notes, ...checks } = parsed.data;
  if (decision === "approve" && !canApprove(checks)) return { ok: false, message: "incomplete" };
  const db = getDb();
  const provider = await db.provider.findUnique({
    where: { id: providerId },
    select: { slug: true, ownerId: true, chapterId: true },
  });
  if (!provider) return { ok: false, message: "invalid" };
  await db.$transaction([
    db.providerVerification.create({
      data: {
        providerId,
        ...checks,
        notes: notes || null,
        verifiedById: user.id,
        decidedAt: new Date(),
      },
    }),
    db.provider.update({
      where: { id: providerId },
      data: { verificationStatus: decision === "approve" ? "verified" : "rejected" },
    }),
  ]);
  await audit({
    actorId: user.id,
    action: `provider.verification.${decision}`,
    entityType: "Provider",
    entityId: providerId,
    chapterId: provider.chapterId,
  });
  if (provider.ownerId) {
    await notify(
      provider.ownerId,
      decision === "approve" ? "verificationApproved" : "verificationRejected",
      `/providers/${provider.slug}`,
    );
  }
  revalidatePath("/admin/providers");
  revalidatePath(`/providers/${provider.slug}`);
  revalidatePath("/providers");
  return { ok: true, message: decision };
}

/** Marks all of the user's notifications read. */
export async function markNotificationsRead(): Promise<ActionState> {
  const user = await requireUser("/notifications");
  await getDb().notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
  return { ok: true };
}
