import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { isAdmin, type AuthUser } from "@/lib/auth/permissions";

/** Chapters a user may manage: everything for admins, their own chapters for chapter leads. */
export function managedChapterWhere(user: AuthUser): Prisma.ChapterWhereInput {
  if (isAdmin(user)) return {};
  const ids = user.roles
    .filter((r) => r.role === "chapter_lead" && r.chapterId)
    .map((r) => r.chapterId as string);
  return { id: { in: ids } };
}
