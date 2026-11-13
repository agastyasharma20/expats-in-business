import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import {
  Building2Icon,
  CheckCircle2Icon,
  GlobeIcon,
  HandshakeIcon,
  MapIcon,
  MegaphoneIcon,
  SparklesIcon,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { ActionButton } from "@/components/common/action-button";
import { AmbassadorForm } from "@/components/growth/ambassador-form";
import { AmbassadorList } from "@/components/growth/ambassador-list";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth/session";
import { COUNTRY_CODES, LANGUAGE_CODES } from "@/lib/countries";
import { listAmbassadors, myAmbassadorApplications } from "@/lib/growth/queries";
import { placeLabel } from "@/lib/growth/rules";
import { Link } from "@/lib/i18n/navigation";
import { withAlternates } from "@/lib/seo";
import { withdrawAmbassador } from "@/server/actions/ambassadors";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ambassadors");
  return withAlternates("/ambassadors", { title: t("title"), description: t("lead") });
}

const TIERS = [
  { scope: "global", icon: GlobeIcon },
  { scope: "country", icon: MapIcon },
  { scope: "city", icon: Building2Icon },
] as const;

const STATUS_BADGE = {
  submitted: "unconfirmed",
  in_review: "secondary",
  accepted: "verified",
  waitlisted: "secondary",
  declined: "outline",
  withdrawn: "outline",
} as const;

async function Ambassadors() {
  await connection();
  const [t, list] = await Promise.all([getTranslations("ambassadors"), listAmbassadors()]);
  return list.length ? (
    <AmbassadorList ambassadors={list} />
  ) : (
    <p className="rounded-2xl border border-dashed border-line-strong bg-surface p-5 text-muted-foreground">
      {t("none")}
    </p>
  );
}

async function ApplyArea() {
  const [t, locale, user] = await Promise.all([
    getTranslations("ambassadors"),
    getLocale(),
    getSessionUser(),
  ]);
  if (!user) {
    return (
      <Link
        href={`/sign-in?next=${encodeURIComponent("/ambassadors#apply")}`}
        className={buttonVariants({ size: "lg", className: "self-start" })}
      >
        {t("signIn")}
      </Link>
    );
  }
  const mine = await myAmbassadorApplications(user.id);
  const regions = new Intl.DisplayNames([locale], { type: "region" });
  const languageNames = new Intl.DisplayNames([locale], { type: "language" });
  const countries = COUNTRY_CODES.map((c) => [c, regions.of(c) ?? c] as const).sort((a, b) =>
    a[1].localeCompare(b[1], locale),
  );
  const languages = LANGUAGE_CODES.slice(0, 24).map((c) => [c, languageNames.of(c) ?? c] as const);
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <AmbassadorForm countries={countries} languages={languages} />
      <aside className="flex flex-col gap-3">
        <h3 className="text-h3">{t("mine")}</h3>
        {mine.length ? (
          <ul className="flex flex-col gap-2" data-testid="my-ambassador-apps">
            {mine.map((a) => (
              <li
                key={a.id}
                className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3"
              >
                <span className="font-semibold text-brand-950">
                  {t(`tiers.${a.scope}.title`)} ·{" "}
                  {placeLabel(a, (c) => regions.of(c) ?? c, t("global"))}
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <Badge variant={STATUS_BADGE[a.status]}>{t(`status.${a.status}`)}</Badge>
                  {["submitted", "in_review", "waitlisted"].includes(a.status) ? (
                    <ActionButton
                      action={withdrawAmbassador}
                      fields={{ id: a.id }}
                      variant="ghost"
                      toasts={{ withdrawn: t("withdrawn") }}
                    >
                      {t("withdraw")}
                    </ActionButton>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-small text-muted-foreground">{t("noneMine")}</p>
        )}
      </aside>
    </div>
  );
}

/** The ambassador programme: three tiers, what ambassadors do, who they are, and the application. */
export default async function AmbassadorsPage() {
  const t = await getTranslations("ambassadors");
  return (
    <div className="flex flex-col">
      <header className="relative overflow-hidden bg-brand-950 text-on-dark">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-0 size-96 rounded-full bg-ember-500/15 blur-3xl"
        />
        <div className="container-page relative flex flex-col gap-5 py-16 lg:py-24">
          <Badge variant="bubble" className="gap-1 self-start">
            <SparklesIcon aria-hidden="true" className="size-3.5" />
            {t("eyebrow")}
          </Badge>
          <h1 className="max-w-3xl text-display-sm text-on-dark lg:text-display">{t("title")}</h1>
          <p className="max-w-2xl text-h3 font-normal text-on-dark-muted">{t("lead")}</p>
          <a
            href="#apply"
            className={buttonVariants({
              variant: "highlight",
              size: "lg",
              className: "self-start",
            })}
          >
            <MegaphoneIcon aria-hidden="true" />
            {t("cta")}
          </a>
        </div>
      </header>

      <div className="container-page flex flex-col gap-16 py-12">
        <section aria-labelledby="tiers-title" className="flex flex-col gap-6">
          <h2 id="tiers-title" className="text-h2">
            {t("tiersTitle")}
          </h2>
          <ul className="grid gap-5 md:grid-cols-3">
            {TIERS.map(({ scope, icon: Icon }, i) => (
              <li
                key={scope}
                className={
                  scope === "global"
                    ? "festival-ring festival-ring-lg animate-rise"
                    : "animate-rise rounded-3xl border border-line"
                }
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex h-full flex-col gap-4 rounded-[1.35rem] bg-surface p-6">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-950 text-on-dark">
                    <Icon aria-hidden="true" className="size-6" />
                  </span>
                  <h3 className="text-h3">{t(`tiers.${scope}.title`)}</h3>
                  <p className="text-ink">{t(`tiers.${scope}.text`)}</p>
                  <ul className="flex flex-col gap-2 text-small text-ink">
                    {(["1", "2", "3"] as const).map((n) => (
                      <li key={n} className="flex gap-2">
                        <CheckCircle2Icon
                          aria-hidden="true"
                          className="mt-0.5 size-4 shrink-0 text-success"
                        />
                        {t(`tiers.${scope}.do${n}`)}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="get-title"
          className="grid gap-6 rounded-3xl bg-brand-50 p-6 sm:p-8 md:grid-cols-3"
        >
          <h2 id="get-title" className="text-h2 md:col-span-3">
            {t("benefitsTitle")}
          </h2>
          {(["network", "skills", "impact"] as const).map((k) => (
            <div key={k} className="flex flex-col gap-2">
              <HandshakeIcon aria-hidden="true" className="size-6 text-brand-700" />
              <h3 className="text-body font-bold">{t(`benefits.${k}.title`)}</h3>
              <p className="text-small text-ink">{t(`benefits.${k}.text`)}</p>
            </div>
          ))}
        </section>

        <section aria-labelledby="who-title" className="flex flex-col gap-5">
          <h2 id="who-title" className="text-h2">
            {t("whoTitle")}
          </h2>
          <Suspense fallback={<Skeleton className="h-40 w-full" />}>
            <Ambassadors />
          </Suspense>
        </section>

        <section
          id="apply"
          aria-labelledby="apply-title"
          className="flex scroll-mt-28 flex-col gap-5 rounded-3xl border border-line bg-surface p-6 shadow-card sm:p-8"
        >
          <h2 id="apply-title" className="text-h2">
            {t("applyTitle")}
          </h2>
          <p className="max-w-2xl text-ink">{t("applyLead")}</p>
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <ApplyArea />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
