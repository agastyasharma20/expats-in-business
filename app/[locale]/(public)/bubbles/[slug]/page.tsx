import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  CrownIcon,
  EyeIcon,
  EyeOffIcon,
  LogOutIcon,
  MessagesSquareIcon,
  UserPlusIcon,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { ActionButton } from "@/components/common/action-button";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth/session";
import { getBubble } from "@/lib/community/bubbles";
import { Link } from "@/lib/i18n/navigation";
import { formatInZone } from "@/lib/time";
import { joinBubble, leaveBubble, setBubbleVisibility } from "@/server/actions/bubbles";

type Props = PageProps<"/[locale]/bubbles/[slug]">;

export const instant = false;

export const metadata: Metadata = { robots: { index: false } };

async function BubbleView({ params }: { params: Props["params"] }) {
  const { slug } = await params;
  const user = await getSessionUser();
  const [t, locale, bubble] = await Promise.all([
    getTranslations("bubbles"),
    getLocale(),
    getBubble(slug, user?.id ?? null),
  ]);
  if (!bubble) notFound();
  const country = new Intl.DisplayNames([locale], { type: "region" }).of(bubble.originCountryCode);
  const fields = { bubbleId: bubble.id };

  return (
    <>
      <Link
        href="/bubbles"
        className="inline-flex min-h-11 items-center gap-2 self-start text-small font-semibold text-primary hover:underline"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        {t("back")}
      </Link>
      <PageHeader
        eyebrow={country}
        title={bubble.name}
        lead={bubble.description}
        actions={
          user ? (
            bubble.me ? (
              <>
                <ActionButton
                  action={setBubbleVisibility}
                  fields={{ ...fields, visible: bubble.me.isVisible ? "false" : "true" }}
                  toasts={{ shown: t("shownToast"), hidden: t("hiddenToast") }}
                >
                  {bubble.me.isVisible ? (
                    <EyeOffIcon aria-hidden="true" />
                  ) : (
                    <EyeIcon aria-hidden="true" />
                  )}
                  {bubble.me.isVisible ? t("hideMe") : t("showMe")}
                </ActionButton>
                {bubble.me.isLead ? null : (
                  <ActionButton
                    action={leaveBubble}
                    fields={fields}
                    variant="ghost"
                    toasts={{ left: t("left") }}
                  >
                    <LogOutIcon aria-hidden="true" />
                    {t("leave")}
                  </ActionButton>
                )}
              </>
            ) : (
              <ActionButton
                action={joinBubble}
                fields={fields}
                variant="default"
                size="default"
                toasts={{ joined: t("joined") }}
                errorText={t("rateLimited")}
                testId="join-bubble"
              >
                <UserPlusIcon aria-hidden="true" />
                {t("join")}
              </ActionButton>
            )
          ) : (
            <Link
              href={`/sign-in?next=${encodeURIComponent(`/bubbles/${bubble.slug}`)}`}
              className={buttonVariants()}
            >
              {t("signInToJoin")}
            </Link>
          )
        }
      />
      <div className="flex flex-wrap gap-2">
        <Badge variant="bubble">
          {bubble.count === null ? t("fewer") : t("count", { count: bubble.count })}
        </Badge>
        {bubble.me ? <Badge variant="verified">{t("joinedBadge")}</Badge> : null}
        {bubble.isDemo ? <Badge variant="demo">{t("demo")}</Badge> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section
          aria-labelledby="lead-title"
          className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 shadow-card"
        >
          <h2 id="lead-title" className="flex items-center gap-2 text-body font-bold">
            <CrownIcon aria-hidden="true" className="size-5 text-brand-700" />
            {t("lead1")}
          </h2>
          {bubble.lead ? (
            <p className="font-semibold text-brand-950">{bubble.lead.user.name}</p>
          ) : (
            <p className="text-small text-muted-foreground">{t("leadNone")}</p>
          )}
          {bubble.groups[0] && user ? (
            <Link
              href={`/community/${bubble.groups[0].slug}`}
              className={buttonVariants({ variant: "outline", className: "mt-auto self-start" })}
            >
              <MessagesSquareIcon aria-hidden="true" />
              {t("group")}
            </Link>
          ) : null}
        </section>

        <section
          aria-labelledby="events-title"
          className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 shadow-card lg:col-span-2"
        >
          <h2 id="events-title" className="flex items-center gap-2 text-body font-bold">
            <CalendarDaysIcon aria-hidden="true" className="size-5 text-brand-700" />
            {t("events")}
          </h2>
          {bubble.events.length ? (
            <ul className="flex flex-col divide-y divide-line">
              {bubble.events.map((event) => (
                <li key={event.slug} className="py-2">
                  <Link
                    href={`/events/${event.slug}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    {event.title}
                  </Link>
                  <p className="text-small text-muted-foreground">
                    {formatInZone(event.startsAt, event.chapter.timezone, locale)} ·{" "}
                    {event.chapter.name}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-small text-muted-foreground">{t("noEvents")}</p>
              <Link href="/events" className={buttonVariants({ variant: "outline", size: "sm" })}>
                {t("allEvents")}
              </Link>
            </div>
          )}
        </section>
      </div>

      <section aria-labelledby="members-title" className="flex flex-col gap-4">
        <h2 id="members-title" className="text-h3">
          {t("visibleMembers")}
        </h2>
        {bubble.members.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bubble.members.map((member, i) => {
              const profile = member.user.profile;
              const name = profile?.isPublic ? (
                <Link
                  href={`/members/${profile.slug}`}
                  className="font-semibold text-brand-950 hover:underline"
                >
                  {member.user.name}
                </Link>
              ) : (
                <span className="font-semibold text-brand-950">{member.user.name}</span>
              );
              return (
                <li
                  key={`${member.user.name}-${i}`}
                  className="flex flex-col gap-1 rounded-xl border border-line bg-surface p-4"
                >
                  <span className="flex items-center justify-between gap-2">
                    {name}
                    {member.isLead ? <Badge variant="bubble">{t("lead1")}</Badge> : null}
                  </span>
                  {profile?.isPublic && profile.headline ? (
                    <span className="text-small text-muted-foreground">{profile.headline}</span>
                  ) : null}
                  {member.chapter ? (
                    <span className="text-small text-muted-foreground">{member.chapter.name}</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground">{t("visibleEmpty")}</p>
        )}
      </section>
    </>
  );
}

export default function BubblePage({ params }: Props) {
  return (
    <div className="container-page flex flex-col gap-6 py-12">
      <Suspense
        fallback={
          <div className="flex flex-col gap-4" aria-hidden="true">
            <Skeleton className="h-12 w-1/2" />
            <Skeleton className="h-40 w-full" />
          </div>
        }
      >
        <BubbleView params={params} />
      </Suspense>
    </div>
  );
}
