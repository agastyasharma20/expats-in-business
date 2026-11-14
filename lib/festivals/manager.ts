import "server-only";

import { revalidatePath, revalidateTag, updateTag } from "next/cache";
import { forbidden } from "next/navigation";

import { audit } from "@/lib/audit";
import { can } from "@/lib/auth/permissions";
import { requireUser, type SessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { withinLimits } from "@/lib/security/limits";

import type { z } from "zod";

import type { ActionState } from "@/server/actions/account";

import { formEntries, idField } from "./form";

// Not a "use server" module on purpose: these helpers must never be callable from a browser.

/**
 * Loads a festival the caller may manage (chapter lead of its chapter, or admin) and applies the
 * admin rate limit. The id comes from the form, so access is always decided here, server-side.
 */
export async function festivalForManager(eventId: unknown) {
  const user = await requireUser("/admin/festivals");
  const parsed = idField.safeParse(eventId);
  if (!parsed.success) forbidden();
  const event = await getDb().event.findUnique({
    where: { id: parsed.data },
    select: {
      id: true,
      slug: true,
      kind: true,
      status: true,
      chapterId: true,
      chapter: { select: { timezone: true, currency: true } },
    },
  });
  if (
    !event ||
    event.kind !== "festival" ||
    !can(user, "event.manage", { chapterId: event.chapterId })
  )
    forbidden();
  const limited = !(await withinLimits(user.id, "admin"));
  return { user, event, limited };
}

export async function afterFestivalChange(
  user: SessionUser,
  event: { id: string; slug: string; chapterId: string },
  action: string,
  meta?: Record<string, string | number | boolean>,
) {
  await audit({
    actorId: user.id,
    action,
    entityType: "Event",
    entityId: event.id,
    chapterId: event.chapterId,
    meta,
  });
  revalidateTag("events", "max");
  // The organiser sees their change on the public page immediately (read-your-writes).
  updateTag(`festival:${event.slug}`);
  revalidatePath(`/admin/festivals/${event.id}`);
  revalidatePath(`/festivals/${event.slug}`);
  revalidatePath("/festivals");
}

export type Manager = Awaited<ReturnType<typeof festivalForManager>>;

/** Shared pipeline: manager check + limit → parse → write → audit + revalidate. */
export async function editFestival<T extends z.ZodTypeAny>(
  form: FormData,
  schema: T,
  write: (m: Manager, input: z.infer<T>) => Promise<ActionState | void>,
  action: string,
): Promise<ActionState> {
  const manager = await festivalForManager(form.get("eventId"));
  if (manager.limited) return { ok: false, message: "rateLimited" };
  const parsed = schema.safeParse(formEntries(form));
  if (!parsed.success) return { ok: false, message: "default" };
  const result = await write(manager, parsed.data);
  if (result && !result.ok) return result;
  await afterFestivalChange(manager.user, manager.event, action);
  return result ?? { ok: true, message: "saved" };
}
