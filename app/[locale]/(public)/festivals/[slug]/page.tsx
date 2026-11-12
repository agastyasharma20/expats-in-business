import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import {
  CalendarDaysIcon,
  HandHeartIcon,
  HelpCircleIcon,
  MapPinIcon,
  SparklesIcon,
  StoreIcon,
  TicketIcon,
  UsersIcon,
} from "lucide-react";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";

import { ActionButton } from "@/components/common/action-button";
import { Countdown } from "@/components/festivals/countdown";
import { FestivalJsonLd } from "@/components/festivals/festival-json-ld";
import { Programme } from "@/components/festivals/programme";
import { StallForm } from "@/components/festivals/stall-form";
import { TicketPicker } from "@/components/festivals/ticket-picker";
import { VolunteerShifts } from "@/components/festivals/volunteer-shifts";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getFestival } from "@/lib/festivals/queries";
import { Link } from "@/lib/i18n/navigation";
import { formatMoney } from "@/lib/money";
import { withdrawStall } from "@/server/actions/festivals";

type Props = PageProps<"/[locale]/festivals/[slug]">;

export const instant = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await getDb().event.findUnique({
    where: { slug },
    select: { title: true, summary: true, kind: true, status: true },
  });
  if (!event || event.kind !== "festival" || event.status === "draft") return {};
  return { title: event.title, description: event.summary };
}

function Section({
  id,
  title,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  icon: typeof TicketIcon;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-28 flex-col gap-5">
      <h2 id={`${id}-title`} className="flex items-center gap-3 text-h2">
        <span className="flex size-11 items-center justify-center rounded-xl bg-brand-100 text-brand-950">
          <Icon aria-hidden="true" className="size-6" />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

async function FestivalView({ params }: { params: Props["params"] }) {
  // Live availability and the viewer's ticket: always rendered at request time.
  await connection();
  const { slug } = await params;
  const user = await getSessionUser();
  const festival = await getFestival(slug, user?.id ?? null);
  if (!festival) notFound();
  const [t, format, locale] = await Promise.all([
    getTranslations("festival"),
    getFormatter(),
    getLocale(),
  ]);
  const money = (amountMinor: number) =>
    formatMoney({ amountMinor, currency: festival.chapter.currency }, locale, {
      hideZeroDecimals: true,
    });
  const tz = festival.chapter.timezone;
  const range = format.dateTimeRange(festival.startsAt, festival.endsAt, {
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
  });
  const cheapest = festival.tiers.reduce((min, x) => Math.min(min, x.priceMinor), Infinity);
  const upcoming = festival.startsAt > new Date() && festival.status === "published";
  const nav = [
    { id: "tickets", label: t("nav.tickets") },
    ...(festival.programme.length ? [{ id: "programme", label: t("nav.programme") }] : []),
    ...(festival.sponsorships.length ? [{ id: "partners", label: t("nav.partners") }] : []),
    ...(festival.volunteersOpen && festival.shifts.length
      ? [{ id: "volunteer", label: t("nav.volunteer") }]
      : []),
    ...(festival.stallsOpen ? [{ id: "stalls", label: t("nav.stalls") }] : []),
    ...(festival.faqs.length ? [{ id: "faq", label: t("nav.faq") }] : []),
  ];

  return (
    <>
      <FestivalJsonLd festival={festival} price={Number.isFinite(cheapest) ? cheapest : 0} />
      <header className="relative overflow-hidden bg-brand-950 text-on-dark">
        <div className="container-page grid gap-8 py-14 lg:grid-cols-[1fr_auto] lg:items-end lg:py-20">
          <div className="flex animate-rise flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="bubble" className="gap-1">
                <SparklesIcon aria-hidden="true" className="size-3.5" />
                {t("badge")}
              </Badge>
              {festival.isDemo ? <Badge variant="demo">{t("demo")}</Badge> : null}
              {festival.status === "cancelled" ? (
                <Badge variant="destructive">{t("cancelled")}</Badge>
              ) : null}
            </div>
            <h1 className="text-display-sm text-on-dark lg:text-display">{festival.title}</h1>
            {festival.tagline ? (
              <p className="max-w-2xl text-h3 font-normal text-on-dark-muted">{festival.tagline}</p>
            ) : null}
            <dl className="flex flex-wrap gap-x-8 gap-y-3 pt-2">
              <div className="flex items-center gap-2">
                <dt className="sr-only">{t("when")}</dt>
                <CalendarDaysIcon aria-hidden="true" className="size-5 text-on-dark-muted" />
                <dd className="font-semibold">{range}</dd>
              </div>
              {festival.venue ? (
                <div className="flex items-center gap-2">
                  <dt className="sr-only">{t("where")}</dt>
                  <MapPinIcon aria-hidden="true" className="size-5 text-on-dark-muted" />
                  <dd className="font-semibold">{festival.venue.name}</dd>
                </div>
              ) : null}
              <div className="flex items-center gap-2">
                <dt className="sr-only">{t("capacity")}</dt>
                <UsersIcon aria-hidden="true" className="size-5 text-on-dark-muted" />
                <dd className="font-semibold">
                  {t("placesLeft", { left: festival.eventLeft, capacity: festival.capacity })}
                </dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-col items-start gap-4 lg:items-end">
            {upcoming ? <Countdown startsAt={festival.startsAt.toISOString()} /> : null}
            <a href="#tickets" className={buttonVariants({ size: "lg", variant: "highlight" })}>
              <TicketIcon aria-hidden="true" />
              {Number.isFinite(cheapest) && cheapest > 0
                ? t("fromPrice", {
                    price: money(cheapest),
                  })
                : t("getTickets")}
            </a>
          </div>
        </div>
      </header>

      <nav
        aria-label={t("nav.label")}
        className="sticky top-[4.5rem] z-30 border-b border-line bg-surface/95 backdrop-blur"
      >
        <div className="container-page flex gap-1 overflow-x-auto py-2">
          {nav.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-small font-semibold text-ink hover:bg-brand-50"
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="container-page flex flex-col gap-16 py-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_26rem]">
          <section aria-labelledby="about-title" className="flex flex-col gap-4">
            <h2 id="about-title" className="text-h2">
              {t("about")}
            </h2>
            <p className="text-body whitespace-pre-line text-ink">{festival.description}</p>
          </section>
          <Section id="tickets" title={t("nav.tickets")} icon={TicketIcon}>
            {festival.ticket && festival.ticket.status !== "cancelled" ? (
              <div
                className="flex flex-col gap-3 rounded-2xl border-2 border-brand-700 bg-brand-50 p-5"
                data-testid="festival-ticket"
              >
                <p className="font-heading text-h3 font-bold text-brand-950">
                  {t(`ticketStatus.${festival.ticket.status}`, { count: festival.ticket.quantity })}
                </p>
                <Link
                  href={`/tickets/${festival.ticket.id}`}
                  className={buttonVariants({ className: "self-start" })}
                >
                  {t("viewTicket")}
                </Link>
              </div>
            ) : !upcoming ? (
              <p className="text-muted-foreground">{t("salesClosed")}</p>
            ) : user ? (
              <TicketPicker
                eventId={festival.id}
                maxPerOrder={festival.maxPerOrder}
                tiers={festival.tiers.map((x) => ({
                  id: x.id,
                  name: x.name,
                  description: x.description,
                  priceMinor: x.priceMinor,
                  currency: x.currency,
                  state: x.state,
                  left: x.left,
                  salesEndAt: x.salesEndAt?.toISOString() ?? null,
                }))}
              />
            ) : (
              <Link
                href={`/sign-in?next=${encodeURIComponent(`/festivals/${festival.slug}#tickets`)}`}
                className={buttonVariants({ size: "lg" })}
              >
                {t("signInToBuy")}
              </Link>
            )}
          </Section>
        </div>

        {festival.programme.length ? (
          <Section id="programme" title={t("nav.programme")} icon={CalendarDaysIcon}>
            <Programme items={festival.programme} timeZone={tz} />
          </Section>
        ) : null}

        {festival.sponsorships.length ? (
          <Section id="partners" title={t("nav.partners")} icon={SparklesIcon}>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {festival.sponsorships.map((s, i) => (
                <li
                  key={`${s.sponsor.name}-${i}`}
                  className="flex min-h-28 flex-col items-center justify-center gap-1 rounded-2xl border border-line bg-surface p-4 text-center"
                >
                  <span className="font-heading font-bold text-brand-950">{s.sponsor.name}</span>
                  <span className="text-small text-muted-foreground">
                    {t(`partnerTiers.${s.tier}`)}
                  </span>
                  {s.sponsor.isDemo ? <Badge variant="demo">{t("demoPartner")}</Badge> : null}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {festival.volunteersOpen && festival.shifts.length ? (
          <Section id="volunteer" title={t("nav.volunteer")} icon={HandHeartIcon}>
            <p className="max-w-2xl text-ink">{t("volunteerLead")}</p>
            <VolunteerShifts
              shifts={festival.shifts}
              timeZone={tz}
              signedIn={Boolean(user)}
              slug={festival.slug}
            />
          </Section>
        ) : null}

        {festival.stallsOpen ? (
          <Section id="stalls" title={t("nav.stalls")} icon={StoreIcon}>
            <p className="max-w-2xl text-ink">
              {t("stallLead")}{" "}
              {festival.stallFeeMinor
                ? t("stallFee", {
                    fee: money(festival.stallFeeMinor),
                  })
                : null}
            </p>
            {festival.stall && festival.stall.status !== "withdrawn" ? (
              <div
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-5"
                data-testid="stall-status"
              >
                <p className="font-semibold text-brand-950">
                  {t(`stallStatus.${festival.stall.status}`, { name: festival.stall.businessName })}
                </p>
                {["submitted", "waitlisted"].includes(festival.stall.status) ? (
                  <ActionButton
                    action={withdrawStall}
                    fields={{ eventId: festival.id }}
                    variant="ghost"
                    toasts={{ withdrawn: t("stallWithdrawn") }}
                  >
                    {t("withdraw")}
                  </ActionButton>
                ) : null}
              </div>
            ) : user ? (
              <StallForm eventId={festival.id} />
            ) : (
              <Link
                href={`/sign-in?next=${encodeURIComponent(`/festivals/${festival.slug}#stalls`)}`}
                className={buttonVariants({ variant: "outline", className: "self-start" })}
              >
                {t("signInToApply")}
              </Link>
            )}
          </Section>
        ) : null}

        {festival.faqs.length ? (
          <Section id="faq" title={t("nav.faq")} icon={HelpCircleIcon}>
            <div className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
              {festival.faqs.map((faq) => (
                <details key={faq.id} className="group p-5">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-heading font-bold text-brand-950">
                    {faq.question}
                    <span
                      aria-hidden="true"
                      className="text-h3 text-brand-700 transition-transform duration-(--duration-micro) group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="pt-2 whitespace-pre-line text-ink">{faq.answer}</p>
                </details>
              ))}
            </div>
          </Section>
        ) : null}
      </div>
    </>
  );
}

export default function FestivalPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div className="container-page flex flex-col gap-4 py-14" aria-hidden="true">
          <Skeleton className="h-64 w-full rounded-3xl" />
          <Skeleton className="h-40 w-full" />
        </div>
      }
    >
      <FestivalView params={params} />
    </Suspense>
  );
}
