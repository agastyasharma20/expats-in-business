import type { Metadata } from "next";
import { PartyPopperIcon, PlusIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/session";
import { listManagedFestivals } from "@/lib/festivals/queries";
import { Link } from "@/lib/i18n/navigation";

// Session-bound page: blocking navigation is expected (no instant prerender).
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminFestivals");
  return { title: t("title"), robots: { index: false } };
}

const STATUS = { draft: "unconfirmed", published: "verified", cancelled: "destructive" } as const;

export default async function AdminFestivalsPage() {
  const user = await requirePermission("event.manage");
  const [t, format, festivals] = await Promise.all([
    getTranslations("adminFestivals"),
    getFormatter(),
    listManagedFestivals(user),
  ]);
  const newButton = (
    <Link href="/admin/festivals/new" className={buttonVariants()}>
      <PlusIcon aria-hidden="true" />
      {t("new")}
    </Link>
  );

  return (
    <div className="container-page flex flex-col gap-8 py-10">
      <PageHeader icon={PartyPopperIcon} title={t("title")} lead={t("lead")} actions={newButton} />
      {festivals.length ? (
        <ul className="grid gap-4 md:grid-cols-2" data-testid="admin-festivals">
          {festivals.map((f) => {
            const pct = Math.min(100, Math.round((f.taken / f.capacity) * 100));
            return (
              <li key={f.id}>
                <Link
                  href={`/admin/festivals/${f.id}`}
                  className="flex h-full flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-card transition-transform duration-(--duration-micro) hover:-translate-y-0.5"
                >
                  <span className="flex flex-wrap items-start justify-between gap-2">
                    <span className="flex flex-col">
                      <span className="font-heading text-body font-bold text-brand-950">
                        {f.title}
                      </span>
                      <span className="text-small text-muted-foreground">
                        {format.dateTime(f.startsAt, {
                          dateStyle: "medium",
                          timeZone: f.chapter.timezone,
                        })}{" "}
                        · {f.chapter.name}
                      </span>
                    </span>
                    <span className="flex gap-1.5">
                      <Badge variant={STATUS[f.status]}>{t(`status.${f.status}`)}</Badge>
                      {f._count.stalls ? (
                        <Badge variant="bubble">
                          {t("pendingStalls", { count: f._count.stalls })}
                        </Badge>
                      ) : null}
                    </span>
                  </span>
                  <span className="flex flex-col gap-1.5">
                    <span
                      className="h-2.5 overflow-hidden rounded-full bg-brand-50"
                      aria-hidden="true"
                    >
                      <span
                        className="block h-full rounded-full bg-brand-700"
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <span className="text-small text-ink tabular-nums">
                      {t("sold", { taken: f.taken, capacity: f.capacity, pct })}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          icon={PartyPopperIcon}
          title={t("emptyTitle")}
          description={t("emptyText")}
          action={newButton}
        />
      )}
    </div>
  );
}
