"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath, revalidateTag } from "next/cache";
import { forbidden, redirect } from "next/navigation";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { can } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { withinLimits } from "@/lib/security/limits";
import { zonedTimeToUtc } from "@/lib/time";

import type { ActionState } from "./account";

const schema = z.object({
  chapterId: z.string().min(1),
  formatId: z.string().min(1),
  title: z.string().trim().min(3).max(120),
  summary: z.string().trim().min(10).max(200),
  description: z.string().trim().max(5000).optional().default(""),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start: z.string().regex(/^\d{2}:\d{2}$/),
  duration: z.coerce.number().int().min(15).max(720).optional(),
  venueId: z.string().optional(),
  online: z.preprocess((v) => v === "on", z.boolean()),
  onlineUrl: z.union([z.url({ protocol: /^https$/ }).max(500), z.literal("")]).optional(),
  capacity: z.coerce.number().int().min(1).max(5000),
  price: z.coerce.number().min(0).max(100_000),
  publish: z.preprocess((v) => v === "on", z.boolean()),
});

/** Event builder (chapter leads and admins): one form, sensible defaults, live in under two minutes. */
export async function createEvent(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/admin/events/new");
  if (!(await withinLimits(user.id, "admin"))) return { ok: false, message: "rateLimited" };
  const raw = Object.fromEntries([...form].filter(([, v]) => v !== ""));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "default" };
  const input = parsed.data;
  if (!can(user, "event.manage", { chapterId: input.chapterId })) forbidden();
  if (!input.online && !input.venueId) return { ok: false, message: "venue" };
  if (input.online && !input.onlineUrl) return { ok: false, message: "venue" };

  const db = getDb();
  const [chapter, format] = await Promise.all([
    db.chapter.findUniqueOrThrow({
      where: { id: input.chapterId },
      select: { timezone: true, currency: true },
    }),
    db.eventFormat.findUniqueOrThrow({
      where: { id: input.formatId },
      select: { defaultDurationMin: true },
    }),
  ]);
  const [year, month, day] = input.date.split("-").map(Number) as [number, number, number];
  const [hour, minute] = input.start.split(":").map(Number) as [number, number];
  const startsAt = zonedTimeToUtc({ year, month, day, hour, minute }, chapter.timezone);
  if (startsAt < new Date()) return { ok: false, message: "past" };
  const endsAt = new Date(
    startsAt.getTime() + (input.duration ?? format.defaultDurationMin) * 60_000,
  );
  const venue = input.online
    ? null
    : await db.venue.findFirst({ where: { id: input.venueId, chapterId: input.chapterId } });
  if (!input.online && !venue) return { ok: false, message: "venue" };

  const priceMinor = Math.round(input.price * 100);
  const event = await db.event.create({
    data: {
      slug: `${slugify(input.title)}-${input.date}-${randomBytes(2).toString("hex")}`,
      chapterId: input.chapterId,
      formatId: input.formatId,
      title: input.title,
      summary: input.summary,
      description: input.description || input.summary,
      startsAt,
      endsAt,
      venueId: venue?.id ?? null,
      onlineUrl: input.online ? input.onlineUrl : null,
      capacity: input.capacity,
      status: input.publish ? "published" : "draft",
      createdById: user.id,
      ticketTypes: {
        create: { name: priceMinor ? "Standard" : "Free", priceMinor, currency: chapter.currency },
      },
    },
  });
  await audit({
    actorId: user.id,
    action: "event.create",
    entityType: "Event",
    entityId: event.id,
    chapterId: input.chapterId,
  });
  revalidateTag("events", "max");
  revalidatePath("/admin/events");
  redirect(input.publish ? `/events/${event.slug}` : "/admin/events");
}
