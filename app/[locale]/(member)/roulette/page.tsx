import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  CheckIcon,
  CoffeeIcon,
  GlobeIcon,
  MailIcon,
  MapPinIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { ActionButton } from "@/components/common/action-button";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { hasEntitlement } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { myMatches, rouletteScopes } from "@/lib/community/roulette-queries";
import { getFlags } from "@/lib/features";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import { respondRoulette, setRouletteOptIn } from "@/server/actions/roulette";

// Session-bound page: blocking navigation is expected (no instant prerender).
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("roulette");
  return { title: t("title"), robots: { index: false } };
}

const STATUS_BADGE = {
  proposed: "unconfirmed",
  confirmed: "verified",
  declined: "outline",
} as const;

export default async function RoulettePage() {
  const user = await requireUser("/roulette");
  if (!(await getFlags()).coffeeRoulette) notFound();
  const [t, format, scopes, matches] = await Promise.all([
    getTranslations("roulette"),
    getFormatter(),
    rouletteScopes(user.id),
    myMatches(user.id),
  ]);
  const priority = hasEntitlement(user, "roulette.priority");

  return (
    <div className="container-page flex flex-col gap-10 py-12">
      <PageHeader
        icon={CoffeeIcon}
        eyebrow={t("eyebrow")}
        title={t("title")}
        lead={t("lead")}
        actions={priority ? <Badge variant="founding">{t("priority")}</Badge> : null}
      />

      <ol className="grid gap-4 sm:grid-cols-3" aria-label={t("howTitle")}>
        {(["join", "match", "meet"] as const).map((step, i) => (
          <li
            key={step}
            className="flex animate-rise gap-3 rounded-2xl border border-line bg-surface p-5"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-950 font-heading font-bold text-on-dark">
              {i + 1}
            </span>
            <span className="flex flex-col gap-1">
              <span className="font-bold text-brand-950">{t(`how.${step}.title`)}</span>
              <span className="text-small text-muted-foreground">{t(`how.${step}.text`)}</span>
            </span>
          </li>
        ))}
      </ol>

      <section aria-labelledby="scopes-title" className="flex flex-col gap-4">
        <h2 id="scopes-title" className="text-h3">
          {t("optInTitle")}
        </h2>
        {scopes.length ? (
          <ul className="grid gap-3 sm:grid-cols-2" data-testid="roulette-scopes">
            {scopes.map((scope) => (
              <li
                key={scope.key}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-surface p-4",
                  scope.joined ? "border-brand-700 bg-brand-50" : "border-line",
                )}
              >
                <span className="flex items-center gap-3">
                  {scope.kind === "chapter" ? (
                    <UsersIcon aria-hidden="true" className="size-5 text-brand-700" />
                  ) : (
                    <GlobeIcon aria-hidden="true" className="size-5 text-brand-700" />
                  )}
                  <span className="flex flex-col">
                    <span className="font-semibold text-brand-950">
                      {scope.kind === "chapter"
                        ? t("chapter", { name: scope.name })
                        : t("bubble", { name: scope.name })}
                    </span>
                    <span className="text-small text-muted-foreground">
                      {scope.joined ? t("inScope") : t("notInScope")}
                    </span>
                  </span>
                </span>
                <ActionButton
                  action={setRouletteOptIn}
                  fields={{ scope: scope.key, join: scope.joined ? "false" : "true" }}
                  variant={scope.joined ? "ghost" : "default"}
                  toasts={{ joined: t("joined"), left: t("left") }}
                  errorText={t("error")}
                  testId="roulette-toggle"
                >
                  {scope.joined ? t("optOut") : t("optIn")}
                </ActionButton>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={CoffeeIcon}
            title={t("noScopesTitle")}
            description={t("noScopes")}
            headingLevel="h3"
            action={
              <Link href="/bubbles" className={buttonVariants()}>
                {t("browseBubbles")}
              </Link>
            }
          />
        )}
      </section>

      <section aria-labelledby="matches-title" className="flex flex-col gap-4">
        <h2 id="matches-title" className="text-h3">
          {t("matchesTitle")}
        </h2>
        {matches.length ? (
          <ul className="flex flex-col gap-4" data-testid="roulette-matches">
            {matches.map((match) => (
              <li
                key={match.id}
                className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-card"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-small font-semibold text-muted-foreground">
                    {t("week", {
                      date: format.dateTime(match.weekStart, {
                        dateStyle: "medium",
                        timeZone: "UTC",
                      }),
                    })}
                  </span>
                  <Badge variant={STATUS_BADGE[match.status]}>{t(`status.${match.status}`)}</Badge>
                </div>
                <ul className="flex flex-col gap-2">
                  {match.others.map((other) => (
                    <li key={other.name} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {other.slug ? (
                        <Link
                          href={`/members/${other.slug}`}
                          className="font-semibold text-brand-950 hover:underline"
                        >
                          {other.name}
                        </Link>
                      ) : (
                        <span className="font-semibold text-brand-950">{other.name}</span>
                      )}
                      {other.headline ? (
                        <span className="text-small text-muted-foreground">{other.headline}</span>
                      ) : null}
                      {other.email ? (
                        <a
                          href={`mailto:${other.email}`}
                          className="inline-flex min-h-11 items-center gap-1 text-small font-semibold text-primary hover:underline"
                        >
                          <MailIcon aria-hidden="true" className="size-4" />
                          {other.email}
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {match.cafe ? (
                  <p className="flex items-start gap-2 text-small text-ink">
                    <MapPinIcon
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-brand-700"
                    />
                    <span>
                      {t("cafe", { cafe: match.cafe })}
                      <br />
                      <span className="text-muted-foreground">{t("cafeNote")}</span>
                    </span>
                  </p>
                ) : null}
                {match.status === "proposed" && match.myAnswer === null ? (
                  <div className="flex flex-wrap gap-2">
                    <ActionButton
                      action={respondRoulette}
                      fields={{ matchId: match.id, decision: "accept" }}
                      variant="default"
                      toasts={{ accepted: t("accepted") }}
                      testId="roulette-accept"
                    >
                      <CheckIcon aria-hidden="true" />
                      {t("accept")}
                    </ActionButton>
                    <ActionButton
                      action={respondRoulette}
                      fields={{ matchId: match.id, decision: "decline" }}
                      variant="ghost"
                      toasts={{ declined: t("declinedToast") }}
                    >
                      <XIcon aria-hidden="true" />
                      {t("decline")}
                    </ActionButton>
                  </div>
                ) : match.status === "proposed" ? (
                  <p className="text-small text-muted-foreground">{t("you.accepted")}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-line-strong bg-surface p-5 text-muted-foreground">
            {t("noMatches")}
          </p>
        )}
      </section>
    </div>
  );
}
