import { getTranslations } from "next-intl/server";

import { Toggle } from "@/components/common/action-form";
import { controlStyles } from "@/components/ui/control-styles";
import { TEAM_GROUPS } from "@/lib/team/schemas";
import { cn } from "@/lib/utils";

export const input = cn(controlStyles, "h-11");
export const field = "flex flex-col gap-1 text-small font-semibold text-ink";
const month = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 7) : "");

export type EditableMember = {
  id: string;
  name: string;
  designation: string;
  grp: string;
  bio: string | null;
  photoType: string | null;
  photoAlt: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
  linkedinUrl: string | null;
  email: string | null;
  showEmail: boolean;
  isVisible: boolean;
  sortOrder: number;
};

/** Every field of a team member; prefilled when editing, empty (visible) for a new person. */
export async function MemberFields({ member }: { member?: EditableMember }) {
  const [t, groups] = await Promise.all([
    getTranslations("adminTeam"),
    getTranslations("team.groups"),
  ]);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {member ? <input type="hidden" name="id" value={member.id} /> : null}
      <label className={field}>
        {t("name")}
        <input
          name="name"
          required
          minLength={2}
          maxLength={80}
          defaultValue={member?.name}
          className={input}
        />
      </label>
      <label className={field}>
        {t("designation")}
        <input
          name="designation"
          required
          minLength={2}
          maxLength={100}
          defaultValue={member?.designation}
          className={input}
        />
      </label>
      <label className={field}>
        {t("group")}
        <select name="grp" defaultValue={member?.grp ?? "team"} className={input}>
          {TEAM_GROUPS.map((g) => (
            <option key={g} value={g}>
              {groups(g)}
            </option>
          ))}
        </select>
      </label>
      <label className={field}>
        {t("order")}
        <input
          name="sortOrder"
          type="number"
          min={0}
          max={999}
          defaultValue={member?.sortOrder ?? 0}
          className={input}
        />
      </label>
      <label className={field}>
        {t("started")}
        <input
          name="startedAt"
          type="month"
          defaultValue={month(member?.startedAt)}
          className={input}
        />
      </label>
      <label className={field}>
        {t("ended")}
        <input
          name="endedAt"
          type="month"
          defaultValue={month(member?.endedAt)}
          className={input}
        />
      </label>
      <label className={field}>
        {t("linkedin")}
        <input
          name="linkedinUrl"
          type="url"
          maxLength={200}
          placeholder="https://www.linkedin.com/in/…"
          defaultValue={member?.linkedinUrl ?? ""}
          className={input}
        />
      </label>
      <label className={field}>
        {t("email")}
        <input
          name="email"
          type="email"
          maxLength={160}
          defaultValue={member?.email ?? ""}
          className={input}
        />
      </label>
      <label className={cn(field, "md:col-span-2")}>
        {t("bio")}
        <textarea
          name="bio"
          rows={3}
          maxLength={600}
          defaultValue={member?.bio ?? ""}
          className={cn(controlStyles, "py-2")}
        />
      </label>
      <label className={field}>
        {t("photo")}
        <input
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className={input}
        />
        <span className="font-normal text-muted-foreground">{t("photoHelp")}</span>
      </label>
      <label className={field}>
        {t("photoAlt")}
        <input
          name="photoAlt"
          maxLength={160}
          defaultValue={member?.photoAlt ?? ""}
          className={input}
        />
      </label>
      <div className="flex flex-col md:col-span-2">
        {member?.photoType ? <Toggle name="removePhoto" label={t("removePhoto")} /> : null}
        <Toggle name="showEmail" label={t("showEmail")} defaultChecked={member?.showEmail} />
        <Toggle name="isVisible" label={t("visible")} defaultChecked={member?.isVisible ?? true} />
      </div>
    </div>
  );
}
