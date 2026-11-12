import { getTranslations } from "next-intl/server";

import { ActionForm } from "@/components/common/action-form";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { locales } from "@/lib/i18n/routing";
import { updateAccount } from "@/server/actions/account";

// Session-bound page: blocking navigation is expected (no instant prerender).
export const instant = false;

const selectClass =
  "min-h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export default async function AccountSettingsPage() {
  const user = await requireUser("/settings/account");
  const [t, lang, row] = await Promise.all([
    getTranslations("settings"),
    getTranslations("language"),
    getDb().user.findUniqueOrThrow({
      where: { id: user.id },
      select: { name: true, email: true, locale: true },
    }),
  ]);
  return (
    <ActionForm
      action={updateAccount}
      submitLabel={t("save")}
      pendingLabel={t("saving")}
      successText={t("saved")}
      errorTexts={{ default: t("error") }}
      testId="account-form"
    >
      <Field id="name" label={t("account.name")} required>
        {(props) => (
          <Input
            {...props}
            name="name"
            required
            minLength={2}
            maxLength={80}
            defaultValue={row.name}
          />
        )}
      </Field>
      <Field id="locale" label={t("account.locale")}>
        {(props) => (
          <select
            {...props}
            name="locale"
            defaultValue={row.locale ?? locales[0]}
            className={selectClass}
          >
            {locales.map((l) => (
              <option key={l} value={l}>
                {lang(`names.${l}`)}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field id="email" label={t("account.email")}>
        {(props) => <Input {...props} value={row.email} readOnly />}
      </Field>
    </ActionForm>
  );
}
