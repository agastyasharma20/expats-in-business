"use client";

import { BadgeCheckIcon, BookOpenIcon, ExternalLinkIcon, HeartHandshakeIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button";
import type { HandoffReason } from "@/lib/ai/concierge";
import type { Passage } from "@/lib/ai/prompt";
import { Link } from "@/lib/i18n/navigation";

const CITATION = /(\[\[[A-Za-z0-9_-]{1,64}\]\])/g;

/** Answer text with [[id]] markers turned into numbered links to the matching source chip. */
export function AnswerText({ text, sources }: { text: string; sources: Passage[] }) {
  const t = useTranslations("concierge");
  const parts = text.split(CITATION);
  return (
    <p className="leading-7 text-ink">
      {parts.map((part, i) => {
        const id = /^\[\[(.+)\]\]$/.exec(part)?.[1];
        if (!id) return <span key={i}>{part}</span>;
        const index = sources.findIndex((s) => s.id === id);
        if (index < 0) return null;
        return (
          <sup key={i}>
            <a
              href={`#source-${id}`}
              className="ml-0.5 rounded px-1 font-semibold text-brand-700 underline"
              aria-label={`${t("sources")} ${index + 1}`}
            >
              {index + 1}
            </a>
          </sup>
        );
      })}
    </p>
  );
}

/** Source chips for cited passages only: guide title, official page, last verified date. */
export function SourceChips({ sources, cited }: { sources: Passage[]; cited: string[] }) {
  const t = useTranslations("concierge");
  const common = useTranslations("common");
  const format = useFormatter();
  const used = sources.map((s, i) => ({ ...s, n: i + 1 })).filter((s) => cited.includes(s.id));
  return (
    <section aria-label={t("sources")} className="flex flex-col gap-2 border-t border-line pt-3">
      <h3 className="eyebrow text-muted-foreground">{t("sources")}</h3>
      <ul className="flex flex-col gap-2" data-testid="source-chips">
        {used.map((s) => (
          <li
            key={s.id}
            id={`source-${s.id}`}
            className="flex flex-col gap-1 rounded-lg border border-brand-700/30 bg-brand-50 p-3 text-small"
          >
            <span className="font-semibold text-brand-950">
              [{s.n}] {s.guideTitle} · {s.heading}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <BadgeCheckIcon aria-hidden="true" className="size-3.5 text-brand-700" />
              {t("sourceChip", {
                title: s.sourceTitle,
                date: format.dateTime(new Date(s.lastVerified), { dateStyle: "medium" }),
              })}
            </span>
            <span className="flex flex-wrap gap-x-4 gap-y-1">
              <Link
                href={`/guides/${s.guideSlug}`}
                className="inline-flex min-h-11 items-center gap-1 font-semibold text-brand-700 underline"
              >
                <BookOpenIcon aria-hidden="true" className="size-4" />
                {t("readGuide")}
              </Link>
              {s.sourceUrl ? (
                <a
                  href={s.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-1 font-semibold text-brand-700 underline"
                  data-testid="official-link"
                >
                  <ExternalLinkIcon aria-hidden="true" className="size-4" />
                  {t("official")}
                  <span className="sr-only"> ({common("opensInNewTab")})</span>
                </a>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Shown instead of an answer when the guides cannot answer safely (brief 3F). */
export function HandoffCard({ reason }: { reason: HandoffReason }) {
  const t = useTranslations("concierge.handoff");
  return (
    <div className="flex flex-col gap-3" data-testid="handoff">
      <h3 className="text-h3">{t("title")}</h3>
      <p className="text-ink">{t(reason)}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/providers?verified=1"
          className="flex flex-col gap-1 rounded-xl border border-line bg-canvas p-4 hover:border-brand-700"
        >
          <span className="flex items-center gap-2 font-semibold text-brand-950">
            <BadgeCheckIcon aria-hidden="true" className="size-5 text-brand-700" />
            {t("provider")}
          </span>
          <span className="text-small text-muted-foreground">{t("providerLead")}</span>
        </Link>
        <Link
          href="/guides/information-point-for-foreigners"
          className="flex flex-col gap-1 rounded-xl border border-line bg-canvas p-4 hover:border-brand-700"
        >
          <span className="flex items-center gap-2 font-semibold text-brand-950">
            <HeartHandshakeIcon aria-hidden="true" className="size-5 text-brand-700" />
            {t("freeHelp")}
          </span>
          <span className="text-small text-muted-foreground">{t("freeHelpLead")}</span>
        </Link>
      </div>
      <Link
        href="/guides"
        className={buttonVariants({ variant: "link", size: "inline", className: "self-start" })}
      >
        {t("guides")}
      </Link>
    </div>
  );
}
