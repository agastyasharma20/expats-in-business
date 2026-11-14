import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { connection } from "next/server";
import { ExternalLinkIcon, UserPlusIcon, UsersIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { field, input, MemberFields } from "@/components/admin/team/member-fields";
import { ActionForm, Toggle } from "@/components/common/action-form";
import { Panel } from "@/components/dashboard/panel";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { controlStyles } from "@/components/ui/control-styles";
import { isAdmin } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { Link } from "@/lib/i18n/navigation";
import { getTeamForAdmin } from "@/lib/team/queries";
import { cn } from "@/lib/utils";
import { deleteMember, saveFounder, saveMember } from "@/server/actions/team";

// Session-bound page: blocking navigation is expected (no instant prerender).
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminTeam");
  return { title: t("title"), robots: { index: false } };
}

/** Admin editor for the public Team page: the founder's message and every team member. */
export default async function AdminTeamPage() {
  await connection();
  const user = await requirePermission("admin.access");
  if (!isAdmin(user)) forbidden();
  const [t, { founder, members }] = await Promise.all([
    getTranslations("adminTeam"),
    getTeamForAdmin(),
  ]);
  const common = {
    submitLabel: t("save"),
    pendingLabel: t("saving"),
    successText: t("saved"),
    errorTexts: {
      default: t("errors.default"),
      rateLimited: t("errors.rateLimited"),
      tooLarge: t("errors.tooLarge"),
      notImage: t("errors.notImage"),
    },
  };

  return (
    <div className="container-page flex flex-col gap-8 py-10">
      <PageHeader
        icon={UsersIcon}
        title={t("title")}
        lead={t("lead")}
        actions={
          <Link href="/team" className={buttonVariants({ variant: "outline" })}>
            {t("view")}
            <ExternalLinkIcon aria-hidden className="size-4" />
          </Link>
        }
      />

      <Panel id="founder" title={t("founder")} icon={UsersIcon} testId="team-founder">
        <p className="text-small text-muted-foreground">{t("founderNote")}</p>
        <ActionForm action={saveFounder} {...common} testId="founder-form">
          <div className="grid gap-4 md:grid-cols-2">
            <label className={field}>
              {t("founderName")}
              <input
                name="founderName"
                required
                minLength={2}
                maxLength={80}
                defaultValue={founder?.founderName}
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
                defaultValue={founder?.designation}
                className={input}
              />
            </label>
            <label className={cn(field, "md:col-span-2")}>
              {t("messageTitle")}
              <input
                name="title"
                required
                minLength={2}
                maxLength={120}
                defaultValue={founder?.title}
                className={input}
              />
            </label>
            <label className={cn(field, "md:col-span-2")}>
              {t("messageBody")}
              <textarea
                name="body"
                required
                minLength={20}
                maxLength={4000}
                rows={8}
                defaultValue={founder?.body}
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
                defaultValue={founder?.photoAlt ?? ""}
                className={input}
              />
            </label>
            {founder?.photoType ? (
              <div className="md:col-span-2">
                <p className="text-small text-muted-foreground">{t("hasPhoto")}</p>
                <Toggle name="removePhoto" label={t("removePhoto")} />
              </div>
            ) : null}
          </div>
        </ActionForm>
      </Panel>

      <Panel id="add" title={t("addMember")} icon={UserPlusIcon} testId="team-add">
        <ActionForm action={saveMember} {...common} testId="member-form-new">
          <MemberFields />
        </ActionForm>
      </Panel>

      <Panel id="people" title={t("members")} icon={UsersIcon} testId="team-members">
        {members.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line-strong p-5 text-muted-foreground">
            {t("noMembers")}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {members.map((member) => (
              <li
                key={member.id}
                className="rounded-xl border border-line p-4"
                data-testid="team-admin-row"
              >
                <details>
                  <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-3 font-semibold text-brand-950">
                    {member.name}
                    <span className="font-normal text-muted-foreground">{member.designation}</span>
                    {member.isVisible ? null : <Badge variant="outline">{t("hidden")}</Badge>}
                  </summary>
                  <div className="mt-4 flex flex-col gap-6">
                    <ActionForm action={saveMember} {...common} testId={`member-form-${member.id}`}>
                      <MemberFields member={member} />
                    </ActionForm>
                    <ActionForm
                      action={deleteMember}
                      submitLabel={t("delete")}
                      pendingLabel={t("deleting")}
                      successText={t("deleted")}
                      errorTexts={common.errorTexts}
                      submitVariant="outline"
                    >
                      <input type="hidden" name="id" value={member.id} />
                      <p className="text-small text-muted-foreground">
                        <strong>{t("deleteTitle")}.</strong> {t("deleteNote")}
                      </p>
                    </ActionForm>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
