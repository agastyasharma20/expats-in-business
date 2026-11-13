"use server";

import { revalidatePath, updateTag } from "next/cache";
import { forbidden } from "next/navigation";
import { z } from "zod";

import { FLAG_NAMES } from "@/config/features";
import { parseScopeKey } from "@/config/roulette";
import { canChangeRole, canSuspend, GRANTABLE_ROLES } from "@/lib/admin/rules";
import { audit } from "@/lib/audit";
import { isAdmin } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { cleanPostBody } from "@/lib/community/rules";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { FLAG_SETTING_KEY, FLAGS_TAG } from "@/lib/features";
import { runRoulette } from "@/lib/jobs/roulette";
import { withinLimits } from "@/lib/security/limits";

import type { ActionState } from "./account";

const id = z.string().trim().min(1).max(40);

/** Every admin action: signed in, admin role (checked server-side), per-account rate limit. */
async function requireAdminAction(bucket: "admin" | "broadcast" = "admin") {
  const user = await requirePermission("admin.access");
  if (!isAdmin(user)) forbidden();
  if (!(await withinLimits(user.id, bucket))) return { user, limited: true as const };
  return { user, limited: false as const };
}

async function loadTarget(userId: string) {
  return getDb().user.findUnique({
    where: { id: userId },
    select: { id: true, suspendedAt: true, roles: { select: { role: true } } },
  });
}

const suspendSchema = z.object({ userId: id, reason: z.string().trim().max(300).default("") });

/** Suspend: blocks sign-in, ends every session now, hides the member from matching and Bubbles. */
export async function suspendMember(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, limited } = await requireAdminAction();
  if (limited) return { ok: false, message: "rateLimited" };
  const parsed = suspendSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false };
  const target = await loadTarget(parsed.data.userId);
  if (!target || !canSuspend(user, target)) return { ok: false, message: "forbidden" };
  const db = getDb();
  await db.$transaction([
    db.user.update({
      where: { id: target.id },
      data: { suspendedAt: new Date(), suspendedReason: parsed.data.reason || null },
    }),
    db.session.deleteMany({ where: { userId: target.id } }),
    db.rouletteOptIn.deleteMany({ where: { userId: target.id } }),
  ]);
  await audit({
    actorId: user.id,
    action: "member.suspend",
    entityType: "User",
    entityId: target.id,
  });
  revalidatePath("/admin/members");
  return { ok: true, message: "suspended" };
}

export async function reinstateMember(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, limited } = await requireAdminAction();
  if (limited) return { ok: false, message: "rateLimited" };
  const userId = id.safeParse(form.get("userId"));
  if (!userId.success) return { ok: false };
  const target = await loadTarget(userId.data);
  if (!target || !canSuspend(user, target)) return { ok: false, message: "forbidden" };
  await getDb().user.update({
    where: { id: target.id },
    data: { suspendedAt: null, suspendedReason: null },
  });
  await audit({
    actorId: user.id,
    action: "member.reinstate",
    entityType: "User",
    entityId: target.id,
  });
  revalidatePath("/admin/members");
  return { ok: true, message: "reinstated" };
}

const roleSchema = z.object({
  userId: id,
  role: z.enum(GRANTABLE_ROLES),
  chapterId: id,
  grant: z.enum(["true", "false"]),
});

/** Grant or revoke a chapter role (bubble lead, moderator, chapter lead). */
export async function changeRole(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, limited } = await requireAdminAction();
  if (limited) return { ok: false, message: "rateLimited" };
  const parsed = roleSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false };
  const { userId, role, chapterId, grant } = parsed.data;
  const [target, chapter] = await Promise.all([
    loadTarget(userId),
    getDb().chapter.findUnique({ where: { id: chapterId }, select: { id: true } }),
  ]);
  if (!target || !chapter || !canChangeRole(user, target, role)) {
    return { ok: false, message: "forbidden" };
  }
  const db = getDb();
  if (grant === "true") {
    await db.chapterRole.upsert({
      where: { userId_chapterId_role: { userId, chapterId, role } },
      update: {},
      create: { userId, chapterId, role },
    });
  } else {
    await db.chapterRole.deleteMany({ where: { userId, chapterId, role } });
  }
  await audit({
    actorId: user.id,
    action: grant === "true" ? "role.grant" : "role.revoke",
    entityType: "User",
    entityId: userId,
    chapterId,
    meta: { role },
  });
  revalidatePath("/admin/members");
  return { ok: true, message: grant === "true" ? "granted" : "revoked" };
}

const flagSchema = z.object({ flag: z.enum(FLAG_NAMES), enabled: z.enum(["true", "false"]) });

/** Feature flag override without a deploy (stored in SiteSetting, audited). */
export async function setFeatureFlag(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, limited } = await requireAdminAction();
  if (limited) return { ok: false, message: "rateLimited" };
  const parsed = flagSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false };
  const db = getDb();
  const row = await db.siteSetting.findUnique({ where: { key: FLAG_SETTING_KEY } });
  const current =
    row?.value && typeof row.value === "object" && !Array.isArray(row.value) ? row.value : {};
  const value = { ...current, [parsed.data.flag]: parsed.data.enabled === "true" };
  await db.siteSetting.upsert({
    where: { key: FLAG_SETTING_KEY },
    update: { value, updatedById: user.id },
    create: { key: FLAG_SETTING_KEY, value, updatedById: user.id },
  });
  await audit({
    actorId: user.id,
    action: "setting.flag",
    entityType: "SiteSetting",
    entityId: FLAG_SETTING_KEY,
    meta: { flag: parsed.data.flag, enabled: parsed.data.enabled === "true" },
  });
  updateTag(FLAGS_TAG);
  revalidatePath("/", "layout");
  return { ok: true, message: "saved" };
}

const bannerSchema = z.object({
  text: z.string().trim().max(200).default(""),
  tone: z.enum(["info", "warning"]).default("info"),
  enabled: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
});

/** Site-wide banner (maintenance notice, event announcement). Plain text only. */
export async function setBanner(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, limited } = await requireAdminAction();
  if (limited) return { ok: false, message: "rateLimited" };
  const parsed = bannerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success || (parsed.data.enabled && parsed.data.text.length < 3)) {
    return { ok: false, message: "banner" };
  }
  const cleaned = parsed.data.text ? cleanPostBody(parsed.data.text) : null;
  if (parsed.data.enabled && !cleaned?.ok) return { ok: false, message: "banner" };
  const value = {
    enabled: parsed.data.enabled,
    text: cleaned?.ok ? cleaned.body.replace(/\s+/g, " ") : "",
    tone: parsed.data.tone,
  };
  await getDb().siteSetting.upsert({
    where: { key: "banner" },
    update: { value, updatedById: user.id },
    create: { key: "banner", value, updatedById: user.id },
  });
  await audit({
    actorId: user.id,
    action: "setting.banner",
    entityType: "SiteSetting",
    entityId: "banner",
    meta: { enabled: value.enabled },
  });
  updateTag("banner");
  return { ok: true, message: "saved" };
}

const broadcastSchema = z.object({
  chapterId: z.union([id, z.literal("all")]),
  text: z.string().trim().min(10).max(280),
});

/** In-app announcement to every active member of a chapter (or everyone). Max 5 a day. */
export async function broadcast(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, limited } = await requireAdminAction("broadcast");
  if (limited) return { ok: false, message: "rateLimited" };
  const parsed = broadcastSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "broadcast" };
  const cleaned = cleanPostBody(parsed.data.text);
  if (!cleaned.ok) return { ok: false, message: "broadcast" };
  const db = getDb();
  const recipients = await db.user.findMany({
    where: {
      suspendedAt: null,
      deletionRequestedAt: null,
      ...(parsed.data.chapterId === "all"
        ? {}
        : { profile: { homeChapterId: parsed.data.chapterId } }),
    },
    select: { id: true },
  });
  await db.notification.createMany({
    data: recipients.map((r) => ({
      userId: r.id,
      type: "announcement",
      href: "/notifications",
      data: { text: cleaned.body.replace(/\s+/g, " ") },
    })),
  });
  await audit({
    actorId: user.id,
    action: "broadcast.send",
    entityType: "Chapter",
    entityId: parsed.data.chapterId,
    chapterId: parsed.data.chapterId === "all" ? null : parsed.data.chapterId,
    meta: { recipients: recipients.length },
  });
  return { ok: true, message: String(recipients.length) };
}

/** Draw this week's Coffee Roulette for one scope now (idempotent: once per week per scope). */
export async function runRouletteNow(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, limited } = await requireAdminAction();
  if (limited) return { ok: false, message: "rateLimited" };
  const scope = String(form.get("scope") ?? "");
  if (!parseScopeKey(scope)) return { ok: false };
  const result = await runRoulette(getDb(), getEnv().BETTER_AUTH_URL, { onlyScope: scope });
  await audit({
    actorId: user.id,
    action: "roulette.run",
    entityType: "RouletteRound",
    entityId: scope,
    meta: result,
  });
  revalidatePath("/admin/roulette");
  return { ok: true, message: result.rounds ? "ran" : "already" };
}
