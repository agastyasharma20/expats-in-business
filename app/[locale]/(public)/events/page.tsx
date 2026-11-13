import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import { CalendarDaysIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/common/empty-state";
import { EventCard } from "@/components/events/event-card";
import { FilterChips } from "@/components/events/filter-chips";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listEvents, listFormats } from "@/lib/events/queries";
import { Link } from "@/lib/i18n/navigation";
import { withAlternates } from "@/lib/seo";

type Props = PageProps<"/[locale]/events">;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("events");
  return withAlternates("/events", { title: t("title"), description: t("lead") });
}

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function EventResults({ searchParams }: { searchParams: Props["searchParams"] }) {
  // "Upcoming" depends on the current time: render at request time (no prerender of new Date()).
  await connection();
  const params = await searchParams;
  const when = one(params.when) === "past" ? "past" : "upcoming";
  const formats = await listFormats();
  const format = formats.find((f) => f.slug === one(params.format))?.slug;
  const [t, events] = await Promise.all([getTranslations("events"), listEvents({ when, format })]);
  const href = (next: { when?: string; format?: string }) => {
    const query = new URLSearchParams();
    const w = next.when ?? when;
    const f = "format" in next ? next.format : format;
    if (w === "past") query.set("when", "past");
    if (f) query.set("format", f);
    const qs = query.toString();
    return qs ? `/events?${qs}` : "/events";
  };

  return (
    <>
      <nav aria-label={t("filters")} className="flex flex-col gap-3">
        <FilterChips
          items={[
            {
              label: t("upcoming"),
              href: href({ when: "upcoming" }),
              current: when === "upcoming",
            },
            { label: t("past"), href: href({ when: "past" }), current: when === "past" },
          ]}
        />
        <FilterChips
          items={[
            { label: t("allFormats"), href: href({ format: undefined }), current: !format },
            ...formats.map((f) => ({
              label: f.name,
              href: href({ format: f.slug }),
              current: f.slug === format,
            })),
          ]}
        />
      </nav>
      {events.length ? (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" data-testid="event-list">
          {events.map((event) => (
            <li key={event.id} className="flex [&>*]:w-full">
              <EventCard event={event} href={`/events/${event.slug}`} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={CalendarDaysIcon}
          title={t("emptyTitle")}
          description={when === "upcoming" ? t("emptyUpcoming") : t("emptyPast")}
          action={
            <Link href="/events" className={buttonVariants()}>
              {t("clearFilters")}
            </Link>
          }
        />
      )}
    </>
  );
}

export default async function EventsPage({ searchParams }: Props) {
  const t = await getTranslations("events");
  return (
    <div className="container-page flex flex-col gap-8 py-12">
      <header className="flex flex-col items-start gap-3">
        <h1 className="text-h1">{t("title")}</h1>
        <p className="max-w-2xl text-muted-foreground">{t("lead")}</p>
        <Link
          href="/events/formats"
          className={buttonVariants({ variant: "link", size: "inline" })}
        >
          {t("formatsLink")}
        </Link>
        <Link href="/festivals" className={buttonVariants({ variant: "link", size: "inline" })}>
          {t("festivalsLink")}
        </Link>
      </header>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <EventResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
