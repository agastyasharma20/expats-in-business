import type { Metadata } from "next";
import {
  CalendarDaysIcon,
  GlobeIcon,
  HeartHandshakeIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ExternalLink } from "@/components/common/external-link";
import { PageBand } from "@/components/layout/page-band";
import { buttonVariants } from "@/components/ui/button";
import { getFact } from "@/config/facts";
import { Link } from "@/lib/i18n/navigation";
import { withAlternates } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("about");
  return withAlternates("/about", { title: t("title"), description: t("metaDescription") });
}

/** About EiB. Every statement comes from the facts registry (docs/FACTS.md), never from this file. */
export default async function AboutPage() {
  const t = await getTranslations("about");
  const name = getFact("org.name").value;
  const formats = getFact("org.formats").value.split(", ");
  const milestones = [
    {
      id: "anniversary",
      icon: SparklesIcon,
      detail: getFact("org.firstAnniversary").value,
      source: getFact("org.firstAnniversary").source,
    },
    {
      id: "cultoura",
      icon: GlobeIcon,
      detail: getFact("org.cultoura").value,
      source: getFact("org.cultoura").source,
    },
    {
      id: "sessions",
      icon: CalendarDaysIcon,
      detail: getFact("org.sessionsHeld").value,
      source: getFact("org.sessionsHeld").source,
    },
    {
      id: "meetup",
      icon: UsersIcon,
      detail: getFact("org.jointMeetup").value,
      source: getFact("org.jointMeetup").source,
    },
  ] as const;

  return (
    <div className="flex flex-col">
      <PageBand
        eyebrow={t("eyebrow")}
        title={t("title")}
        lead={t("lead", { name, tagline: getFact("org.tagline").value })}
        actions={
          <>
            <Link href="/sign-in" className={buttonVariants({ variant: "highlight", size: "lg" })}>
              {t("join")}
            </Link>
            <Link href="/events" className={buttonVariants({ variant: "secondary", size: "lg" })}>
              {t("sessions")}
            </Link>
          </>
        }
      />

      <div className="container-page flex flex-col gap-16 py-14">
        <section aria-labelledby="what-title" className="flex flex-col gap-5">
          <h2 id="what-title" className="text-h2">
            {t("whatTitle")}
          </h2>
          <p className="max-w-2xl text-muted-foreground">{t("whatLead")}</p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="about-formats">
            {formats.map((format, i) => (
              <li
                key={format}
                style={{ animationDelay: `${i * 60}ms` }}
                className="flex min-h-20 animate-rise items-center rounded-2xl border border-line bg-surface p-5 font-heading font-bold text-brand-950 shadow-card"
              >
                {format}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="milestones-title" className="flex flex-col gap-5">
          <h2 id="milestones-title" className="text-h2">
            {t("milestonesTitle")}
          </h2>
          <ol className="grid gap-4 md:grid-cols-2" data-testid="about-milestones">
            {milestones.map(({ id, icon: Icon, detail, source }, i) => (
              <li
                key={id}
                style={{ animationDelay: `${i * 60}ms` }}
                className="flex animate-rise gap-4 rounded-2xl border border-line bg-surface p-5 shadow-card"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-950">
                  <Icon aria-hidden="true" className="size-6" />
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="text-h3">{t(`milestones.${id}`)}</h3>
                  <p className="text-ink">{detail}</p>
                  {source ? (
                    <ExternalLink href={source} className="text-small">
                      {t("source")}
                    </ExternalLink>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <article className="flex flex-col gap-3 rounded-2xl bg-brand-50 p-6">
            <HeartHandshakeIcon aria-hidden="true" className="size-8 text-brand-950" />
            <h2 className="text-h3">
              {t("foundersTitle", { name: getFact("org.cofounder").value })}
            </h2>
            <p className="text-ink">{t("foundersText")}</p>
            <Link href="/team" className="font-semibold text-primary underline underline-offset-4">
              {t("teamLink")}
            </Link>
          </article>
          <article className="flex flex-col gap-3 rounded-2xl bg-brand-50 p-6">
            <GlobeIcon aria-hidden="true" className="size-8 text-brand-950" />
            <h2 className="text-h3">{t("bubblesTitle")}</h2>
            <p className="text-ink">{t("bubblesText")}</p>
            <Link
              href="/bubbles"
              className="font-semibold text-primary underline underline-offset-4"
            >
              {t("bubblesLink")}
            </Link>
          </article>
          <article className="flex flex-col gap-3 rounded-2xl bg-brand-50 p-6">
            <SparklesIcon aria-hidden="true" className="size-8 text-brand-950" />
            <h2 className="text-h3">{t("freeTitle")}</h2>
            <p className="text-ink">{t("freeText")}</p>
            <Link
              href="/pricing"
              className="font-semibold text-primary underline underline-offset-4"
            >
              {t("freeLink")}
            </Link>
          </article>
        </section>
      </div>
    </div>
  );
}
