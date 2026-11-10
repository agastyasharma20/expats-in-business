import { CalendarDaysIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/common/empty-state";
import { ExternalLink } from "@/components/common/external-link";
import { EventCard } from "@/components/events/event-card";
import { buttonVariants } from "@/components/ui/button";
import { getFact } from "@/config/facts";
import { getUpcomingEvents } from "@/lib/home/queries";
import { Link } from "@/lib/i18n/navigation";

import { SectionHeading } from "./section-heading";

export async function UpcomingEvents() {
  const t = await getTranslations("home.events");
  const events = await getUpcomingEvents(3);

  return (
    <section aria-labelledby="events-title" className="container-page flex flex-col gap-8 py-16">
      <SectionHeading
        id="events-title"
        title={t("title")}
        lead={t("lead")}
        action={
          <Link href="/events" className={buttonVariants({ variant: "outline" })}>
            {t("all")}
          </Link>
        }
      />
      {events.length ? (
        <ul className="grid gap-6 md:grid-cols-3">
          {events.map((event) => (
            <li key={event.id}>
              <EventCard event={event} href="/events" />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={CalendarDaysIcon}
          headingLevel="h3"
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <ExternalLink
              href={getFact("community.whatsapp").value}
              className={`${buttonVariants()} no-underline`}
            >
              {t("emptyAction")}
            </ExternalLink>
          }
        />
      )}
    </section>
  );
}
