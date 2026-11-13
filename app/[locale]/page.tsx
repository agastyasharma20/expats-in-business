import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { FestivalSpotlightBanner } from "@/components/festivals/spotlight";
import { BubblesTeaser } from "@/components/home/bubbles-teaser";
import { ChaptersStrip } from "@/components/home/chapters-strip";
import { CtaBand } from "@/components/home/cta-band";
import { Hero } from "@/components/home/hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { PartnerPlaceholders, TestimonialPlaceholders } from "@/components/home/placeholders";
import { StatsStrip } from "@/components/home/stats-strip";
import { UpcomingEvents } from "@/components/home/upcoming-events";
import { OrganizationJsonLd } from "@/components/seo/organization-json-ld";
import { withAlternates } from "@/lib/seo";

/**
 * Homepage, rendered on the server from the database through cached queries (lib/home/queries.ts),
 * so it prerenders as a static shell. Section order follows brief 3J.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return withAlternates("/", { title: { absolute: t("title") }, description: t("description") });
}

export default function HomePage() {
  return (
    <>
      <OrganizationJsonLd baseUrl={process.env.APP_URL ?? "http://localhost:3000"} />
      <Hero />
      <Suspense fallback={null}>
        <FestivalSpotlightBanner />
      </Suspense>
      <StatsStrip />
      <UpcomingEvents />
      <HowItWorks />
      <BubblesTeaser />
      <ChaptersStrip />
      <PartnerPlaceholders />
      <TestimonialPlaceholders />
      <CtaBand />
    </>
  );
}
