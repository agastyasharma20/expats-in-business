import { CalendarDaysIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { ListPage } from "@/components/member/list-page";
import { requireUser } from "@/lib/auth/session";
import { getMyTickets } from "@/lib/member/queries";
import { formatInZone } from "@/lib/time";

// Session-bound page: blocking navigation is expected (no instant prerender).
export const instant = false;

export default async function MyEventsPage() {
  const user = await requireUser("/my/events");
  const [t, d, locale, tickets] = await Promise.all([
    getTranslations("dashboard.myEvents"),
    getTranslations("dashboard"),
    getLocale(),
    getMyTickets(user.id),
  ]);
  return (
    <ListPage
      title={t("title")}
      icon={CalendarDaysIcon}
      items={tickets.map((ticket) => ({
        id: ticket.id,
        title: ticket.event.title,
        meta: `${formatInZone(ticket.event.startsAt, ticket.event.chapter.timezone, locale)} · ${ticket.checkIn ? t("checkedIn") : t("confirmed")}`,
      }))}
      empty={{ text: t("empty"), actionLabel: d("findEvent"), actionHref: "/events" }}
    />
  );
}
