import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { CheckIcon, GlobeIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { BubbleMap } from "@/components/community/bubble-map";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth/session";
import { listBubbles } from "@/lib/community/bubbles";
import { getFlags } from "@/lib/features";
import { Link } from "@/lib/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("bubbles");
  return { title: t("title"), description: t("lead") };
}

async function BubblesContent() {
  await connection();
  const user = await getSessionUser();
  const [t, locale, bubbles, flags] = await Promise.all([
    getTranslations("bubbles"),
    getLocale(),
    listBubbles(user?.id ?? null),
    getFlags(),
  ]);
  const regions = new Intl.DisplayNames([locale], { type: "region" });

  return (
    <>
      {flags.bubblesMap && bubbles.length ? <BubbleMap bubbles={bubbles} /> : null}
      <section aria-labelledby="bubble-list" className="flex flex-col gap-4">
        <h2 id="bubble-list" className="text-h3">
          {t("list")}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="bubble-list">
          {bubbles.map((bubble, i) => (
            <li
              key={bubble.id}
              className="animate-rise"
              style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
            >
              <Link
                href={`/bubbles/${bubble.slug}`}
                className="group flex h-full flex-col gap-2 rounded-2xl border border-line bg-surface p-5 shadow-card transition-transform duration-(--duration-micro) hover:-translate-y-0.5"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="font-heading text-body font-bold text-brand-950 group-hover:underline">
                    {bubble.name}
                  </span>
                  {bubble.joined ? (
                    <Badge variant="verified" className="gap-1">
                      <CheckIcon aria-hidden="true" className="size-3.5" />
                      {t("joinedBadge")}
                    </Badge>
                  ) : null}
                </span>
                <span className="text-small text-muted-foreground">
                  {t("country")}: {regions.of(bubble.countryCode) ?? bubble.countryCode}
                </span>
                <span className="mt-auto flex flex-wrap items-center justify-between gap-2 text-small">
                  <span className="font-semibold text-ink">
                    {bubble.count === null ? t("fewer") : t("count", { count: bubble.count })}
                  </span>
                  {bubble.isDemo ? <Badge variant="demo">{t("demo")}</Badge> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export default async function BubblesPage() {
  const t = await getTranslations("bubbles");
  return (
    <div className="container-page flex flex-col gap-10 py-12">
      <PageHeader icon={GlobeIcon} eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      <Suspense
        fallback={
          <div className="flex flex-col gap-6" aria-hidden="true">
            <Skeleton className="aspect-[2/1] w-full rounded-2xl" />
            <Skeleton className="h-32 w-full" />
          </div>
        }
      >
        <BubblesContent />
      </Suspense>
    </div>
  );
}
