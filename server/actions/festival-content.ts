"use server";

import { randomBytes } from "node:crypto";

import { z } from "zod";

import { getDb } from "@/lib/db";
import {
  dateField,
  formEntries,
  idField,
  localToUtc,
  priceField,
  priceToMinor,
  timeField,
} from "@/lib/festivals/form";
import { afterFestivalChange, festivalForManager } from "@/lib/festivals/manager";
import { firstName, notify } from "@/lib/notifications";

import type { ActionState } from "./account";

type Manager = Awaited<ReturnType<typeof festivalForManager>>;

/** Shared pipeline: manager check + limit → parse → write → audit + revalidate. */
async function edit<T extends z.ZodTypeAny>(
  form: FormData,
  schema: T,
  write: (m: Manager, input: z.infer<T>) => Promise<ActionState | void>,
  action: string,
): Promise<ActionState> {
  const manager = await festivalForManager(form.get("eventId"));
  if (manager.limited) return { ok: false, message: "rateLimited" };
  const parsed = schema.safeParse(formEntries(form));
  if (!parsed.success) return { ok: false, message: "default" };
  const result = await write(manager, parsed.data);
  if (result && !result.ok) return result;
  await afterFestivalChange(manager.user, manager.event, action);
  return result ?? { ok: true, message: "saved" };
}

const tierSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(200).default(""),
  price: priceField,
  capacity: z.coerce.number().int().min(1).max(100_000).optional(),
  salesEndDate: dateField.optional(),
  salesEndTime: timeField.optional(),
  sortOrder: z.coerce.number().int().min(0).max(99).default(0),
});

export async function addTier(_prev: ActionState, form: FormData) {
  return edit(
    form,
    tierSchema,
    async ({ event }, t) => {
      const tz = event.chapter.timezone;
      await getDb().ticketType.create({
        data: {
          eventId: event.id,
          name: t.name,
          description: t.description || null,
          priceMinor: priceToMinor(t.price, event.chapter.currency),
          currency: event.chapter.currency,
          capacity: t.capacity ?? null,
          sortOrder: t.sortOrder,
          salesEndAt: t.salesEndDate
            ? localToUtc(t.salesEndDate, t.salesEndTime ?? "23:59", tz)
            : null,
        },
      });
    },
    "festival.tier.add",
  );
}

const removeSchema = z.object({ itemId: idField });

/** A tier with tickets (any status) is kept: tickets and payments must stay traceable. */
export async function removeTier(_prev: ActionState, form: FormData) {
  return edit(
    form,
    removeSchema,
    async ({ event }, { itemId }) => {
      const used = await getDb().ticket.count({ where: { ticketTypeId: itemId } });
      if (used) return { ok: false, message: "tierInUse" };
      await getDb().ticketType.deleteMany({ where: { id: itemId, eventId: event.id } });
    },
    "festival.tier.remove",
  );
}

const programmeSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).default(""),
  kind: z.enum(["performance", "talk", "workshop", "food", "family", "exhibition", "other"]),
  stage: z.string().trim().max(60).default(""),
  performer: z.string().trim().max(120).default(""),
  date: dateField,
  start: timeField,
  end: timeField,
});

export async function addProgrammeItem(_prev: ActionState, form: FormData) {
  return edit(
    form,
    programmeSchema,
    async ({ event }, p) => {
      const tz = event.chapter.timezone;
      const startsAt = localToUtc(p.date, p.start, tz);
      const endsAt = localToUtc(p.date, p.end, tz);
      if (endsAt <= startsAt) return { ok: false, message: "dates" };
      await getDb().eventProgrammeItem.create({
        data: {
          eventId: event.id,
          title: p.title,
          description: p.description || null,
          kind: p.kind,
          stage: p.stage || null,
          performer: p.performer || null,
          startsAt,
          endsAt,
        },
      });
    },
    "festival.programme.add",
  );
}

export async function removeProgrammeItem(_prev: ActionState, form: FormData) {
  return edit(
    form,
    removeSchema,
    async ({ event }, { itemId }) => {
      await getDb().eventProgrammeItem.deleteMany({ where: { id: itemId, eventId: event.id } });
    },
    "festival.programme.remove",
  );
}

const shiftSchema = z.object({
  role: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).default(""),
  date: dateField,
  start: timeField,
  end: timeField,
  capacity: z.coerce.number().int().min(1).max(500),
});

export async function addShift(_prev: ActionState, form: FormData) {
  return edit(
    form,
    shiftSchema,
    async ({ event }, s) => {
      const tz = event.chapter.timezone;
      const startsAt = localToUtc(s.date, s.start, tz);
      const endsAt = localToUtc(s.date, s.end, tz);
      if (endsAt <= startsAt) return { ok: false, message: "dates" };
      await getDb().volunteerShift.create({
        data: {
          eventId: event.id,
          role: s.role,
          description: s.description || null,
          startsAt,
          endsAt,
          capacity: s.capacity,
        },
      });
    },
    "festival.shift.add",
  );
}

/** Shifts with volunteers are kept (people planned their day around them). */
export async function removeShift(_prev: ActionState, form: FormData) {
  return edit(
    form,
    removeSchema,
    async ({ event }, { itemId }) => {
      const signups = await getDb().volunteerSignup.count({ where: { shiftId: itemId } });
      if (signups) return { ok: false, message: "shiftInUse" };
      await getDb().volunteerShift.deleteMany({ where: { id: itemId, eventId: event.id } });
    },
    "festival.shift.remove",
  );
}

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
    removeSchema,
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
    removeSchema,
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
