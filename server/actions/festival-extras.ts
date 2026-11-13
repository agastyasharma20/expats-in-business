"use server";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { idField, removeItemSchema } from "@/lib/festivals/form";
import { editFestival as edit } from "@/lib/festivals/manager";
import { firstName, notify } from "@/lib/notifications";
import type { ActionState } from "./account";

const faqSchema = z.object({
  question: z.string().trim().min(5).max(200),
  answer: z.string().trim().min(5).max(1500),
  sortOrder: z.coerce.number().int().min(0).max(99).default(0),
});

export async function addFaq(_prev: ActionState, form: FormData) {
  return edit(
    form,
    faqSchema,
    async ({ event }, f) => {
      await getDb().eventFaq.create({ data: { eventId: event.id, ...f } });
    },
    "festival.faq.add",
  );
}

export async function removeFaq(_prev: ActionState, form: FormData) {
  return edit(
    form,
    removeItemSchema,
    async ({ event }, { itemId }) => {
      await getDb().eventFaq.deleteMany({ where: { id: itemId, eventId: event.id } });
    },
    "festival.faq.remove",
  );
}

const partnerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  website: z.union([z.url({ protocol: /^https$/ }).max(300), z.literal("")]).default(""),
  tier: z.enum(["headline", "gold", "silver", "community", "media"]),
});

/** Partners appear on the festival page; each gets a signed sponsor-report link. */
export async function addPartner(_prev: ActionState, form: FormData) {
  return edit(
    form,
    partnerSchema,
    async ({ event }, p) => {
      const db = getDb();
      const sponsor = await db.sponsor.create({
        data: { name: p.name, website: p.website || null },
      });
      await db.sponsorship.create({
        data: {
          sponsorId: sponsor.id,
          eventId: event.id,
          tier: p.tier,
          reportToken: randomBytes(24).toString("base64url"),
        },
      });
    },
    "festival.partner.add",
  );
}

export async function removePartner(_prev: ActionState, form: FormData) {
  return edit(
    form,
    removeItemSchema,
    async ({ event }, { itemId }) => {
      await getDb().sponsorship.deleteMany({ where: { id: itemId, eventId: event.id } });
    },
    "festival.partner.remove",
  );
}

const reviewSchema = z.object({
  itemId: idField,
  decision: z.enum(["accepted", "waitlisted", "declined"]),
  note: z.string().trim().max(500).default(""),
});

const STALL_NOTICE = {
  accepted: "stallAccepted",
  waitlisted: "stallWaitlisted",
  declined: "stallDeclined",
} as const;

/** Decide a stall application; the applicant is notified in the app. */
export async function reviewStall(_prev: ActionState, form: FormData) {
  return edit(
    form,
    reviewSchema,
    async ({ event, user }, r) => {
      const db = getDb();
      const stall = await db.stallApplication.findFirst({
        where: { id: r.itemId, eventId: event.id, status: { not: "withdrawn" } },
        select: { id: true, userId: true },
      });
      if (!stall) return { ok: false, message: "default" };
      await db.stallApplication.update({
        where: { id: stall.id },
        data: {
          status: r.decision,
          reviewNote: r.note || null,
          reviewedById: user.id,
          reviewedAt: new Date(),
        },
      });
      await notify(stall.userId, STALL_NOTICE[r.decision], `/festivals/${event.slug}`, {
        name: firstName(user.name),
      });
      return { ok: true, message: r.decision };
    },
    "festival.stall.review",
  );
}
