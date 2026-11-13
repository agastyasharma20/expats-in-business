import "server-only";

import type { AuthUser } from "@/lib/auth/permissions";
import { getDb } from "@/lib/db";

import {
  canModerateGroup,
  canPostInGroup,
  postVisibility,
  REACTIONS,
  type GroupScope,
  type Membership,
} from "./rules";

export const FEED_PAGE = 20;

/** Server-side view of a viewer in a group. Always derived from the database, never from the request. */
export async function groupAccess(user: AuthUser | null, group: GroupScope) {
  const db = getDb();
  let membership: Membership = { inBubble: false, isBubbleLead: false, inChapter: false };
  if (user) {
    const [bubbleRow, profile] = await Promise.all([
      group.bubbleId
        ? db.bubbleMember.findUnique({
            where: { bubbleId_userId: { bubbleId: group.bubbleId, userId: user.id } },
            select: { isLead: true },
          })
        : null,
      group.chapterId
        ? db.profile.findUnique({ where: { userId: user.id }, select: { homeChapterId: true } })
        : null,
    ]);
    membership = {
      inBubble: Boolean(bubbleRow),
      isBubbleLead: Boolean(bubbleRow?.isLead),
      inChapter: Boolean(group.chapterId && profile?.homeChapterId === group.chapterId),
    };
  }
  const canModerate = canModerateGroup(user, group, membership);
  return { membership, canModerate, canPost: canPostInGroup(user, group, membership) };
}

/** Groups for the community index: the viewer's own first, then every other group to discover. */
export async function listGroups(userId: string) {
  const db = getDb();
  const [profile, bubbles, groups] = await Promise.all([
    db.profile.findUnique({ where: { userId }, select: { homeChapterId: true } }),
    db.bubbleMember.findMany({ where: { userId }, select: { bubbleId: true } }),
    db.group.findMany({
      orderBy: [{ kind: "asc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        kind: true,
        chapterId: true,
        bubbleId: true,
        isDemo: true,
        chapter: { select: { name: true } },
        bubble: { select: { name: true, originCountryCode: true } },
        _count: { select: { posts: { where: { removedAt: null, hiddenAt: null } } } },
        posts: {
          where: { removedAt: null, hiddenAt: null },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    }),
  ]);
  const myBubbles = new Set(bubbles.map((b) => b.bubbleId));
  const isMine = (g: (typeof groups)[number]) =>
    g.kind === "chapter"
      ? g.chapterId === profile?.homeChapterId
      : Boolean(g.bubbleId && myBubbles.has(g.bubbleId));
  const rows = groups.map((g) => ({
    ...g,
    postCount: g._count.posts,
    lastActivity: g.posts[0]?.createdAt ?? null,
    mine: isMine(g),
  }));
  return { mine: rows.filter((g) => g.mine), discover: rows.filter((g) => !g.mine) };
}

export type FeedPost = NonNullable<Awaited<ReturnType<typeof getGroupFeed>>>["posts"][number];

/** One group page: header, access, and the newest posts the viewer may see (pinned first). */
export async function getGroupFeed(slug: string, user: AuthUser | null, before?: Date) {
  const db = getDb();
  const group = await db.group.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      kind: true,
      chapterId: true,
      bubbleId: true,
      isDemo: true,
      chapter: { select: { name: true, timezone: true } },
      bubble: { select: { name: true, slug: true, originCountryCode: true } },
    },
  });
  if (!group) return null;
  const access = await groupAccess(user, group);
  const rows = await db.post.findMany({
    where: {
      groupId: group.id,
      removedAt: null,
      ...(before ? { createdAt: { lt: before }, pinned: false } : {}),
    },
    orderBy: before ? [{ createdAt: "desc" }] : [{ pinned: "desc" }, { createdAt: "desc" }],
    take: FEED_PAGE + 1,
    select: {
      id: true,
      kind: true,
      body: true,
      pinned: true,
      hiddenAt: true,
      removedAt: true,
      isDemo: true,
      createdAt: true,
      authorId: true,
      author: { select: { name: true, profile: { select: { slug: true, isPublic: true } } } },
      reactions: { select: { emoji: true, userId: true } },
      reports: {
        where: { status: "open" },
        select: { reporterId: true },
      },
    },
  });
  const hasMore = rows.length > FEED_PAGE;
  const posts = rows.slice(0, FEED_PAGE).flatMap((post) => {
    const visibility = postVisibility(post, {
      id: user?.id ?? null,
      canModerate: access.canModerate,
      reportedByViewer: Boolean(user && post.reports.some((r) => r.reporterId === user.id)),
    });
    if (visibility === "hidden") return [];
    const reactions = REACTIONS.map((emoji) => {
      const list = post.reactions.filter((r) => r.emoji === emoji);
      return {
        emoji,
        count: list.length,
        mine: Boolean(user && list.some((r) => r.userId === user.id)),
      };
    });
    return [
      {
        id: post.id,
        kind: post.kind,
        body: post.body,
        pinned: post.pinned,
        isDemo: post.isDemo,
        createdAt: post.createdAt,
        underReview: visibility === "underReview",
        isMine: post.authorId === user?.id,
        author: {
          name: post.author.name,
          slug: post.author.profile?.isPublic ? post.author.profile.slug : null,
        },
        reactions,
        // Moderators see how many open reports a post has; nobody sees who reported.
        openReports: access.canModerate ? post.reports.length : 0,
      },
    ];
  });
  return { group, access, posts, hasMore };
}

/** Reported posts in every group this user moderates (Bubble Leads see their Bubble only). */
export async function moderationQueue(user: AuthUser) {
  const db = getDb();
  const posts = await db.post.findMany({
    where: { removedAt: null, reports: { some: { status: "open" } } },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: {
      id: true,
      kind: true,
      body: true,
      hiddenAt: true,
      createdAt: true,
      author: { select: { name: true } },
      group: {
        select: { id: true, slug: true, name: true, kind: true, chapterId: true, bubbleId: true },
      },
      reports: {
        where: { status: "open" },
        orderBy: { createdAt: "asc" },
        select: { id: true, reason: true, createdAt: true },
      },
    },
  });
  const leadOf = new Set(
    (
      await db.bubbleMember.findMany({
        where: { userId: user.id, isLead: true },
        select: { bubbleId: true },
      })
    ).map((b) => b.bubbleId),
  );
  return posts.filter((post) =>
    canModerateGroup(user, post.group, {
      inBubble: Boolean(post.group.bubbleId && leadOf.has(post.group.bubbleId)),
      isBubbleLead: Boolean(post.group.bubbleId && leadOf.has(post.group.bubbleId)),
      inChapter: false,
    }),
  );
}

/** Whether a user moderates anything (shows the moderation link). */
export async function moderatesAnything(user: AuthUser): Promise<boolean> {
  if (user.roles.some((r) => ["admin", "chapter_lead", "moderator"].includes(r.role))) return true;
  const lead = await getDb().bubbleMember.count({ where: { userId: user.id, isLead: true } });
  return lead > 0;
}
