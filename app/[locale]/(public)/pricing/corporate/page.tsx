import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ActionForm } from "@/components/common/action-form";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sendCorporateEnquiry } from "@/server/actions/corporate";
import { withAlternates } from "@/lib/seo";

const SIZES = ["s", "m", "l", "xl"] as const;
const selectClass =
  "min-h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("corporate");
  return withAlternates("/pricing/corporate", { title: t("title"), description: t("lead") });
}

export default async function CorporatePage() {
  const t = await getTranslations("corporate");
  return (
    <div className="container-page grid gap-10 py-12 lg:grid-cols-2">
      <header className="flex flex-col gap-3">
        <h1 className="text-h1">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("lead")}</p>
      </header>
      <ActionForm
        action={sendCorporateEnquiry}
        submitLabel={t("send")}
        pendingLabel={t("sending")}
        successText={t("sent")}
        errorTexts={{ default: t("error"), rateLimited: t("rateLimited") }}
        className="rounded-xl border border-line bg-surface p-6 shadow-card"
        testId="corporate-form"
      >
        <Field id="company" label={t("company")} required>
          {(props) => (
            <Input
              {...props}
              name="company"
              required
              minLength={2}
              maxLength={120}
              autoComplete="organization"
            />
          )}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="name" label={t("name")} required>
            {(props) => (
              <Input
                {...props}
                name="name"
                required
                minLength={2}
                maxLength={80}
                autoComplete="name"
              />
            )}
          </Field>
          <Field id="email" label={t("email")} required>
            {(props) => (
              <Input {...props} type="email" name="email" required autoComplete="email" />
            )}
          </Field>
        </div>
        <Field id="size" label={t("size")} required>
          {(props) => (
            <select {...props} name="size" required defaultValue="m" className={selectClass}>
              {SIZES.map((s) => (
                <option key={s} value={s}>
                  {t(`sizes.${s}`)}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field id="message" label={t("message")} required>
          {(props) => (
            <Textarea {...props} name="message" required minLength={10} maxLength={4000} rows={6} />
          )}
        </Field>
      </ActionForm>
    </div>
  );
}
