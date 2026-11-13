import { cacheLife, cacheTag } from "next/cache";
import {
  BadgeCheckIcon,
  ExternalLinkIcon,
  InfoIcon,
  MessageCircleQuestionIcon,
} from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { evaluate } from "next-mdx-remote-client/rsc";
import remarkGfm from "remark-gfm";

import { ExternalLinkBase } from "@/components/common/external-link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getFact } from "@/config/facts";
import { guideText, type GuideFile } from "@/lib/content/guides";
import { Link } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";

import { createProseComponents, Prose } from "./prose";

/**
 * One guide page, rendered on the server and cached (content changes ship with a deploy). Request
 * APIs are unavailable inside "use cache", so the locale is passed in explicitly.
 */
export async function GuideDocument({
  guide,
  related,
  locale,
}: {
  guide: GuideFile;
  related: GuideFile[];
  locale: Locale;
}) {
  "use cache";
  cacheLife("days");
  cacheTag("guides");

  const [t, common, format] = await Promise.all([
    getTranslations({ locale, namespace: "guides" }),
    getTranslations({ locale, namespace: "common" }),
    getFormatter({ locale }),
  ]);
  const newTabLabel = common("opensInNewTab");
  const { content, error } = await evaluate({
    source: guide.body,
    components: createProseComponents({
      locale,
      newTabLabel,
      contactEmail: getFact("contact.email").value,
    }),
    options: { mdxOptions: { remarkPlugins: [remarkGfm] } },
  });
  if (error) throw error;
  const fm = guide.frontmatter;
  const text = guideText(fm, locale);
  const verified = format.dateTime(fm.lastVerified, { dateStyle: "long" });
  const ask = `/concierge?q=${encodeURIComponent(fm.title)}`;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
      <article className="flex min-w-0 flex-col gap-6" data-testid="guide">
        <header className="flex flex-col items-start gap-3">
          <Badge variant="verified" className="gap-1" data-testid="last-verified">
            <BadgeCheckIcon aria-hidden="true" className="size-3.5" />
            {t("lastVerified", { date: verified })}
          </Badge>
          <h1 className="text-h1" lang={text.machine ? locale : "en"}>
            {text.title}
          </h1>
          <p className="text-lg text-muted-foreground">{text.description}</p>
          {text.machine ? (
            <p
              role="note"
              data-testid="machine-translated"
              className="rounded-lg border border-line bg-brand-50 p-3 text-small text-ink"
            >
              <strong>{t("machine")}</strong> {t("englishBody")}
            </p>
          ) : null}
          {fm.verificationStatus === "draft" ? (
            <p
              role="note"
              className="rounded-lg border border-warning/40 bg-warning-50 p-3 text-small text-warning"
            >
              {t("draft")}
            </p>
          ) : null}
        </header>
        <p
          role="note"
          className="flex gap-2 rounded-lg border border-line bg-canvas p-3 text-small text-ink"
          data-testid="disclaimer"
        >
          <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-700" />
          <span>
            <strong>{t("disclaimer")}</strong> {fm.disclaimer}
          </span>
        </p>
        <Prose>{content}</Prose>
      </article>

      <aside className="flex flex-col gap-6 self-start lg:sticky lg:top-24">
        <section
          aria-labelledby="sources-title"
          className="flex flex-col gap-3 rounded-xl border border-brand-700/30 bg-brand-50 p-5"
          data-testid="sources"
        >
          <h2 id="sources-title" className="text-h3">
            {t("sources")}
          </h2>
          <p className="text-small text-ink">{t("sourcesLead")}</p>
          <ul className="flex flex-col gap-2">
            {fm.sources.map((source) => (
              <li key={source.url} className="flex items-start gap-2 text-small">
                <ExternalLinkIcon
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-brand-700"
                />
                <ExternalLinkBase href={source.url} newTabLabel={newTabLabel}>
                  {source.title}
                </ExternalLinkBase>
              </li>
            ))}
          </ul>
        </section>
        <section
          aria-labelledby="ask-title"
          className="flex flex-col items-start gap-3 rounded-xl border border-line bg-surface p-5"
        >
          <h2 id="ask-title" className="flex items-center gap-2 text-h3">
            <MessageCircleQuestionIcon aria-hidden="true" className="size-5 text-brand-700" />
            {t("ask")}
          </h2>
          <p className="text-small text-muted-foreground">{t("askLead")}</p>
          <Link href={ask} locale={locale} className={buttonVariants()}>
            {t("ask")}
          </Link>
        </section>
        {related.length ? (
          <section aria-labelledby="related-title" className="flex flex-col gap-2">
            <h2 id="related-title" className="text-h3">
              {t("related")}
            </h2>
            <ul className="flex flex-col gap-1">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/guides/${r.slug}`}
                    locale={locale}
                    className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline"
                  >
                    {r.frontmatter.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </aside>
    </div>
  );
}
