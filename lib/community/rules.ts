/**
 * Community rules (pure, no I/O, unit-tested): who may post, pin and moderate in a group, which
 * posts a viewer sees, and how post text is cleaned. Server actions call these after loading the
 * rows, so nothing a browser sends (hidden fields, edited requests) can widen a permission.
 */
import { hasRole, isAdmin, type AuthUser } from "@/lib/auth/permissions";

/** Reactions are a fixed allow-list: the server rejects anything else. */
export const REACTIONS = ["👍", "❤️", "🎉", "🙏", "💡"] as const;
export type Reaction = (typeof REACTIONS)[number];

export const POST_MIN = 3;
export const POST_MAX = 2000;
export const MAX_LINKS = 3;
/** Distinct reports after which a post is hidden for everyone until a moderator decides. */
export const AUTO_HIDE_REPORTS = 3;

export type GroupScope = {
  kind: "chapter" | "bubble";
  chapterId: string | null;
  bubbleId: string | null;
};

/** What the server knows about the viewer's place in a group. */
export type Membership = {
  /** Member of the group's Bubble (bubble groups). */
  inBubble: boolean;
  /** Lead of the group's Bubble. */
  isBubbleLead: boolean;
  /** Home chapter is the group's chapter (chapter groups). */
  inChapter: boolean;
};

export function canModerateGroup(
  user: AuthUser | null,
  group: GroupScope,
  membership: Membership,
): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (group.kind === "bubble" && membership.isBubbleLead) return true;
  if (group.kind === "chapter" && group.chapterId) {
    return (
      hasRole(user, "chapter_lead", group.chapterId) || hasRole(user, "moderator", group.chapterId)
    );
  }
  return false;
}

/** Bubble groups: Bubble members. Chapter groups: anyone whose home chapter it is. Moderators always. */
export function canPostInGroup(
  user: AuthUser | null,
  group: GroupScope,
  membership: Membership,
): boolean {
  if (!user) return false;
  if (canModerateGroup(user, group, membership)) return true;
  return group.kind === "bubble" ? membership.inBubble : membership.inChapter;
}

/** Announcements and pins are moderator tools; members write posts and questions. */
export function allowedKinds(canModerate: boolean): ("post" | "question" | "announcement")[] {
  return canModerate ? ["post", "question", "announcement"] : ["post", "question"];
}

export type PostVisibility = "visible" | "underReview" | "hidden";

/**
 * Removed posts are never shown. Hidden posts (reported) stay visible to their author and to
 * moderators with an "under review" note; posts the viewer reported are hidden for that viewer.
 */
export function postVisibility(
  post: { authorId: string; hiddenAt: Date | null; removedAt: Date | null },
  viewer: { id: string | null; canModerate: boolean; reportedByViewer: boolean },
): PostVisibility {
  if (post.removedAt) return "hidden";
  if (post.hiddenAt) {
    return viewer.canModerate || post.authorId === viewer.id ? "underReview" : "hidden";
  }
  if (viewer.reportedByViewer && !viewer.canModerate) return "hidden";
  return "visible";
}

// Control characters (except tab and newline), zero-width and bidi override characters: they
// are invisible, can disguise links and reverse text (spoofing), so they are removed.
const INVISIBLE = /[\u0000-\u0008\u000B-\u001F\u007F​-‏‪-‮⁦-⁩﻿]/g;
const LINK = /\bhttps?:\/\/|\bwww\./gi;

export type CleanResult = { ok: true; body: string } | { ok: false; reason: "length" | "links" };

/** Normalise post text: NFC, invisible characters removed, trimmed, at most one blank line. */
export function cleanPostBody(raw: string): CleanResult {
  const body = raw
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(INVISIBLE, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (body.length < POST_MIN || body.length > POST_MAX) return { ok: false, reason: "length" };
  if ((body.match(LINK) ?? []).length > MAX_LINKS) return { ok: false, reason: "links" };
  return { ok: true, body };
}

/** Case- and whitespace-insensitive fingerprint used to reject copy-paste spam within a day. */
export function bodyFingerprint(body: string): string {
  return body.toLowerCase().replace(/\s+/g, " ").trim();
}

export function isReaction(value: unknown): value is Reaction {
  return typeof value === "string" && (REACTIONS as readonly string[]).includes(value);
}

/** Below this many visible members a Bubble's count is not published (GDPR small-group rule). */
export const MIN_PUBLIC_COUNT = 5;

export function publicCount(count: number): number | null {
  return count >= MIN_PUBLIC_COUNT ? count : null;
}

/** Five shading steps by member count (only counts that may be published are shaded). */
export function shadeStep(count: number | null, max: number): 0 | 1 | 2 | 3 | 4 {
  if (!count || max <= 0) return 0;
  const ratio = count / max;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}
