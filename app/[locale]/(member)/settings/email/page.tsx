import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { ActionForm } from "@/components/common/action-form";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { addEmail, removeEmail, resendEmail } from "@/server/actions/email";

// Session-bound page: blocking navigation is expected (no instant prerender).
export const instant = false;

async function VerifyNotice({
  searchParams,
}: {
  searchParams: PageProps<"/[locale]/settings/email">["searchParams"];
}) {
  const status = (await searchParams).status;
  if (status !== "verified" && status !== "invalid") return null;
  const t = await getTranslations("settings.email");
  return (
    <p
      role="status"
      className={status === "verified" ? "font-semibold text-success" : "font-semibold text-danger"}
    >
      {status === "verified" ? t("verifiedNotice") : t("invalidLink")}
    </p>
  );
}

export default async function EmailSettingsPage({
  searchParams,
}: PageProps<"/[locale]/settings/email">) {
  const user = await requireUser("/settings/email");
  const [t, s, emails] = await Promise.all([
    getTranslations("settings.email"),
    getTranslations("settings"),
    getDb().userEmail.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
  ]);
  const errors = { default: s("error"), taken: t("taken"), rateLimited: s("error") };

  return (
    <div className="flex flex-col gap-6">
      <Suspense>
        <VerifyNotice searchParams={searchParams} />
      </Suspense>
      <ul
        className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface"
        data-testid="email-list"
      >
        <li className="flex flex-wrap items-center gap-3 p-4">
          <span className="font-semibold">{user.email}</span>
          <Badge>{t("primary")}</Badge>
        </li>
        {emails.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-3 p-4">
            <span className="font-semibold">{row.email}</span>
            <Badge variant={row.verifiedAt ? "verified" : "unconfirmed"}>
              {row.verifiedAt ? t("verified") : t("unverified")}
            </Badge>
            <span className="ml-auto flex flex-wrap gap-2">
              {row.verifiedAt ? null : (
                <ActionForm
                  action={resendEmail}
                  submitLabel={t("resend")}
                  pendingLabel={s("saving")}
                  successText={t("added")}
                  errorTexts={errors}
                  submitVariant="outline"
                >
                  <input type="hidden" name="id" value={row.id} />
                </ActionForm>
              )}
              <ActionForm
                action={removeEmail}
                submitLabel={t("remove")}
                pendingLabel={s("saving")}
                errorTexts={errors}
                submitVariant="ghost"
              >
                <input type="hidden" name="id" value={row.id} />
              </ActionForm>
            </span>
          </li>
        ))}
      </ul>
      <ActionForm
        action={addEmail}
        submitLabel={t("add")}
        pendingLabel={s("saving")}
        successText={t("added")}
        errorTexts={errors}
        testId="add-email-form"
      >
        <Field id="new-email" label={t("add")} hint={t("lead")} required>
          {(props) => <Input {...props} type="email" name="email" required autoComplete="email" />}
        </Field>
      </ActionForm>
    </div>
  );
}
