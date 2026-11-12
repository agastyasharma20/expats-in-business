"use server";

import { revalidatePath, updateTag } from "next/cache";
import { forbidden } from "next/navigation";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { isAdmin } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { formEntries, idField, priceField } from "@/lib/festivals/form";
import { toMinorUnits } from "@/lib/money";
import { withinLimits } from "@/lib/security/limits";
import { slugify } from "@/lib/slug";

import type { ActionState } from "./account";

/** Catalogs change what every chapter sees: admins only, rate-limited, every change audited. */
async function admin() {
  const user = await requirePermission("admin.access");
  if (!isAdmin(user)) forbidden();
  return { user, limited: !(await withinLimits(user.id, "admin")) };
}

const formatSchema = z.object({
  id: idField.optional(),
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().min(10).max(400),
  defaultDurationMin: z.coerce.number().int().min(15).max(720),
  sortOrder: z.coerce.number().int().min(0).max(99).default(0),
});

/** Create or edit an event format (the slug stays stable once created: links depend on it). */
export async function saveFormat(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, limited } = await admin();
  if (limited) return { ok: false, message: "rateLimited" };
  const parsed = formatSchema.safeParse(formEntries(form));
  if (!parsed.success) return { ok: false, message: "default" };
  const { id, ...data } = parsed.data;
  const db = getDb();
  const row = id
    ? await db.eventFormat.update({ where: { id }, data })
    : await db.eventFormat.create({ data: { ...data, slug: slugify(data.name) } });
  await audit({
    actorId: user.id,
    action: id ? "catalog.format.update" : "catalog.format.create",
    entityType: "EventFormat",
    entityId: row.id,
  });
  updateTag("formats");
  revalidatePath("/admin/catalogs");
  revalidatePath("/events/formats");
  return { ok: true, message: "saved" };
}

const categorySchema = z.object({
  id: idField.optional(),
  name: z.string().trim().min(2).max(60),
  sortOrder: z.coerce.number().int().min(0).max(99).default(0),
});

export async function saveCategory(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, limited } = await admin();
  if (limited) return { ok: false, message: "rateLimited" };
  const parsed = categorySchema.safeParse(formEntries(form));
  if (!parsed.success) return { ok: false, message: "default" };
  const { id, ...data } = parsed.data;
  const db = getDb();
  const slug = slugify(data.name);
  if (!id && (await db.providerCategory.findUnique({ where: { slug } })))
    return { ok: false, message: "exists" };
  const row = id
    ? await db.providerCategory.update({ where: { id }, data })
    : await db.providerCategory.create({ data: { ...data, slug } });
  await audit({
    actorId: user.id,
    action: id ? "catalog.category.update" : "catalog.category.create",
    entityType: "ProviderCategory",
    entityId: row.id,
  });
  updateTag("directory");
  revalidatePath("/admin/catalogs");
  revalidatePath("/providers");
  return { ok: true, message: "saved" };
}

const planSchema = z.object({
  id: idField,
  amount: priceField,
  priceStatus: z.enum(["proposal", "approved"]),
  isActive: z.preprocess((v) => v === "on", z.boolean()),
});

/**
 * Price and status of a plan. New checkouts use the new price; existing subscriptions keep the
 * price they signed up with (Stripe). The old and new amounts go into the audit log.
 */
export async function savePlan(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, limited } = await admin();
  if (limited) return { ok: false, message: "rateLimited" };
  const parsed = planSchema.safeParse({ isActive: "", ...formEntries(form) });
  if (!parsed.success) return { ok: false, message: "default" };
  const db = getDb();
  const plan = await db.plan.findUnique({ where: { id: parsed.data.id } });
  if (!plan) return { ok: false, message: "default" };
  const amountMinor = toMinorUnits(parsed.data.amount, plan.currency);
  await db.plan.update({
    where: { id: plan.id },
    data: { amountMinor, priceStatus: parsed.data.priceStatus, isActive: parsed.data.isActive },
  });
  await audit({
    actorId: user.id,
    action: "catalog.plan.update",
    entityType: "Plan",
    entityId: plan.id,
    meta: {
      code: plan.code,
      from: plan.amountMinor,
      to: amountMinor,
      status: parsed.data.priceStatus,
      active: parsed.data.isActive,
    },
  });
  updateTag("plans");
  revalidatePath("/admin/catalogs");
  revalidatePath("/pricing");
  return { ok: true, message: "saved" };
}
