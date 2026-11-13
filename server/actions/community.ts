"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireUser, type SessionUser } from "@/lib/auth/session";
import { groupAccess } from "@/lib/community/groups";
import {
  allowedKinds,
  AUTO_HIDE_REPORTS,
  bodyFingerprint,
  cleanPostBody,
  isReaction,
} from "@/lib/community/rules";
import { getDb } from "@/lib/db";
import { notify } from "@/lib/notifications";
import { withinLimits } from "@/lib/security/limits";

import type { ActionState } from "./account";

const id = z.string().trim().min(1).max(40);

/** Loads a post's group and the caller's rights from the database (ids from the form are untrusted). */
async function postContext(postId: string, user: SessionUser) {
  const post = await getDb().post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      authorId: true,
      removedAt: true,
      hiddenAt: true,
      kind: true,
      group: { select: { id: true, slug: true, kind: true, chapterId: true, bubbleId: true } },
    },
  });
  if (!post || post.removedAt) return null;
  const access = await groupAccess(user, post.group);
  return { post, access };
}

const revalidateGroup = (slug: string) => {
  revalidatePath(`/community/${slug}`);
  revalidatePath("/community");
};

const postSchema = z.object({
  groupId: id,
  kind: z.enum(["post", "question", "announcement"]),
  body: z.string().max(4000),
});

export async function createPost(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/community");
  const parsed = postSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "default" };
  const cleaned = cleanPostBody(parsed.data.body);
  if (!cleaned.ok) return { ok: false, message: cleaned.reason === "links" ? "links" : "default" };

  const db = getDb();
  const group = await db.group.findUnique({
    where: { id: parsed.data.groupId },
    select: { id: true, slug: true, kind: true, chapterId: true, bubbleId: true },
  });
  if (!group) return { ok: false, message: "forbidden" };
  const access = await groupAccess(user, group);
  if (!access.canPost || !allowedKinds(access.canModerate).includes(parsed.data.kind)) {
    return { ok: false, message: "forbidden" };
  }
  if (!(await withinLimits(user.id, "post"))) return { ok: false, message: "rateLimited" };

  // Copy-paste spam: the same text from the same person anywhere in the last 24 hours.
  const recent = await db.post.findMany({
    where: { authorId: user.id, createdAt: { gte: new Date(Date.now() - 86_400_000) } },
    select: { body: true },
    take: 50,
  });
  const fingerprint = bodyFingerprint(cleaned.body);
  if (recent.some((p) => bodyFingerprint(p.body) === fingerprint)) {
    return { ok: false, message: "duplicate" };
  }

  await db.post.create({
    data: {
      groupId: group.id,
      authorId: user.id,
      kind: parsed.data.kind,
      body: cleaned.body,
      pinned: parsed.data.kind === "announcement",
    },
  });
  revalidateGroup(group.slug);
  return { ok: true };
}

export async function toggleReaction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/community");
  const postId = id.safeParse(form.get("postId"));
  const emoji = form.get("emoji");
  if (!postId.success || !isReaction(emoji)) return { ok: false };
  const ctx = await postContext(postId.data, user);
  if (!ctx || ctx.post.hiddenAt) return { ok: false };
  if (!(await withinLimits(user.id, "reaction"))) return { ok: false, message: "rateLimited" };
  const key = { postId_userId_emoji: { postId: ctx.post.id, userId: user.id, emoji } };
  const db = getDb();
  const existing = await db.postReaction.findUnique({ where: key });
  if (existing) await db.postReaction.delete({ where: key });
  else {
    await db.postReaction.createMany({
      data: [{ postId: ctx.post.id, userId: user.id, emoji }],
      skipDuplicates: true,
    });
  }
  revalidateGroup(ctx.post.group.slug);
  return { ok: true };
}

const reportSchema = z.object({ postId: id, reason: z.string().trim().min(5).max(500) });

/** One report per person per post; enough distinct reports hide the post until review. */
export async function reportPost(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/community");
  const parsed = reportSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "reportDefault" };
  const ctx = await postContext(parsed.data.postId, user);
  if (!ctx || ctx.post.authorId === user.id) return { ok: false, message: "forbidden" };
  if (!(await withinLimits(user.id, "report"))) return { ok: false, message: "rateLimited" };
  const db = getDb();
  await db.postReport.upsert({
    where: { postId_reporterId: { postId: ctx.post.id, reporterId: user.id } },
    update: {},
    create: { postId: ctx.post.id, reporterId: user.id, reason: parsed.data.reason },
  });
  const open = await db.postReport.count({ where: { postId: ctx.post.id, status: "open" } });
  if (open >= AUTO_HIDE_REPORTS && !ctx.post.hiddenAt) {
    await db.post.update({ where: { id: ctx.post.id }, data: { hiddenAt: new Date() } });
  }
  revalidateGroup(ctx.post.group.slug);
  revalidatePath("/moderation");
  return { ok: true };
}

/** Pin or unpin (moderators). */
export async function togglePin(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/community");
  const postId = id.safeParse(form.get("postId"));
  if (!postId.success) return { ok: false };
  const ctx = await postContext(postId.data, user);
  if (!ctx?.access.canModerate) return { ok: false, message: "forbidden" };
  if (!(await withinLimits(user.id, "moderate"))) return { ok: false, message: "rateLimited" };
  const post = await getDb().post.findUniqueOrThrow({
    where: { id: ctx.post.id },
    select: { pinned: true },
  });
  await getDb().post.update({ where: { id: ctx.post.id }, data: { pinned: !post.pinned } });
  await audit({
    actorId: user.id,
    action: post.pinned ? "post.unpin" : "post.pin",
    entityType: "Post",
    entityId: ctx.post.id,
    chapterId: ctx.post.group.chapterId,
  });
  revalidateGroup(ctx.post.group.slug);
  return { ok: true, message: post.pinned ? "unpinned" : "pinned" };
}

/** Authors may delete their own post; it is kept as removed for the audit trail. */
export async function deleteOwnPost(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/community");
  const postId = id.safeParse(form.get("postId"));
  if (!postId.success) return { ok: false };
  const ctx = await postContext(postId.data, user);
  if (!ctx || ctx.post.authorId !== user.id) return { ok: false, message: "forbidden" };
  await getDb().post.update({ where: { id: ctx.post.id }, data: { removedAt: new Date() } });
  revalidateGroup(ctx.post.group.slug);
  return { ok: true };
}

const decisionSchema = z.object({ postId: id, decision: z.enum(["keep", "remove"]) });

/** Moderation queue decision: keep (restore, dismiss reports) or remove (resolve, tell the author). */
export async function moderatePost(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/moderation");
  const parsed = decisionSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false };
  const ctx = await postContext(parsed.data.postId, user);
  if (!ctx?.access.canModerate) return { ok: false, message: "forbidden" };
  if (!(await withinLimits(user.id, "moderate"))) return { ok: false, message: "rateLimited" };
  const remove = parsed.data.decision === "remove";
  const db = getDb();
  const now = new Date();
  await db.$transaction([
    db.post.update({
      where: { id: ctx.post.id },
      data: remove ? { removedAt: now, pinned: false } : { hiddenAt: null },
    }),
    db.postReport.updateMany({
      where: { postId: ctx.post.id, status: "open" },
      data: { status: remove ? "resolved" : "dismissed", resolvedAt: now, resolvedById: user.id },
    }),
  ]);
  await audit({
    actorId: user.id,
    action: remove ? "post.remove" : "post.keep",
    entityType: "Post",
    entityId: ctx.post.id,
    chapterId: ctx.post.group.chapterId,
  });
  if (remove) await notify(ctx.post.authorId, "postRemoved", `/community/${ctx.post.group.slug}`);
  revalidateGroup(ctx.post.group.slug);
  revalidatePath("/moderation");
  return { ok: true, message: remove ? "removed" : "kept" };
}
