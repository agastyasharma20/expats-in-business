import { getTranslations } from "next-intl/server";

import { ActionForm } from "@/components/common/action-form";
import { controlStyles } from "@/components/ui/control-styles";
import { ROLE_KINDS } from "@/lib/growth/rules";
import { cn } from "@/lib/utils";
import { saveRole } from "@/server/actions/roles";

type RoleValues = {
  id: string;
  title: string;
  team: string;
  kind: string;
  location: string;
  commitment: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  status: string;
};

const input = cn(controlStyles, "h-11");
const field = "flex flex-col gap-1 text-small font-semibold text-ink";

/** Create (no `role`) or edit an open role. Lists are one item per line. */
export async function RoleForm({ role }: { role?: RoleValues }) {
  const t = await getTranslations("adminGrowth");
  const tc = await getTranslations("careers");
  return (
    <ActionForm
      action={saveRole}
      submitLabel={role ? t("roleSave") : t("roleCreate")}
      pendingLabel={t("saving")}
      successText={t("roleSaved")}
      errorTexts={{ default: t("roleError"), rateLimited: t("rateLimited") }}
      testId={role ? "role-edit" : "role-new"}
    >
      {role ? <input type="hidden" name="id" value={role.id} /> : null}
      <div className="grid gap-3 md:grid-cols-2">
        <label className={field}>
          {t("fields.title")}
          <input
            name="title"
            required
            minLength={3}
            maxLength={100}
            defaultValue={role?.title}
            className={input}
          />
        </label>
        <label className={field}>
          {t("fields.team")}
          <input
            name="team"
            required
            minLength={2}
            maxLength={60}
            defaultValue={role?.team}
            className={input}
          />
        </label>
        <label className={field}>
          {t("fields.kind")}
          <select name="kind" defaultValue={role?.kind ?? "volunteer"} className={input}>
            {ROLE_KINDS.map((k) => (
              <option key={k} value={k}>
                {tc(`kinds.${k}`)}
              </option>
            ))}
          </select>
        </label>
        <label className={field}>
          {t("fields.status")}
          <select name="status" defaultValue={role?.status ?? "draft"} className={input}>
            {(["draft", "open", "closed"] as const).map((s) => (
              <option key={s} value={s}>
                {t(`roleStatus.${s}`)}
              </option>
            ))}
          </select>
        </label>
        <label className={field}>
          {t("fields.location")}
          <input
            name="location"
            required
            minLength={2}
            maxLength={80}
            defaultValue={role?.location}
            className={input}
          />
        </label>
        <label className={field}>
          {t("fields.commitment")}
          <input
            name="commitment"
            required
            minLength={2}
            maxLength={80}
            defaultValue={role?.commitment}
            className={input}
          />
        </label>
      </div>
      <label className={field}>
        {t("fields.summary")}
        <textarea
          name="summary"
          required
          minLength={20}
          maxLength={600}
          rows={3}
          defaultValue={role?.summary}
          className={cn(controlStyles, "resize-y py-2.5")}
        />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        {(["responsibilities", "requirements"] as const).map((k) => (
          <label key={k} className={field}>
            {t(`fields.${k}`)}
            <textarea
              name={k}
              rows={5}
              defaultValue={role?.[k].join("\n")}
              className={cn(controlStyles, "resize-y py-2.5")}
            />
            <span className="font-normal text-muted-foreground">{t("onePerLine")}</span>
          </label>
        ))}
      </div>
    </ActionForm>
  );
}
