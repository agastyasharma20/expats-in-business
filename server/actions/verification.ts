"use server";

import { revalidatePath } from "next/cache";
import { forbidden } from "next/navigation";
import { z } from "zod";
import { canApprove } from "@/config/verification";
import { audit } from "@/lib/audit";
import { isAdmin } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { formId } from "@/lib/festivals/form";

import { notify } from "@/lib/notifications";
import { withinLimits } from "@/lib/security/limits";

import type { ActionState } from "./account";

/** Provider owner asks for verification (none or rejected → pending). */
export async function requestVerification(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser("/provider/inbox");
  if (!(await withinLimits(user.id, "verify"))) return { ok: false, message: "rateLimited" };
  const { count } = await getDb().provider.updateMany({
    where: {
      id: formId(form, "providerId"),
      ownerId: user.id,
      verificationStatus: { in: ["none", "rejected"] },
    },
    data: { verificationStatus: "pending" },
  });
  if (!count) return { ok: false, message: "invalid" };
  revalidatePath("/provider/inbox");
  return { ok: true };
}

const decisionSchema = z.object({
  providerId: z.string().min(1),
  decision: z.enum(["approve", "reject"]),
  registryChecked: z.preprocess((v) => v === "on", z.boolean()),
  referencesChecked: z.preprocess((v) => v === "on", z.boolean()),
  insuranceChecked: z.preprocess((v) => v === "on", z.boolean()),
  notes: z.string().trim().max(1000).optional(),
});

/** Admin verification decision: the badge exists only after an approval with every check ticked. */
export async function decideVerification(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/admin/providers");
  if (!isAdmin(user)) forbidden();
  const parsed = decisionSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "invalid" };
  const { providerId, decision, notes, ...checks } = parsed.data;
  if (decision === "approve" && !canApprove(checks)) return { ok: false, message: "incomplete" };
  const db = getDb();
  const provider = await db.provider.findUnique({
    where: { id: providerId },
    select: { slug: true, ownerId: true, chapterId: true },
  });
  if (!provider) return { ok: false, message: "invalid" };
  await db.$transaction([
    db.providerVerification.create({
      data: {
        providerId,
        ...checks,
        notes: notes || null,
        verifiedById: user.id,
        decidedAt: new Date(),
      },
    }),
    db.provider.update({
      where: { id: providerId },
      data: { verificationStatus: decision === "approve" ? "verified" : "rejected" },
    }),
  ]);
  await audit({
    actorId: user.id,
    action: `provider.verification.${decision}`,
    entityType: "Provider",
    entityId: providerId,
    chapterId: provider.chapterId,
  });
  if (provider.ownerId) {
    await notify(
      provider.ownerId,
      decision === "approve" ? "verificationApproved" : "verificationRejected",
      `/providers/${provider.slug}`,
    );
  }
  revalidatePath("/admin/providers");
  revalidatePath(`/providers/${provider.slug}`);
  revalidatePath("/providers");
  return { ok: true, message: decision };
}
