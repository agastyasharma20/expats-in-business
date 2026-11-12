import { scopeKey } from "../../../config/roulette";
import { runRoulette } from "../../../lib/jobs/roulette";
import { createId, faker, type SeedContext } from "./context";
import type { DemoEvents } from "./events";
import type { DemoPeople } from "./people";

/** Demo conversation starters. Every body says "Demo" so nobody mistakes them for real posts. */
const DEMO_POSTS = [
  {
    kind: "question",
    body: "Demo question: which coworking spaces do you like for a quiet morning?",
  },
  {
    kind: "post",
    body: "Demo post: thanks to everyone at last week's session. Great conversations!",
  },
  {
    kind: "question",
    body: "Demo question: any tips for preparing documents for the residence card appointment?",
  },
  {
    kind: "post",
    body: "Demo post: I am starting a weekly language exchange. Reply if you want to join.",
  },
] as const;

const REACTIONS = ["👍", "❤️", "🎉", "🙏", "💡"];

/**
 * Community activity for the demo (M13): extra posts with reactions, one reported post in the
 * moderation queue, Bubble sessions, and a Coffee Roulette round in the live chapter with the
 * Priya and Karim personas opted in. Runs after seedCommunity (groups exist by then).
 */
export async function seedEngagement(ctx: SeedContext, people: DemoPeople, events: DemoEvents) {
  const { db, chapters, today } = ctx;
  const { userIds, byKey, bubbleIds } = people;
  const groups = await db.group.findMany({
    where: { isDemo: true },
    select: { id: true, kind: true },
  });

  for (const [g, group] of groups.entries()) {
    for (const [i, post] of DEMO_POSTS.entries()) {
      const id = createId();
      await db.post.create({
        data: {
          id,
          groupId: group.id,
          authorId: faker.helpers.arrayElement(userIds),
          kind: post.kind,
          body: post.body,
          isDemo: true,
          createdAt: new Date(today.getTime() - (g * 4 + i + 1) * 3_600_000),
        },
      });
      const reactors = faker.helpers.arrayElements(userIds, { min: 0, max: 6 });
      await db.postReaction.createMany({
        data: reactors.map((userId) => ({
          postId: id,
          userId,
          emoji: faker.helpers.arrayElement(REACTIONS),
        })),
        skipDuplicates: true,
      });
    }
  }

  // One reported post in the chapter group, so the moderation queue has something to show.
  const chapterGroup = groups.find((g) => g.kind === "chapter");
  if (chapterGroup) {
    const reported = await db.post.create({
      data: {
        groupId: chapterGroup.id,
        authorId: userIds[40]!,
        kind: "post",
        body: "Demo post (reported): BUY CHEAP FOLLOWERS NOW, message me for prices!!!",
        isDemo: true,
      },
    });
    await db.postReport.create({
      data: {
        postId: reported.id,
        reporterId: userIds[41]!,
        reason: "Demo report: spam advertising.",
      },
    });
  }

  // Two upcoming sessions belong to a Bubble (shown on its page).
  const ukraine = bubbleIds.get("UA");
  if (ukraine && events.upcomingEventIds.length >= 2) {
    await db.event.updateMany({
      where: { id: { in: events.upcomingEventIds.slice(0, 2) } },
      data: { bubbleId: ukraine },
    });
  }

  // Coffee Roulette: personas plus 13 members in the live chapter; this week's round is drawn now.
  const scope = scopeKey({ kind: "chapter", id: chapters.live.id });
  const live = await db.profile.findMany({
    where: { homeChapterId: chapters.live.id, isDemo: true, userId: { notIn: [byKey.admin!] } },
    select: { userId: true },
    take: 15,
  });
  const optIn = new Set([byKey.priya!, byKey.karim!, ...live.map((p) => p.userId)]);
  await db.rouletteOptIn.createMany({
    data: [...optIn].map((userId) => ({ id: createId(), userId, scopeKey: scope })),
    skipDuplicates: true,
  });
  await runRoulette(db, "", { now: today, onlyScope: scope });
}
