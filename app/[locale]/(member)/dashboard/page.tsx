import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  ArrowRightIcon,
  AwardIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
  GlobeIcon,
  MapIcon,
  SparklesIcon,
  UserCheckIcon,
  UsersIcon,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import {
  ActivityPanel,
  NotificationsPanel,
  RoulettePanel,
} from "@/components/dashboard/community-panels";
import { Panel } from "@/components/dashboard/panel";
import { StatCounter } from "@/components/motion";
import { ProgressRing } from "@/components/roadmap/progress-ring";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { getFlags } from "@/lib/features";
import { Link } from "@/lib/i18n/navigation";
import { getDashboardExtras } from "@/lib/member/dashboard-extras";
import { getDashboard } from "@/lib/member/queries";
import { ONBOARDING_STEPS } from "@/lib/onboarding";
import { progressOf, syncRoadmap } from "@/lib/roadmap/service";
import { formatInZone, utcToZoned } from "@/lib/time";

// Personalised and session-bound: blocking navigation is expected.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("dashboard"), robots: { index: false } };
}

function partOfDay(hour: number) {
  if (hour < 5) return "evening";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export default async function DashboardPage() {
  const user = await requireUser();
  // Read-only queries run together; the roadmap sync writes, so it waits for the onboarding check.
  const [data, extras] = await Promise.all([getDashboard(user.id), getDashboardExtras(user.id)]);
  if ((data.profile?.onboardingStep ?? 0) < ONBOARDING_STEPS.length) redirect("/onboarding");
  const [t, r, locale, roadmap, flags] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("roadmap"),
    getLocale(),
    syncRoadmap(user.id),
    getFlags(),
  ]);
  const progress = progressOf(roadmap);
  const upcoming = roadmap.filter((i) => !i.doneAt).slice(0, 3);
  const zone = extras.timezone ?? "UTC";
  const now = new Date();
  const first = user.name.split(" ")[0] ?? user.name;
  const next = data.nextTicket?.event;

  // Every card is a link to the filtered list (old bugs 1 and 13: dead stat cards and icons).
  const cards = [
    { key: "events", href: "/my/events", icon: CalendarDaysIcon, value: data.stats.events },
    { key: "connections", href: "/connections", icon: UsersIcon, value: data.stats.connections },
    { key: "bubbles", href: "/bubbles", icon: GlobeIcon, value: extras.bubbleCount },
    {
      key: "businesses",
      href: "/my/businesses",
      icon: BriefcaseIcon,
      value: data.stats.businesses,
    },
  ] as const;

  return (
    <div className="container-page flex flex-col gap-8 py-10 sm:py-12">
      <header className="relative flex animate-rise flex-col gap-5 overflow-hidden rounded-3xl bg-brand-950 p-6 text-on-dark sm:p-8 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <p className="eyebrow text-on-dark-muted">
            {new Intl.DateTimeFormat(locale, {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: zone,
            }).format(now)}
          </p>
          <h1 className="text-h2 text-on-dark sm:text-h1">
            {t(`greeting.${partOfDay(utcToZoned(now, zone).hour)}`, { name: first })}
          </h1>
          {data.profile?.foundingNumber ? (
            <Badge variant="founding" className="gap-1.5 self-start">
              <AwardIcon aria-hidden="true" className="size-4" />
              {t("founding", { number: data.profile.foundingNumber })}
              {data.profile.homeChapter ? ` · ${data.profile.homeChapter.name}` : null}
            </Badge>
          ) : null}
        </div>
        <nav aria-label={t("quick.label")} className="flex flex-wrap gap-2">
          <Link href="/events" className={buttonVariants({ variant: "secondary" })}>
            {t("quick.events")}
          </Link>
          <Link href="/concierge" className={buttonVariants({ variant: "secondary" })}>
            <SparklesIcon aria-hidden="true" />
            {t("quick.concierge")}
          </Link>
          <Link href="/community" className={buttonVariants({ variant: "secondary" })}>
            {t("quick.community")}
          </Link>
        </nav>
      </header>

      {extras.pendingRequests ? (
        <Link
          href="/connections"
          className="flex animate-rise items-center justify-between gap-3 rounded-2xl border border-brand-700 bg-brand-50 p-4 font-semibold text-brand-950 hover:underline"
          data-testid="pending-banner"
        >
          {t("pending", { count: extras.pendingRequests })}
          <ArrowRightIcon aria-hidden="true" className="size-5" />
        </Link>
      ) : null}

      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {cards.map((card, i) => (
          <li key={card.key} className="animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
            <Link
              href={card.href}
              data-testid={`stat-${card.key}`}
              className="group flex h-full flex-col gap-3 rounded-2xl border border-line bg-surface p-5 shadow-card transition-transform duration-(--duration-micro) hover:-translate-y-0.5 hover:border-line-strong"
            >
              <span className="flex items-center justify-between">
                <card.icon aria-hidden="true" className="size-6 text-brand-700" />
                <ArrowRightIcon
                  aria-hidden="true"
                  className="size-4 text-muted-foreground transition-transform duration-(--duration-micro) group-hover:translate-x-0.5"
                />
              </span>
              <StatCounter
                value={card.value}
                className="font-heading text-h2 font-bold text-brand-950"
              />
              <span className="text-small text-muted-foreground">{t(`stats.${card.key}`)}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel
          id="roadmap"
          title={t("roadmap")}
          icon={MapIcon}
          delay={2}
          className="lg:col-span-2"
          testId="dashboard-roadmap"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <ProgressRing
              percent={progress.percent}
              label={r("progressLabel", { percent: progress.percent })}
            />
            <div className="flex flex-1 flex-col gap-2">
              <p className="font-semibold text-ink">
                {r("progress", { done: progress.done, total: progress.total })}
              </p>
              {upcoming.length ? (
                <ol className="flex flex-col gap-1.5 text-small">
                  {upcoming.map((item, i) => (
                    <li key={item.id} className="flex items-baseline gap-2 text-ink">
                      <span className="font-bold text-brand-700">{i + 1}.</span>
                      {item.title}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-small text-muted-foreground">{t("roadmapDone")}</p>
              )}
            </div>
            <Link
              href="/roadmap"
              className={buttonVariants({ className: "self-start sm:self-center" })}
            >
              {r("dashboardCta")}
            </Link>
          </div>
        </Panel>

        <Panel id="strength" title={t("strength.title")} icon={UserCheckIcon} delay={3}>
          <div className="flex items-center gap-4">
            <ProgressRing
              percent={extras.completeness.percent}
              size={72}
              label={t("strength.label", { percent: extras.completeness.percent })}
            />
            <p className="text-small text-ink">
              {extras.completeness.missing.length
                ? t("strength.missing", {
                    items: extras.completeness.missing
                      .slice(0, 3)
                      .map((key) => t(`strength.items.${key}`))
                      .join(", "),
                  })
                : t("strength.complete")}
            </p>
          </div>
          {extras.completeness.missing.length ? (
            <Link
              href="/settings/profile"
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "self-start",
              })}
            >
              {t("completeProfile")}
            </Link>
          ) : null}
        </Panel>

        <Panel id="next" title={t("nextEvent")} icon={CalendarDaysIcon} delay={4}>
          {next ? (
            <p className="text-ink">
              <strong className="text-brand-950">{next.title}</strong>
              <br />
              <span className="text-small">
                {formatInZone(next.startsAt, next.chapter.timezone, locale)}
              </span>
            </p>
          ) : (
            <p className="text-muted-foreground">{t("noEvent")}</p>
          )}
          <Link
            href={next ? "/my/events" : "/events"}
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "mt-auto self-start",
            })}
          >
            {next ? t("viewTicket") : t("findEvent")}
          </Link>
        </Panel>

        {flags.coffeeRoulette ? <RoulettePanel match={extras.match} delay={5} /> : null}
        <NotificationsPanel items={extras.notifications} delay={6} />
        <ActivityPanel posts={extras.posts} delay={7} />

        <Panel id="suggested" title={t("suggested")} icon={UsersIcon} delay={8}>
          {data.suggested.length ? (
            <ul className="flex flex-col gap-1">
              {data.suggested.map((person) => (
                <li key={person.slug}>
                  <Link
                    href={`/members/${person.slug}`}
                    className="flex min-h-11 flex-col rounded-lg p-2 hover:bg-brand-50"
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
            <div className="flex flex-col items-start gap-3">
              <p className="text-muted-foreground">{t("noSuggested")}</p>
              <Link href="/members" className={buttonVariants({ variant: "outline", size: "sm" })}>
                {t("browseMembers")}
              </Link>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
