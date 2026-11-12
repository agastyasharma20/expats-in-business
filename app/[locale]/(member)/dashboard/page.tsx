import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AwardIcon, BriefcaseIcon, CalendarDaysIcon, UsersIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { ProgressRing } from "@/components/roadmap/progress-ring";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { Link } from "@/lib/i18n/navigation";
import { ONBOARDING_STEPS } from "@/lib/onboarding";
import { getDashboard } from "@/lib/member/queries";
import { progressOf, syncRoadmap } from "@/lib/roadmap/service";
import { formatInZone } from "@/lib/time";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("dashboard"), robots: { index: false } };
}

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboard(user.id);
  if ((data.profile?.onboardingStep ?? 0) < ONBOARDING_STEPS.length) redirect("/onboarding");
  const [t, r, locale, roadmap] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("roadmap"),
    getLocale(),
    syncRoadmap(user.id),
  ]);
  const progress = progressOf(roadmap);
  const nextStep = roadmap.find((i) => !i.doneAt);

  // Every card is a link to the filtered list (old bugs 1 and 13: dead stat cards and icons).
  const cards = [
    { key: "events", href: "/my/events", icon: CalendarDaysIcon, value: data.stats.events },
    { key: "connections", href: "/connections", icon: UsersIcon, value: data.stats.connections },
    {
      key: "businesses",
      href: "/my/businesses",
      icon: BriefcaseIcon,
      value: data.stats.businesses,
    },
  ] as const;
  const next = data.nextTicket?.event;

  return (
    <div className="container-page flex flex-col gap-10 py-12">
      <header className="flex flex-col items-start gap-3">
        <h1 className="text-h1">{t("title", { name: user.name.split(" ")[0] ?? user.name })}</h1>
        {data.profile?.foundingNumber ? (
          <Badge variant="founding" className="gap-1.5">
            <AwardIcon aria-hidden="true" className="size-4" />
            {t("founding", { number: data.profile.foundingNumber })}
            {data.profile.homeChapter ? ` · ${data.profile.homeChapter.name}` : null}
          </Badge>
        ) : null}
      </header>

      <ul className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <li key={card.key}>
            <Link
              href={card.href}
              data-testid={`stat-${card.key}`}
              className="flex h-full items-center gap-4 rounded-xl border border-line bg-surface p-6 shadow-card transition-transform duration-(--duration-micro) hover:-translate-y-0.5"
            >
              <card.icon aria-hidden="true" className="size-7 text-brand-700" />
              <span className="flex flex-col">
                <span className="font-heading text-h2 font-bold text-brand-950">{card.value}</span>
                <span className="text-small text-muted-foreground">{t(`stats.${card.key}`)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <section
        aria-labelledby="roadmap-title"
        className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6 shadow-card sm:flex-row sm:items-center"
        data-testid="dashboard-roadmap"
      >
        <ProgressRing
          percent={progress.percent}
          label={r("progressLabel", { percent: progress.percent })}
        />
        <div className="flex flex-1 flex-col gap-1">
          <h2 id="roadmap-title" className="text-h3">
            {t("roadmap")}
          </h2>
          <p className="text-ink">
            {r("progress", { done: progress.done, total: progress.total })}
          </p>
          {nextStep ? <p className="text-small text-muted-foreground">{nextStep.title}</p> : null}
        </div>
        <Link href="/roadmap" className={buttonVariants()}>
          {r("dashboardCta")}
        </Link>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="next-title"
          className="flex flex-col items-start gap-3 rounded-xl border border-line bg-surface p-6"
        >
          <h2 id="next-title" className="text-h3">
            {t("nextEvent")}
          </h2>
          {next ? (
            <p className="text-ink">
              <strong>{next.title}</strong>
              <br />
              {formatInZone(next.startsAt, next.chapter.timezone, locale)}
            </p>
          ) : (
            <p className="text-muted-foreground">{t("noEvent")}</p>
          )}
          <Link href="/events" className={buttonVariants({ variant: "outline" })}>
            {t("findEvent")}
          </Link>
        </section>

        <section
          aria-labelledby="suggested-title"
          className="flex flex-col items-start gap-3 rounded-xl border border-line bg-surface p-6"
        >
          <h2 id="suggested-title" className="text-h3">
            {t("suggested")}
          </h2>
          {data.suggested.length ? (
            <ul className="flex w-full flex-col gap-2">
              {data.suggested.map((person) => (
                <li key={person.slug}>
                  <Link
                    href={`/members/${person.slug}`}
                    className="flex min-h-11 flex-col rounded-md py-1 hover:underline"
                  >
                    <span className="font-semibold text-brand-950">{person.user.name}</span>
                    {person.headline ? (
                      <span className="text-small text-muted-foreground">{person.headline}</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <>
              <p className="text-muted-foreground">{t("noSuggested")}</p>
              <Link href="/settings/profile" className={buttonVariants({ variant: "outline" })}>
                {t("completeProfile")}
              </Link>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
