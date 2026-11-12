import type { Metadata } from "next";
import { CalendarPlusIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/common/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { listManagedEvents } from "@/lib/admin/events";
import { requirePermission } from "@/lib/auth/session";
import { Link } from "@/lib/i18n/navigation";
import { formatInZone } from "@/lib/time";

// Session-bound page: blocking navigation is expected (no instant prerender).
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminEvents");
  return { title: t("title"), robots: { index: false } };
}

export default async function AdminEventsPage() {
  const user = await requirePermission("admin.access");
  const [t, locale] = await Promise.all([getTranslations("adminEvents"), getLocale()]);
  const events = await listManagedEvents(user);
  const newButton = (
    <Link href="/admin/events/new" className={buttonVariants()}>
      <CalendarPlusIcon aria-hidden="true" />
      {t("new")}
    </Link>
  );
  return (
    <div className="container-page flex flex-col gap-8 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">{t("title")}</h1>
          <p className="text-muted-foreground">{t("lead")}</p>
        </div>
        {newButton}
      </header>
      {events.length ? (
        <ul
          className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface"
          data-testid="admin-events"
        >
          {events.map((event) => (
            <li key={event.id} className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
              <div className="flex min-w-60 flex-1 flex-col">
                <span className="font-semibold text-brand-950">{event.title}</span>
                <span className="text-small text-muted-foreground">
                  {formatInZone(event.startsAt, event.chapter.timezone, locale)} ·{" "}
                  {event.chapter.name} · {t("going", { count: event._count.tickets })}
                  {event.status !== "published" ? ` · ${event.status}` : ""}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/admin/events/${event.id}/check-in`}
                  className={buttonVariants({ size: "sm" })}
                >
                  {t("checkIn")}
                </Link>
                <Link
                  href={`/admin/events/${event.id}/pulse`}
                  className={buttonVariants({ size: "sm", variant: "outline" })}
                >
                  {t("pulse")}
                </Link>
                {event.status === "published" ? (
                  <Link
                    href={`/events/${event.slug}`}
                    className={buttonVariants({ size: "sm", variant: "ghost" })}
                  >
                    {t("view")}
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={CalendarPlusIcon}
          title={t("title")}
          description={t("empty")}
          action={newButton}
        />
      )}
    </div>
  );
}
