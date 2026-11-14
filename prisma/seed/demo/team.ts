import type { PrismaClient } from "../../../generated/prisma/client";

/**
 * Team page placeholders. Every name says "Demo profile" and nothing here is a real person or a
 * real quote: the real founder's message and team are entered by an admin in /admin/team. A row an
 * admin has saved loses its demo flag, so a demo reset never deletes real content.
 */
const MEMBERS = [
  { name: "Demo profile: Chapter lead", designation: "Chapter lead (placeholder)", grp: "leads" },
  { name: "Demo profile: Community manager", designation: "Community (placeholder)", grp: "team" },
  { name: "Demo profile: Volunteer", designation: "Volunteer (placeholder)", grp: "volunteers" },
] as const;

export async function seedTeam(db: PrismaClient) {
  if (!(await db.founderMessage.findUnique({ where: { key: "founder" } }))) {
    await db.founderMessage.create({
      data: {
        key: "founder",
        isDemo: true,
        title: "Placeholder founder message",
        founderName: "Demo profile: Founder",
        designation: "Founder (placeholder)",
        body: "Placeholder text. The founder's own message is written in the admin area under Team.\n\nUntil then this block only shows how a message with two paragraphs looks on the page.",
      },
    });
  }
  for (const [index, member] of MEMBERS.entries()) {
    await db.teamMember.create({ data: { ...member, isDemo: true, sortOrder: index } });
  }
}

export async function clearTeamDemo(db: PrismaClient) {
  await db.teamMember.deleteMany({ where: { isDemo: true } });
  await db.founderMessage.deleteMany({ where: { isDemo: true } });
}
