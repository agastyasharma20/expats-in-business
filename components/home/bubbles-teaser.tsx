import { GlobeIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getBubbleTeasers } from "@/lib/home/queries";
import { Link } from "@/lib/i18n/navigation";

import { SectionHeading } from "./section-heading";

/** Bubbles with 5+ members only (smaller groups are hidden to protect privacy). */
export async function BubblesTeaser() {
  const t = await getTranslations("home.bubbles");
  const stats = await getTranslations("home.stats");
  const bubbles = await getBubbleTeasers(8);
  const demo = bubbles.some((b) => b.isDemo);

  return (
    <section aria-labelledby="bubbles-title" className="container-page flex flex-col gap-8 py-16">
      <SectionHeading
        id="bubbles-title"
        title={t("title")}
        lead={t("lead")}
        action={
          <Link href="/bubbles" className={buttonVariants({ variant: "outline" })}>
            {t("explore")}
          </Link>
        }
      />
      {bubbles.length ? (
        <>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {bubbles.map((bubble) => (
              <li
                key={bubble.slug}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4"
              >
                {/* Country code instead of a flag emoji: flags do not render on Windows. */}
                <span
                  aria-hidden="true"
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ember-50 font-heading font-bold text-ember-600"
                >
                  {bubble.originCountryCode}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-heading font-bold text-brand-950">
                    {bubble.name}
                  </span>
                  <span className="text-small text-muted-foreground">
                    {t("members", { count: bubble.members })}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="flex flex-wrap items-center gap-3 text-small text-muted-foreground">
            {demo ? <Badge variant="demo">{stats("demoTag")}</Badge> : null}
            {t("hiddenNote")}
          </p>
        </>
      ) : (
        <EmptyState
          icon={GlobeIcon}
          headingLevel="h3"
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Link href="/sign-in" className={buttonVariants()}>
              {t("explore")}
            </Link>
          }
        />
      )}
    </section>
  );
}
