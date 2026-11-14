"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireAdminAction } from "@/lib/admin/guard";
import { getDb } from "@/lib/db";
import { formEntries, idField } from "@/lib/festivals/form";
import { processPhoto, TeamPhotoError } from "@/lib/team/photo";
import { founderSchema, memberSchema } from "@/lib/team/schemas";

import type { ActionState } from "./account";

/** The Team page is public: admins only, rate-limited, every change audited, cache tag refreshed. */
function refresh() {
  updateTag("team");
  revalidatePath("/team");
  revalidatePath("/admin/team");
}

async function photoFrom(form: FormData) {
  try {
    return { photo: await processPhoto(form.get("photo")), error: null };
  } catch (error) {
    if (error instanceof TeamPhotoError) return { photo: null, error: error.message };
    throw error;
  }
}

/** Saves the founder's message (a single row); a new photo replaces the old one. */
export async function saveFounder(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, limited } = await requireAdminAction();
  if (limited) return { ok: false, message: "rateLimited" };
  const parsed = founderSchema.safeParse(formEntries(form));
  if (!parsed.success) return { ok: false, message: "default" };
  const { photo, error } = await photoFrom(form);
  if (error) return { ok: false, message: error };
  const removePhoto = form.has("removePhoto");
  const photoData = photo
    ? { photo: new Uint8Array(photo.bytes), photoType: photo.type }
    : removePhoto
      ? { photo: null, photoType: null }
      : {};
  const data = { ...parsed.data, ...photoData, isDemo: false, updatedById: user.id };
  await getDb().founderMessage.upsert({
    where: { key: "founder" },
    create: { key: "founder", ...data },
    update: data,
  });
  await audit({
    actorId: user.id,
    action: "team.founder.save",
    entityType: "FounderMessage",
    entityId: "founder",
  });
  refresh();
  return { ok: true, message: "saved" };
}

/** Creates or edits a team member (a new photo replaces the old one). */
export async function saveMember(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, limited } = await requireAdminAction();
  if (limited) return { ok: false, message: "rateLimited" };
  const parsed = memberSchema.safeParse({
    ...formEntries(form),
    showEmail: form.has("showEmail"),
    isVisible: form.has("isVisible"),
  });
  if (!parsed.success) return { ok: false, message: "default" };
  const { photo, error } = await photoFrom(form);
  if (error) return { ok: false, message: error };
  const { id, ...data } = parsed.data;
  const db = getDb();
  const photoData = photo
    ? { photo: new Uint8Array(photo.bytes), photoType: photo.type, photoVersion: { increment: 1 } }
    : form.has("removePhoto")
      ? { photo: null, photoType: null, photoVersion: { increment: 1 } }
      : {};
  if (id && !(await db.teamMember.findUnique({ where: { id }, select: { id: true } }))) {
    return { ok: false, message: "default" };
  }
  const row = id
    ? await db.teamMember.update({ where: { id }, data: { ...data, ...photoData, isDemo: false } })
    : await db.teamMember.create({
        data: {
          ...data,
          photo: photo ? new Uint8Array(photo.bytes) : null,
          photoType: photo?.type ?? null,
        },
      });
  await audit({
    actorId: user.id,
    action: id ? "team.member.update" : "team.member.create",
    entityType: "TeamMember",
    entityId: row.id,
  });
  refresh();
  return { ok: true, message: "saved" };
}

const deleteSchema = z.object({ id: idField });

export async function deleteMember(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, limited } = await requireAdminAction();
  if (limited) return { ok: false, message: "rateLimited" };
  const parsed = deleteSchema.safeParse(formEntries(form));
  if (!parsed.success) return { ok: false, message: "default" };
  const { count } = await getDb().teamMember.deleteMany({ where: { id: parsed.data.id } });
  if (!count) return { ok: false, message: "default" };
  await audit({
    actorId: user.id,
    action: "team.member.delete",
    entityType: "TeamMember",
    entityId: parsed.data.id,
  });
  refresh();
  return { ok: true, message: "deleted" };
}
