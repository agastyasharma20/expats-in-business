import { BuildingIcon, QuoteIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";

import { SectionHeading } from "./section-heading";

/** No partner names or logos until written permission exists (docs/FACTS.md). */
export async function PartnerPlaceholders() {
  const t = await getTranslations("home.partners");
  return (
    <section aria-labelledby="partners-title" className="container-page flex flex-col gap-8 py-16">
      <SectionHeading id="partners-title" title={t("title")} lead={t("lead")} />
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((n) => (
          <li
            key={n}
            className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong bg-surface p-4 text-center"
          >
            <BuildingIcon aria-hidden="true" className="size-6 text-ink-muted" />
            <span className="text-small text-muted-foreground">{t("tile")}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Clearly labelled placeholders; real quotes only with each member's permission. */
export async function TestimonialPlaceholders() {
  const t = await getTranslations("home.testimonials");
  return (
    <section aria-labelledby="testimonials-title" className="bg-surface">
      <div className="container-page flex flex-col gap-8 py-16">
        <SectionHeading id="testimonials-title" title={t("title")} />
        <ul className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <li key={n}>
              <figure className="flex h-full flex-col gap-4 rounded-xl border border-line bg-canvas p-6">
                <Badge variant="unconfirmed" className="self-start">
                  {t("label")}
                </Badge>
                <QuoteIcon aria-hidden="true" className="size-6 text-brand-500" />
                <blockquote className="flex-1 text-ink">{t("quote")}</blockquote>
                <figcaption className="text-small text-muted-foreground">{t("author")}</figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
