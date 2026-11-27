import type { Metadata } from "next";
import { PlayIcon, PenLineIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ExternalLink } from "@/components/common/external-link";
import { PageBand } from "@/components/layout/page-band";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getFact } from "@/config/facts";
import { Link } from "@/lib/i18n/navigation";
import { withAlternates } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("stories");
  return withAlternates("/stories", { title: t("title"), description: t("lead") });
}

const PLACEHOLDERS = [1, 2, 3] as const;

/**
 * Stories. The only verified fact is the YouTube channel; episode cards are labelled placeholders
 * until the team adds real episodes (CLAUDE.md rule 3: no invented content).
 */
export default async function StoriesPage() {
  const t = await getTranslations("stories");
  const youtube = getFact("social.youtube").value;
  return (
    <div className="flex flex-col">
      <PageBand
        eyebrow={t("eyebrow")}
        title={t("title")}
        lead={t("lead")}
        actions={
          <>
            <a
              href={youtube}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "highlight", size: "lg" })}
            >
              <PlayIcon aria-hidden="true" />
              {t("watch")}
              <span className="sr-only">{t("newTab")}</span>
            </a>
            <Link
              href="/get-involved"
              className={buttonVariants({ variant: "secondary", size: "lg" })}
            >
              <PenLineIcon aria-hidden="true" />
              {t("share")}
            </Link>
          </>
        }
      />

      <div className="container-page flex flex-col gap-6 py-14">
        <h2 className="text-h2">{t("episodesTitle")}</h2>
        <ul className="grid gap-4 md:grid-cols-3" data-testid="story-episodes">
          {PLACEHOLDERS.map((n, i) => (
            <li
              key={n}
              style={{ animationDelay: `${i * 60}ms` }}
              className="flex animate-rise flex-col gap-3 rounded-2xl border border-dashed border-line-strong bg-surface p-6"
            >
              <div className="flex aspect-video items-center justify-center rounded-xl bg-brand-50 text-brand-950">
                <PlayIcon aria-hidden="true" className="size-10" />
              </div>
              <Badge variant="unconfirmed" className="self-start">
                {t("placeholder")}
              </Badge>
              <h3 className="text-h3">{t("placeholderTitle")}</h3>
              <p className="text-muted-foreground">{t("placeholderText")}</p>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground">
          {t("channelNote")} <ExternalLink href={youtube}>{t("channelLink")}</ExternalLink>
        </p>
      </div>
    </div>
  );
}
