import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import {
  CalendarDaysIcon,
  HandHeartIcon,
  HelpCircleIcon,
  SparklesIcon,
  StoreIcon,
  TicketIcon,
} from "lucide-react";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";

import { FestivalHero, FestivalHeroSkeleton } from "@/components/festivals/festival-hero";
import { FestivalJsonLd } from "@/components/festivals/festival-json-ld";
import { Programme } from "@/components/festivals/programme";
import { FestivalSection } from "@/components/festivals/section";
import { StallPanel, TicketsPanel, VolunteerPanel } from "@/components/festivals/viewer-panels";
import { faqData, JsonLd } from "@/components/seo/json-ld";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getFestivalPublic } from "@/lib/festivals/queries";
import { formatMoney } from "@/lib/money";
import { withAlternates } from "@/lib/seo";

type Props = PageProps<"/[locale]/festivals/[slug]">;

export const instant = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const festival = await getFestivalPublic(slug);
  if (!festival) return {};
  return withAlternates(`/festivals/${slug}`, {
    title: festival.title,
    description: festival.summary,
  });
}

/**
 * Festival page. Public content comes from a shared cache (fast first paint); the three parts that
 * depend on who is looking (ticket, volunteer shifts, stall application) stream in afterwards in
 * their own Suspense boundaries.
 */
async function FestivalView({ params }: { params: Props["params"] }) {
  await connection();
  const { slug } = await params;
  const festival = await getFestivalPublic(slug);
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
  const range = format.dateTimeRange(festival.startsAt, festival.endsAt, {
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: festival.chapter.timezone,
  });
  const cheapest = festival.tiers.reduce((min, x) => Math.min(min, x.priceMinor), Infinity);
  const upcoming = festival.startsAt > new Date() && festival.status === "published";
  const showVolunteer = festival.volunteersOpen && festival.shifts.length > 0;
  const nav = [
    { id: "tickets", label: t("nav.tickets") },
    ...(festival.programme.length ? [{ id: "programme", label: t("nav.programme") }] : []),
    ...(festival.sponsorships.length ? [{ id: "partners", label: t("nav.partners") }] : []),
    ...(showVolunteer ? [{ id: "volunteer", label: t("nav.volunteer") }] : []),
    ...(festival.stallsOpen ? [{ id: "stalls", label: t("nav.stalls") }] : []),
    ...(festival.faqs.length ? [{ id: "faq", label: t("nav.faq") }] : []),
  ];

  return (
    <>
      <FestivalJsonLd festival={festival} price={Number.isFinite(cheapest) ? cheapest : 0} />
      {festival.faqs.length ? <JsonLd data={faqData(festival.faqs)} /> : null}
      <FestivalHero
        festival={festival}
        range={range}
        upcoming={upcoming}
        ctaLabel={
          Number.isFinite(cheapest) && cheapest > 0
            ? t("fromPrice", { price: money(cheapest) })
            : t("getTickets")
        }
      />

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
          <FestivalSection id="tickets" title={t("nav.tickets")} icon={TicketIcon}>
            <Suspense fallback={<Skeleton className="h-80 w-full rounded-2xl" />}>
              <TicketsPanel festival={festival} />
            </Suspense>
          </FestivalSection>
        </div>

        {festival.programme.length ? (
          <FestivalSection id="programme" title={t("nav.programme")} icon={CalendarDaysIcon}>
            <Programme items={festival.programme} timeZone={festival.chapter.timezone} />
          </FestivalSection>
        ) : null}

        {festival.sponsorships.length ? (
          <FestivalSection id="partners" title={t("nav.partners")} icon={SparklesIcon}>
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
          </FestivalSection>
        ) : null}

        {showVolunteer ? (
          <FestivalSection id="volunteer" title={t("nav.volunteer")} icon={HandHeartIcon}>
            <p className="max-w-2xl text-ink">{t("volunteerLead")}</p>
            <Suspense fallback={<Skeleton className="h-64 w-full rounded-2xl" />}>
              <VolunteerPanel festival={festival} />
            </Suspense>
          </FestivalSection>
        ) : null}

        {festival.stallsOpen ? (
          <FestivalSection id="stalls" title={t("nav.stalls")} icon={StoreIcon}>
            <p className="max-w-2xl text-ink">
              {t("stallLead")}{" "}
              {festival.stallFeeMinor
                ? t("stallFee", { fee: money(festival.stallFeeMinor) })
                : null}
            </p>
            <Suspense fallback={<Skeleton className="h-72 w-full rounded-2xl" />}>
              <StallPanel festival={festival} />
            </Suspense>
          </FestivalSection>
        ) : null}

        {festival.faqs.length ? (
          <FestivalSection id="faq" title={t("nav.faq")} icon={HelpCircleIcon}>
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
          </FestivalSection>
        ) : null}
      </div>
    </>
  );
}

export default function FestivalPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <>
          <FestivalHeroSkeleton />
          {/* At least one screen tall, so the footer is below the fold and does not jump down
              when the page body streams in (layout shift of 0.48 before this). */}
          <div aria-hidden="true" className="container-page min-h-svh py-12">
            <Skeleton className="h-80 w-full rounded-2xl" />
          </div>
        </>
      }
    >
      <FestivalView params={params} />
    </Suspense>
  );
}
