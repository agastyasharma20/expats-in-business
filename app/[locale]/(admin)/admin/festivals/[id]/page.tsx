import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DownloadIcon, ExternalLinkIcon, QrCodeIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";

import { TiersTab } from "@/components/admin/festival/content-tabs";
import { StallsTab, VolunteersTab } from "@/components/admin/festival/people-tabs";
import { ActionButton } from "@/components/common/action-button";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getFestivalAdmin } from "@/lib/festivals/queries";
import { grossRevenue, launchChecklist } from "@/lib/festivals/rules";
import { Link } from "@/lib/i18n/navigation";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { setFestivalStatus } from "@/server/actions/festivals-admin";
import { PartnersTab } from "@/components/admin/festival/partners-tab";
import { LaunchChecklist } from "@/components/admin/festival/launch-checklist";
import { ProgrammeTab } from "@/components/admin/festival/programme-tab";
import { SettingsTab } from "@/components/admin/festival/settings-tab";

type Props = PageProps<"/[locale]/admin/festivals/[id]">;

export const instant = false;
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const event = await getDb().event.findUnique({ where: { id }, select: { title: true } });
  return { title: event?.title, robots: { index: false } };
}

const TABS = [
  "overview",
  "tickets",
  "programme",
  "volunteers",
  "stalls",
  "partners",
  "settings",
] as const;
const tabSchema = z.enum(TABS).catch("overview");

async function Console({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const user = await requirePermission("event.manage");
  const data = await getFestivalAdmin(id, user);
  if (!data) notFound();
  const tab = tabSchema.parse(query.tab);
  const [t, locale] = await Promise.all([getTranslations("adminFestivals"), getLocale()]);
  const { event } = data;
  const soldTotal = [...data.sold.values()].reduce((a, b) => a + b, 0);
  const revenue = grossRevenue(
    data.tickets.map((x) => ({ ...x, priceMinor: x.ticketType.priceMinor })),
  );
  const volunteers = event.shifts.reduce((n, s) => n + s.signups.length, 0);
  const volunteerSlots = event.shifts.reduce((n, s) => n + s.capacity, 0);
  const checklist = launchChecklist({
    description: event.description,
    tagline: event.tagline,
    hasVenue: Boolean(event.venue),
    tiers: event.ticketTypes.length,
    programme: event.programme.length,
    faqs: event.faqs.length,
    partners: event.sponsorships.length,
    shifts: event.shifts.length,
    volunteersOpen: event.volunteersOpen,
    published: event.status === "published",
  });
  const stats = [
    { key: "sold", value: `${soldTotal} / ${event.capacity}` },
    {
      key: "revenue",
      value: formatMoney({ amountMinor: revenue, currency: event.chapter.currency }, locale),
    },
    { key: "checkedIn", value: String(data.checkedIn) },
    { key: "waitlist", value: String(data.waitlisted) },
    { key: "volunteers", value: `${volunteers} / ${volunteerSlots}` },
    { key: "stalls", value: String(event.stalls.filter((s) => s.status === "submitted").length) },
  ];
  const statusActions =
    event.status === "published"
      ? [
          { status: "draft", label: t("unpublish"), variant: "outline" as const },
          { status: "cancelled", label: t("cancel"), variant: "destructive" as const },
        ]
      : event.status === "draft"
        ? [{ status: "published", label: t("publish"), variant: "default" as const }]
        : [{ status: "draft", label: t("restore"), variant: "outline" as const }];

  return (
    <>
      <PageHeader
        eyebrow={`${event.chapter.name} · ${t(`status.${event.status}`)}`}
        title={event.title}
        lead={event.tagline ?? undefined}
        actions={
          <>
            {statusActions.map((a) =>
              a.status === "cancelled" ? (
                // Cancelling affects every ticket holder: it needs a second, deliberate click.
                <details key={a.status} className="relative">
                  <summary
                    className={buttonVariants({ variant: "outline", className: "list-none" })}
                  >
                    {a.label}…
                  </summary>
                  <div className="absolute right-0 z-20 mt-2 flex w-72 flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-raised">
                    <p className="text-small text-ink">{t("cancelConfirm")}</p>
                    <ActionButton
                      action={setFestivalStatus}
                      fields={{ eventId: event.id, status: a.status }}
                      variant="destructive"
                      toasts={{ cancelled: t("statusToast.cancelled") }}
                      testId="festival-cancelled"
                    >
                      {t("cancelYes")}
                    </ActionButton>
                  </div>
                </details>
              ) : (
                <ActionButton
                  key={a.status}
                  action={setFestivalStatus}
                  fields={{ eventId: event.id, status: a.status }}
                  variant={a.variant}
                  size="default"
                  toasts={{ [a.status]: t(`statusToast.${a.status}`) }}
                  errorText={t("errors.noTiers")}
                  testId={`festival-${a.status}`}
                >
                  {a.label}
                </ActionButton>
              ),
            )}
            {event.status !== "draft" ? (
              <Link
                href={`/festivals/${event.slug}`}
                className={buttonVariants({ variant: "outline" })}
              >
                <ExternalLinkIcon aria-hidden="true" />
                {t("viewPublic")}
              </Link>
            ) : null}
            <Link
              href={`/admin/events/${event.id}/check-in`}
              className={buttonVariants({ variant: "outline" })}
            >
              <QrCodeIcon aria-hidden="true" />
              {t("checkIn")}
            </Link>
            <a
              href={`/api/admin/festivals/${event.id}/attendees`}
              download
              className={buttonVariants({ variant: "outline" })}
            >
              <DownloadIcon aria-hidden="true" />
              {t("attendees")}
            </a>
          </>
        }
      />

      <dl
        className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"
        data-testid="festival-stats"
      >
        {stats.map((s, i) => (
          <div
            key={s.key}
            className="flex animate-rise flex-col gap-1 rounded-2xl border border-line bg-surface p-4 shadow-card"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <dt className="text-small text-muted-foreground">{t(`stats.${s.key}`)}</dt>
            <dd className="font-heading text-h3 font-bold text-brand-950 tabular-nums">
              {s.value}
            </dd>
          </div>
        ))}
      </dl>

      <nav
        aria-label={t("tabsLabel")}
        className="-mx-1 flex gap-1 overflow-x-auto border-b border-line px-1"
      >
        {TABS.map((key) => (
          <Link
            key={key}
            href={`/admin/festivals/${event.id}?tab=${key}`}
            aria-current={tab === key ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center border-b-2 px-3 text-small font-semibold",
              tab === key
                ? "border-brand-700 text-brand-950"
                : "border-transparent text-ink hover:text-brand-950",
            )}
          >
            {t(`tabs.${key}`)}
          </Link>
        ))}
      </nav>

      {tab === "overview" ? <LaunchChecklist checklist={checklist} /> : null}
      {tab === "tickets" ? <TiersTab data={data} /> : null}
      {tab === "programme" ? <ProgrammeTab data={data} /> : null}
      {tab === "volunteers" ? <VolunteersTab data={data} /> : null}
      {tab === "stalls" ? <StallsTab data={data} /> : null}
      {tab === "partners" ? <PartnersTab data={data} /> : null}
      {tab === "settings" ? <SettingsTab data={data} /> : null}
      {event.isDemo ? (
        <Badge variant="demo" className="self-start">
          {t("demo")}
        </Badge>
      ) : null}
    </>
  );
}

export default function FestivalConsolePage({ params, searchParams }: Props) {
  return (
    <div className="container-page flex flex-col gap-6 py-10">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Console params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
