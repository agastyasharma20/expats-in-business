import { getLocale, getTranslations } from "next-intl/server";

import { ActionForm } from "@/components/common/action-form";
import { ClearSavedOnDeletion } from "@/components/pwa/clear-saved-on-deletion";
import { buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { DELETION_GRACE_DAYS } from "@/lib/onboarding";
import { addDays } from "@/lib/time";
import { setDeletion } from "@/server/actions/account";

// Session-bound page: blocking navigation is expected (no instant prerender).
export const instant = false;

export default async function PrivacySettingsPage() {
  const user = await requireUser("/settings/privacy");
  const [t, s, locale, row] = await Promise.all([
    getTranslations("settings.privacy"),
    getTranslations("settings"),
    getLocale(),
    getDb().user.findUniqueOrThrow({
      where: { id: user.id },
      select: { deletionRequestedAt: true },
    }),
  ]);
  const scheduled = row.deletionRequestedAt;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col items-start gap-3 rounded-xl border border-line bg-surface p-6">
        <h2 className="text-h3">{t("exportTitle")}</h2>
        <p className="text-muted-foreground">{t("exportLead")}</p>
        {/* Plain link: a file download, not a page navigation. */}
        <a href="/api/account/export" download className={buttonVariants({ variant: "outline" })}>
          {t("export")}
        </a>
      </section>
      <section className="flex flex-col gap-3 rounded-xl border border-danger/40 bg-surface p-6">
        <h2 className="text-h3">{t("deleteTitle")}</h2>
        <p className="text-muted-foreground">{t("deleteLead")}</p>
        {scheduled ? (
          <>
            <ClearSavedOnDeletion />
            <p role="status" className="font-semibold text-danger">
              {t("scheduled", {
                date: new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
                  addDays(scheduled, DELETION_GRACE_DAYS),
                ),
              })}
            </p>
            <ActionForm
              action={setDeletion}
              submitLabel={t("cancel")}
              pendingLabel={s("saving")}
              successText={t("cancelled")}
              errorTexts={{ default: s("error") }}
              submitVariant="outline"
            >
              <input type="hidden" name="intent" value="cancel" />
            </ActionForm>
          </>
        ) : (
          <ActionForm
            action={setDeletion}
            submitLabel={t("delete")}
            pendingLabel={s("saving")}
            errorTexts={{ default: s("error"), confirm: t("deleteConfirm") }}
            submitVariant="destructive"
          >
            <Field id="confirm" label={t("deleteConfirm")} required>
              {(props) => (
                <Input {...props} name="confirm" required autoComplete="off" pattern="DELETE" />
              )}
            </Field>
          </ActionForm>
        )}
      </section>
    </div>
  );
}
