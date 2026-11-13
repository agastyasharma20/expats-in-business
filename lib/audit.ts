import "server-only";

import { getDb } from "@/lib/db";

/** Admin and chapter-lead writes leave a trace (CLAUDE.md Server Action pipeline). No personal data in `meta`. */
export async function audit(input: {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  chapterId?: string | null;
  /** Non-personal details only (a flag name, a role, a count). */
  meta?: Record<string, string | number | boolean>;
}) {
  await getDb().auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      chapterId: input.chapterId ?? null,
      ...(input.meta ? { meta: input.meta } : {}),
    },
  });
}
