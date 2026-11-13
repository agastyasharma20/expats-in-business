import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { CrownIcon, HandHeartIcon, PartyPopperIcon, SparklesIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { RoleCard } from "@/components/growth/role-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { festivalsNeedingVolunteers, listOpenRoles } from "@/lib/growth/opportunities";
import { Link } from "@/lib/i18n/navigation";
import { withAlternates } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("volunteer");
  return withAlternates("/volunteer", { title: t("title"), description: t("lead") });
}

async function Opportunities() {
  await connection();
  const [t, format, festivals, roles] = await Promise.all([
    getTranslations("volunteer"),
    getFormatter(),
    festivalsNeedingVolunteers(),
    listOpenRoles(["volunteer"]),
  ]);
  return (
    <>
      <section aria-labelledby="fest-title" className="flex flex-col gap-4">
        <h2 id="fest-title" className="flex items-center gap-2 text-h2">
          <PartyPopperIcon aria-hidden="true" className="size-7 text-ember-600" />
          {t("festivalsTitle")}
        </h2>
        {festivals.length ? (
          <ul className="grid gap-4 md:grid-cols-2">
            {festivals.map((f) => {
              const open = f.shifts.reduce(
                (n, s) => n + Math.max(s.capacity - s._count.signups, 0),
                0,
              );
              return (
                <li key={f.slug}>
                  <Link
                    href={`/festivals/${f.slug}#volunteer`}
                    className="festival-ring festival-ring-lg flex"
                  >
                    <span className="flex w-full flex-col gap-2 rounded-[1.35rem] bg-surface p-5">
                      <span className="flex flex-wrap gap-1.5">
                        <Badge variant="bubble" className="gap-1">
                          <SparklesIcon aria-hidden="true" className="size-3.5" />
                          {t("festival")}
                        </Badge>
                        {f.isDemo ? <Badge variant="demo">{t("demo")}</Badge> : null}
                      </span>
                      <span className="font-heading text-h3 font-bold text-brand-950">
                        {f.title}
                      </span>
                      <span className="text-small text-muted-foreground">
                        {format.dateTime(f.startsAt, {
                          dateStyle: "full",
                          timeZone: f.chapter.timezone,
                        })}{" "}
                        · {f.chapter.name}
                      </span>
                      <span className="font-semibold text-brand-950">
                        {t("openShifts", { count: open })}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground">{t("noFestivals")}</p>
        )}
      </section>
      <section aria-labelledby="vroles-title" className="flex flex-col gap-4">
        <h2 id="vroles-title" className="flex items-center gap-2 text-h2">
          <HandHeartIcon aria-hidden="true" className="size-7 text-brand-700" />
          {t("rolesTitle")}
        </h2>
        {roles.length ? (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {roles.map((role, i) => (
              <RoleCard key={role.slug} role={role} index={i} />
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">{t("noRoles")}</p>
        )}
      </section>
    </>
  );
}

/** Volunteering hub: festival shifts, ongoing volunteer roles and the ambassador programme. */
export default async function VolunteerPage() {
  const t = await getTranslations("volunteer");
  return (
    <div className="flex flex-col">
      <header className="relative overflow-hidden bg-brand-950 text-on-dark">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-16 size-96 rounded-full bg-ember-500/20 blur-3xl"
        />
        <div className="container-page relative flex flex-col gap-5 py-16 lg:py-24">
          <p className="eyebrow text-on-dark-muted">{t("eyebrow")}</p>
          <h1 className="max-w-3xl text-display-sm text-on-dark lg:text-display">{t("title")}</h1>
          <p className="max-w-2xl text-h3 font-normal text-on-dark-muted">{t("lead")}</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/ambassadors"
              className={buttonVariants({ variant: "highlight", size: "lg" })}
            >
              <CrownIcon aria-hidden="true" />
              {t("ambassadorCta")}
            </Link>
            <Link href="/careers" className={buttonVariants({ variant: "secondary", size: "lg" })}>
              {t("careersCta")}
            </Link>
          </div>
        </div>
      </header>
      <div className="container-page flex flex-col gap-14 py-12">
        <ol className="grid gap-4 md:grid-cols-3" aria-label={t("howTitle")}>
          {(["pick", "meet", "grow"] as const).map((k, i) => (
            <li
              key={k}
              className="flex animate-rise gap-3 rounded-2xl border border-line bg-surface p-5"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-950 font-heading font-bold text-on-dark">
                {i + 1}
              </span>
              <span className="flex flex-col gap-1">
                <span className="font-bold text-brand-950">{t(`how.${k}.title`)}</span>
                <span className="text-small text-muted-foreground">{t(`how.${k}.text`)}</span>
              </span>
            </li>
          ))}
        </ol>
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <Opportunities />
        </Suspense>
      </div>
    </div>
  );
}
