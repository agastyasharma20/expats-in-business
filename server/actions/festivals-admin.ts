"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import { forbidden, redirect } from "next/navigation";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { can } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
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
import { MAX_PER_ORDER_LIMIT } from "@/lib/festivals/rules";
import { withinLimits } from "@/lib/security/limits";
import { slugify } from "@/lib/slug";

import { afterFestivalChange, festivalForManager } from "@/lib/festivals/manager";

import type { ActionState } from "./account";

const createSchema = z.object({
  chapterId: idField,
  title: z.string().trim().min(3).max(120),
  tagline: z.string().trim().max(160).default(""),
  summary: z.string().trim().min(10).max(200),
  description: z.string().trim().max(8000).default(""),
  startDate: dateField,
  startTime: timeField,
  endDate: dateField,
  endTime: timeField,
  venueId: idField,
  capacity: z.coerce.number().int().min(10).max(100_000),
  maxPerOrder: z.coerce.number().int().min(1).max(MAX_PER_ORDER_LIMIT),
  tierName: z.string().trim().min(2).max(60),
  tierPrice: priceField,
});

/** New festival: draft with one ticket tier; the console adds the rest before publishing. */
export async function createFestival(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/admin/festivals/new");
  const parsed = createSchema.safeParse(formEntries(form));
  if (!parsed.success) return { ok: false, message: "default" };
  const input = parsed.data;
  if (!can(user, "event.manage", { chapterId: input.chapterId })) forbidden();
  if (!(await withinLimits(user.id, "admin"))) return { ok: false, message: "rateLimited" };
  const db = getDb();
  const [chapter, venue, format] = await Promise.all([
    db.chapter.findUniqueOrThrow({
      where: { id: input.chapterId },
      select: { timezone: true, currency: true },
    }),
    db.venue.findFirst({ where: { id: input.venueId, chapterId: input.chapterId } }),
    db.eventFormat.findFirst({
      orderBy: { sortOrder: "asc" },
      where: { slug: "cultural-exchange" },
    }),
  ]);
  if (!venue) return { ok: false, message: "venue" };
  const startsAt = localToUtc(input.startDate, input.startTime, chapter.timezone);
  const endsAt = localToUtc(input.endDate, input.endTime, chapter.timezone);
  if (startsAt <= new Date()) return { ok: false, message: "past" };
  if (endsAt <= startsAt || endsAt.getTime() - startsAt.getTime() > 14 * 86_400_000)
    return { ok: false, message: "dates" };
  const fallbackFormat =
    format ?? (await db.eventFormat.findFirstOrThrow({ orderBy: { sortOrder: "asc" } }));
  const event = await db.event.create({
    data: {
      kind: "festival",
      slug: `${slugify(input.title)}-${input.startDate}-${randomBytes(2).toString("hex")}`,
      chapterId: input.chapterId,
      formatId: fallbackFormat.id,
      title: input.title,
      tagline: input.tagline || null,
      summary: input.summary,
      description: input.description || input.summary,
      startsAt,
      endsAt,
      venueId: venue.id,
      capacity: input.capacity,
      maxPerOrder: input.maxPerOrder,
      status: "draft",
      createdById: user.id,
      ticketTypes: {
        create: {
          name: input.tierName,
          priceMinor: priceToMinor(input.tierPrice, chapter.currency),
          currency: chapter.currency,
        },
      },
    },
  });
  await audit({
    actorId: user.id,
    action: "festival.create",
    entityType: "Event",
    entityId: event.id,
    chapterId: input.chapterId,
  });
  revalidatePath("/admin/festivals");
  redirect(`/admin/festivals/${event.id}`);
}

const settingsSchema = z.object({
  eventId: idField,
  title: z.string().trim().min(3).max(120),
  tagline: z.string().trim().max(160).default(""),
  summary: z.string().trim().min(10).max(200),
  description: z.string().trim().min(10).max(8000),
  capacity: z.coerce.number().int().min(10).max(100_000),
  maxPerOrder: z.coerce.number().int().min(1).max(MAX_PER_ORDER_LIMIT),
  volunteersOpen: z.preprocess((v) => v === "on", z.boolean()),
  stallsOpen: z.preprocess((v) => v === "on", z.boolean()),
  stallFee: priceField.optional(),
});

/** Festival details and switches. Capacity can never drop below places already sold. */
export async function updateFestival(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, event, limited } = await festivalForManager(form.get("eventId"));
  if (limited) return { ok: false, message: "rateLimited" };
  const raw = formEntries(form);
  const parsed = settingsSchema.safeParse({ volunteersOpen: "", stallsOpen: "", ...raw });
  if (!parsed.success) return { ok: false, message: "default" };
  const input = parsed.data;
  const db = getDb();
  const sold = await db.ticket.aggregate({
    _sum: { quantity: true },
    where: { eventId: event.id, status: { in: ["confirmed", "reserved"] } },
  });
  if (input.capacity < (sold._sum.quantity ?? 0)) return { ok: false, message: "capacity" };
  await db.event.update({
    where: { id: event.id },
    data: {
      title: input.title,
      tagline: input.tagline || null,
      summary: input.summary,
      description: input.description,
      capacity: input.capacity,
      maxPerOrder: input.maxPerOrder,
      volunteersOpen: input.volunteersOpen,
      stallsOpen: input.stallsOpen,
      stallFeeMinor:
        input.stallFee === undefined ? null : priceToMinor(input.stallFee, event.chapter.currency),
    },
  });
  await afterFestivalChange(user, event, "festival.update");
  return { ok: true, message: "saved" };
}

const statusSchema = z.object({
  eventId: idField,
  status: z.enum(["draft", "published", "cancelled"]),
});

/** Publish, unpublish or cancel. Publishing needs at least one ticket tier. */
export async function setFestivalStatus(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, event, limited } = await festivalForManager(form.get("eventId"));
  if (limited) return { ok: false, message: "rateLimited" };
  const parsed = statusSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false };
  if (parsed.data.status === "published") {
    const tiers = await getDb().ticketType.count({ where: { eventId: event.id } });
    if (!tiers) return { ok: false, message: "noTiers" };
  }
  await getDb().event.update({ where: { id: event.id }, data: { status: parsed.data.status } });
  await afterFestivalChange(user, event, `festival.${parsed.data.status}`);
  return { ok: true, message: parsed.data.status };
}
