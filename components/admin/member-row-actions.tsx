import { ShieldAlertIcon, ShieldCheckIcon, XIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ActionButton } from "@/components/common/action-button";
import { ActionForm } from "@/components/common/action-form";
import { controlStyles } from "@/components/ui/control-styles";
import { GRANTABLE_ROLES } from "@/lib/admin/rules";
import { cn } from "@/lib/utils";
import { changeRole, reinstateMember, suspendMember } from "@/server/actions/admin";

type Member = {
  id: string;
  suspendedAt: Date | null;
  roles: { id: string; role: string; chapter: { id: string; name: string } | null }[];
};

/** Expandable row tools (no JS needed): roles, grant a role, suspend or reinstate. */
export async function MemberRowActions({
  member,
  chapters,
  locked,
}: {
  member: Member;
  chapters: { id: string; name: string }[];
  /** Own account or another admin: shown read-only. */
  locked: boolean;
}) {
  const t = await getTranslations("adminMembers");
  const errors = {
    default: t("errors.default"),
    forbidden: t("errors.forbidden"),
    rateLimited: t("errors.rateLimited"),
  };
  if (locked) return <p className="text-small text-muted-foreground">{t("locked")}</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {member.roles
          .filter((r) => r.role !== "admin" && r.chapter)
          .map((r) => (
            <ActionButton
              key={r.id}
              action={changeRole}
              fields={{ userId: member.id, role: r.role, chapterId: r.chapter!.id, grant: "false" }}
              variant="outline"
              toasts={{ revoked: t("revoked") }}
              errorText={errors.forbidden}
              aria-label={t("revokeLabel", {
                role: t(`roles.${r.role}`),
                chapter: r.chapter!.name,
              })}
            >
              {t(`roles.${r.role}`)} · {r.chapter!.name}
              <XIcon aria-hidden="true" />
            </ActionButton>
          ))}
      </div>
      <ActionForm
        action={changeRole}
        submitLabel={t("grant")}
        pendingLabel={t("saving")}
        successText={t("granted")}
        errorTexts={errors}
        submitVariant="outline"
        className="gap-3 sm:flex-row sm:items-end"
      >
        <input type="hidden" name="userId" value={member.id} />
        <input type="hidden" name="grant" value="true" />
        <label className="flex flex-1 flex-col gap-1 text-small font-semibold text-ink">
          {t("role")}
          <select name="role" className={cn(controlStyles, "h-11")} defaultValue="moderator">
            {GRANTABLE_ROLES.filter((r) => r !== "member").map((role) => (
              <option key={role} value={role}>
                {t(`roles.${role}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-small font-semibold text-ink">
          {t("chapter")}
          <select name="chapterId" className={cn(controlStyles, "h-11")}>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </ActionForm>
      {member.suspendedAt ? (
        <ActionButton
          action={reinstateMember}
          fields={{ userId: member.id }}
          toasts={{ reinstated: t("reinstated") }}
          errorText={errors.forbidden}
          className="self-start"
        >
          <ShieldCheckIcon aria-hidden="true" />
          {t("reinstate")}
        </ActionButton>
      ) : (
        <ActionForm
          action={suspendMember}
          submitLabel={t("suspend")}
          pendingLabel={t("saving")}
          successText={t("suspended")}
          errorTexts={errors}
          submitVariant="destructive"
          className="gap-3 sm:flex-row sm:items-end"
        >
          <input type="hidden" name="userId" value={member.id} />
          <label className="flex flex-1 flex-col gap-1 text-small font-semibold text-ink">
            <span className="flex items-center gap-1.5">
              <ShieldAlertIcon aria-hidden="true" className="size-4 text-danger" />
              {t("reason")}
            </span>
            <input name="reason" maxLength={300} className={cn(controlStyles, "h-11")} />
          </label>
        </ActionForm>
      )}
    </div>
  );
}
