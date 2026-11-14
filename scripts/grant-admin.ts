/**
 * npm run admin:grant -- someone@example.com
 * Gives an existing account the global admin role. The person must have signed in once (so the
 * account exists). Idempotent. Used to create the first admin on a fresh production database.
 */
import { createSeedClient } from "../prisma/seed/index";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    console.error("Usage: npm run admin:grant -- someone@example.com");
    process.exit(2);
  }
  const db = createSeedClient();
  try {
    const user = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) {
      console.error(
        `No account for ${email}. Sign in on the site once with that address, then run this again.`,
      );
      process.exit(1);
    }
    const existing = await db.chapterRole.findFirst({
      where: { userId: user.id, role: "admin", chapterId: null },
      select: { id: true },
    });
    if (existing) {
      console.info(`${email} is already an admin.`);
      return;
    }
    await db.chapterRole.create({ data: { userId: user.id, role: "admin", chapterId: null } });
    await db.auditLog.create({
      data: {
        actorId: user.id,
        action: "role.admin.grant.cli",
        entityType: "User",
        entityId: user.id,
      },
    });
    console.info(`${email} is now an admin.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
