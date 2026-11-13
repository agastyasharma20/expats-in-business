"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { withinLimits } from "@/lib/security/limits";
import { getDb } from "@/lib/db";

import type { ActionState } from "./account";

const schema = z.object({ id: z.string().min(1).max(64), done: z.enum(["true", "false"]) });

/** Done toggle on a roadmap step. Only the member's own tasks; reminders stop once done. */
export async function setTaskDone(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/roadmap");
  if (!(await withinLimits(user.id, "account"))) return { ok: false, message: "rateLimited" };
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "invalid" };
  const done = parsed.data.done === "true";
  const { count } = await getDb().userTask.updateMany({
    where: { id: parsed.data.id, userId: user.id },
    data: { doneAt: done ? new Date() : null },
  });
  if (!count) return { ok: false, message: "invalid" };
  revalidatePath("/roadmap");
  revalidatePath("/dashboard");
  return { ok: true, message: done ? "done" : "open" };
}
