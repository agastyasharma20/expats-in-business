"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { withinLimits } from "@/lib/security/limits";

import type { ActionState } from "./account";

const id = z.string().trim().min(1).max(40);

/**
 * Volunteer for a shift. The shift row is locked, so the last place cannot be taken twice; the
 * festival must be published with volunteering open, the shift not started, and the member not
 * already on an overlapping shift of the same festival.
 */
export async function joinShift(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/festivals");
  const shiftId = id.safeParse(form.get("shiftId"));
  if (!shiftId.success) return { ok: false };
  if (!(await withinLimits(user.id, "festival"))) return { ok: false, message: "rateLimited" };
  const db = getDb();
  const result = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "VolunteerShift" WHERE id = ${shiftId.data} FOR UPDATE`;
    const shift = await tx.volunteerShift.findUnique({
      where: { id: shiftId.data },
      include: {
        event: { select: { slug: true, status: true, volunteersOpen: true } },
        _count: { select: { signups: true } },
      },
    });
    if (!shift || shift.event.status !== "published" || !shift.event.volunteersOpen)
      return { message: "closed" as const };
    if (shift.startsAt <= new Date()) return { message: "closed" as const };
    if (shift._count.signups >= shift.capacity) return { message: "full" as const };
    const overlap = await tx.volunteerSignup.count({
      where: {
        userId: user.id,
        shift: {
          eventId: shift.eventId,
          id: { not: shift.id },
          startsAt: { lt: shift.endsAt },
          endsAt: { gt: shift.startsAt },
        },
      },
    });
    if (overlap) return { message: "overlap" as const };
    await tx.volunteerSignup.createMany({
      data: [{ shiftId: shift.id, userId: user.id }],
      skipDuplicates: true,
    });
    return { message: "joined" as const, slug: shift.event.slug };
  });
  if (result.message !== "joined") return { ok: false, message: result.message };
  revalidatePath(`/festivals/${result.slug}`);
  return { ok: true, message: "joined" };
}

export async function leaveShift(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/festivals");
  const shiftId = id.safeParse(form.get("shiftId"));
  if (!shiftId.success) return { ok: false };
  const db = getDb();
  const shift = await db.volunteerShift.findUnique({
    where: { id: shiftId.data },
    select: { startsAt: true, event: { select: { slug: true } } },
  });
  if (!shift || shift.startsAt <= new Date()) return { ok: false, message: "closed" };
  await db.volunteerSignup.deleteMany({ where: { shiftId: shiftId.data, userId: user.id } });
  revalidatePath(`/festivals/${shift.event.slug}`);
  return { ok: true, message: "left" };
}

const stallSchema = z.object({
  eventId: id,
  businessName: z.string().trim().min(2).max(120),
  category: z.enum(["food", "crafts", "culture", "services", "nonprofit", "other"]),
  description: z.string().trim().min(30).max(1500),
  website: z.union([z.url({ protocol: /^https$/ }).max(300), z.literal("")]).default(""),
});

/**
 * Apply for a stall (vendors, exhibitors, community groups). One application per member and
 * festival; a withdrawn or declined one can be sent again. Contact goes through the account email.
 */
export async function applyForStall(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/festivals");
  const parsed = stallSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "stall" };
  if (!(await withinLimits(user.id, "festival"))) return { ok: false, message: "rateLimited" };
  const db = getDb();
  const event = await db.event.findUnique({
    where: { id: parsed.data.eventId },
    select: { id: true, slug: true, kind: true, status: true, stallsOpen: true, startsAt: true },
  });
  if (
    !event ||
    event.kind !== "festival" ||
    event.status !== "published" ||
    !event.stallsOpen ||
    event.startsAt <= new Date()
  ) {
    return { ok: false, message: "closed" };
  }
  const data = {
    businessName: parsed.data.businessName,
    category: parsed.data.category,
    description: parsed.data.description,
    website: parsed.data.website || null,
  };
  const existing = await db.stallApplication.findUnique({
    where: { eventId_userId: { eventId: event.id, userId: user.id } },
    select: { status: true },
  });
  if (existing && !["withdrawn", "declined"].includes(existing.status)) {
    return { ok: false, message: "exists" };
  }
  await db.stallApplication.upsert({
    where: { eventId_userId: { eventId: event.id, userId: user.id } },
    update: {
      ...data,
      status: "submitted",
      reviewNote: null,
      reviewedAt: null,
      reviewedById: null,
    },
    create: { ...data, eventId: event.id, userId: user.id },
  });
  revalidatePath(`/festivals/${event.slug}`);
  return { ok: true, message: "applied" };
}

export async function withdrawStall(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/festivals");
  const eventId = id.safeParse(form.get("eventId"));
  if (!eventId.success) return { ok: false };
  const db = getDb();
  const { count } = await db.stallApplication.updateMany({
    where: { eventId: eventId.data, userId: user.id, status: { in: ["submitted", "waitlisted"] } },
    data: { status: "withdrawn" },
  });
  if (!count) return { ok: false };
  const event = await db.event.findUnique({ where: { id: eventId.data }, select: { slug: true } });
  if (event) revalidatePath(`/festivals/${event.slug}`);
  return { ok: true, message: "withdrawn" };
}
