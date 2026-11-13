"use server";

import { revalidatePath } from "next/cache";
import { forbidden } from "next/navigation";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { isAdmin } from "@/lib/auth/permissions";
import { requirePermission, requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { formEntries, idField } from "@/lib/festivals/form";
import { canMove, REVIEW_STATUSES, ROLE_KINDS } from "@/lib/growth/rules";
import { notify } from "@/lib/notifications";
import { withinLimits } from "@/lib/security/limits";
import { slugify } from "@/lib/slug";

import type { ActionState } from "./account";

const applySchema = z.object({
  roleId: idField,
  message: z.string().trim().min(40).max(2000),
  portfolioUrl: z.union([z.url({ protocol: /^https$/ }).max(300), z.literal("")]).default(""),
});

/** Apply for an open role (careers or volunteering). One application per role and member. */
export async function applyForRole(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/careers");
  const parsed = applySchema.safeParse(formEntries(form));
  if (!parsed.success) return { ok: false, message: "default" };
  if (!(await withinLimits(user.id, "apply"))) return { ok: false, message: "rateLimited" };
  const db = getDb();
  const role = await db.openRole.findUnique({
    where: { id: parsed.data.roleId },
    select: { id: true, slug: true, status: true },
  });
  if (!role || role.status !== "open") return { ok: false, message: "closed" };
  const fields = { message: parsed.data.message, portfolioUrl: parsed.data.portfolioUrl || null };
  try {
    // A withdrawn application may be sent again (same row, review fields cleared); any other
    // existing application blocks a second one.
    const reopened = await db.roleApplication.updateMany({
      where: { roleId: role.id, userId: user.id, status: "withdrawn" },
      data: {
        ...fields,
        status: "submitted",
        reviewNote: null,
        reviewedById: null,
        reviewedAt: null,
      },
    });
    if (!reopened.count)
      await db.roleApplication.create({ data: { roleId: role.id, userId: user.id, ...fields } });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return { ok: false, message: "exists" };
    throw error;
  }
  revalidatePath(`/careers/${role.slug}`);
  revalidatePath("/admin/roles");
  return { ok: true, message: "sent" };
}

export async function withdrawRoleApplication(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser("/careers");
  const id = idField.safeParse(form.get("id"));
  if (!id.success) return { ok: false };
  const { count } = await getDb().roleApplication.updateMany({
    where: {
      id: id.data,
      userId: user.id,
      status: { in: ["submitted", "in_review", "waitlisted"] },
    },
    data: { status: "withdrawn" },
  });
  if (!count) return { ok: false };
  revalidatePath("/careers");
  return { ok: true, message: "withdrawn" };
}

async function adminOnly() {
  const user = await requirePermission("admin.access");
  if (!isAdmin(user)) forbidden();
  return { user, limited: !(await withinLimits(user.id, "admin")) };
}

/** One item per line, trimmed, empties dropped, at most 12 lines of 200 characters. */
const lines = z
  .string()
  .default("")
  .transform((v) =>
    v
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean),
  )
  .pipe(z.array(z.string().max(200)).max(12));

const roleSchema = z.object({
  id: idField.optional(),
  title: z.string().trim().min(3).max(100),
  team: z.string().trim().min(2).max(60),
  kind: z.enum(ROLE_KINDS),
  location: z.string().trim().min(2).max(80),
  commitment: z.string().trim().min(2).max(80),
  summary: z.string().trim().min(20).max(600),
  responsibilities: lines,
  requirements: lines,
  status: z.enum(["draft", "open", "closed"]),
});

/** Create or edit a role. The slug is fixed at creation (shared links keep working). */
export async function saveRole(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, limited } = await adminOnly();
  if (limited) return { ok: false, message: "rateLimited" };
  const parsed = roleSchema.safeParse(formEntries(form));
  if (!parsed.success) return { ok: false, message: "default" };
  const { id, ...data } = parsed.data;
  const db = getDb();
  const role = id
    ? await db.openRole.update({ where: { id }, data })
    : await db.openRole.create({
        data: { ...data, slug: `${slugify(data.title)}-${Date.now().toString(36)}` },
      });
  await audit({
    actorId: user.id,
    action: id ? "opening.update" : "opening.create",
    entityType: "OpenRole",
    entityId: role.id,
    meta: { status: role.status },
  });
  revalidatePath("/admin/roles");
  revalidatePath("/careers");
  revalidatePath("/volunteer");
  return { ok: true, message: "saved" };
}

const reviewSchema = z.object({
  id: idField,
  status: z.enum(REVIEW_STATUSES),
  note: z.string().trim().max(500).default(""),
});

export async function reviewRoleApplication(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { user, limited } = await adminOnly();
  if (limited) return { ok: false, message: "rateLimited" };
  const parsed = reviewSchema.safeParse(formEntries(form));
  if (!parsed.success) return { ok: false };
  const db = getDb();
  const app = await db.roleApplication.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, status: true, userId: true, role: { select: { slug: true } } },
  });
  if (!app || !canMove(app.status, parsed.data.status)) return { ok: false, message: "move" };
  await db.roleApplication.update({
    where: { id: app.id },
    data: {
      status: parsed.data.status,
      reviewNote: parsed.data.note || null,
      reviewedById: user.id,
      reviewedAt: new Date(),
    },
  });
  await audit({
    actorId: user.id,
    action: "opening.review",
    entityType: "RoleApplication",
    entityId: app.id,
    meta: { from: app.status, to: parsed.data.status },
  });
  if (parsed.data.status === "accepted" || parsed.data.status === "declined") {
    await notify(
      app.userId,
      parsed.data.status === "accepted" ? "roleAccepted" : "roleDeclined",
      `/careers/${app.role.slug}`,
    );
  }
  revalidatePath("/admin/roles");
  return { ok: true, message: parsed.data.status };
}
