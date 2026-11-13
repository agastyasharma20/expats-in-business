import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ActionForm } from "@/components/common/action-form";
import { buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/lib/i18n/navigation";
import { sendHelpMessage } from "@/server/actions/help";
import { withAlternates } from "@/lib/seo";
import { faqData, JsonLd } from "@/components/seo/json-ld";

const FAQ = ["free", "signin", "profile", "delete"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("help");
  return withAlternates("/help", { title: t("title"), description: t("lead") });
}

export default async function HelpPage() {
  const t = await getTranslations("help");
  return (
    <div className="container-page grid gap-12 py-12 lg:grid-cols-2">
      <JsonLd
        data={faqData(
          FAQ.map((key) => ({ question: t(`faq.${key}.q`), answer: t(`faq.${key}.a`) })),
        )}
      />
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-h1">{t("title")}</h1>
          <p className="text-muted-foreground">{t("lead")}</p>
        </header>
        <section aria-labelledby="faq-title" className="flex flex-col gap-2">
          <h2 id="faq-title" className="text-h3">
            {t("faqTitle")}
          </h2>
          {FAQ.map((key) => (
            <details key={key} className="rounded-xl border border-line bg-surface px-4">
              <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-brand-950">
                {t(`faq.${key}.q`)}
              </summary>
              <p className="pb-4 text-muted-foreground">{t(`faq.${key}.a`)}</p>
            </details>
          ))}
        </section>
        <p className="text-muted-foreground">{t("concierge")}</p>
        <Link
          href="/guides"
          className={buttonVariants({ variant: "outline", className: "self-start" })}
        >
          {t("guides")}
        </Link>
      </div>
      <section
        aria-labelledby="contact-title"
        className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6 shadow-card"
      >
        <h2 id="contact-title" className="text-h3">
          {t("contactTitle")}
        </h2>
        <ActionForm
          action={sendHelpMessage}
          submitLabel={t("send")}
          pendingLabel={t("send")}
          successText={t("sent")}
          errorTexts={{ default: t("error"), rateLimited: t("rateLimited") }}
          testId="help-form"
        >
          <Field id="help-name" label={t("name")} required>
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
          <Field id="help-email" label={t("email")} required>
            {(props) => (
              <Input {...props} type="email" name="email" required autoComplete="email" />
            )}
          </Field>
          <Field id="help-message" label={t("message")} required>
            {(props) => (
              <Textarea
                {...props}
                name="message"
                required
                minLength={10}
                maxLength={4000}
                rows={6}
              />
            )}
          </Field>
        </ActionForm>
      </section>
    </div>
  );
}
