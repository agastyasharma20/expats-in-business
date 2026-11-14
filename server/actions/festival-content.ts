"use server";

import { z } from "zod";

import { getDb } from "@/lib/db";
import {
  dateField,
  localToUtc,
  priceField,
  priceToMinor,
  timeField,
  removeItemSchema,
} from "@/lib/festivals/form";
import { editFestival as edit } from "@/lib/festivals/manager";

import type { ActionState } from "./account";

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

/** A tier with tickets (any status) is kept: tickets and payments must stay traceable. */
export async function removeTier(_prev: ActionState, form: FormData) {
  return edit(
    form,
    removeItemSchema,
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
    removeItemSchema,
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
    removeItemSchema,
    async ({ event }, { itemId }) => {
      const signups = await getDb().volunteerSignup.count({ where: { shiftId: itemId } });
      if (signups) return { ok: false, message: "shiftInUse" };
      await getDb().volunteerShift.deleteMany({ where: { id: itemId, eventId: event.id } });
    },
    "festival.shift.remove",
  );
}
