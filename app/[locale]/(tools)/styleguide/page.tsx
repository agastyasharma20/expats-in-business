import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { ButtonsSection } from "@/components/styleguide/buttons-section";
import { BadgesSection, CardsSection } from "@/components/styleguide/cards-badges-section";
import { ContrastSection } from "@/components/styleguide/contrast-section";
import { FeedbackSection } from "@/components/styleguide/feedback-section";
import { FormsSection } from "@/components/styleguide/forms-section";
import { MotionSection } from "@/components/styleguide/motion-section";
import { PaletteSection } from "@/components/styleguide/palette-section";
import { TypeSection } from "@/components/styleguide/type-section";
import { areDevToolsEnabled } from "@/lib/dev-tools";

const sectionIds = [
  "palette",
  "contrast",
  "type",
  "buttons",
  "cards",
  "badges",
  "forms",
  "feedback",
  "motion",
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("styleguide");
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function StyleguidePage() {
  if (!areDevToolsEnabled()) notFound();
  const t = await getTranslations("styleguide");

  return (
    <div className="container-page flex flex-col gap-16 py-12">
      <header className="flex flex-col gap-4">
        <p className="eyebrow text-brand-700">{t("eyebrow")}</p>
        <h1 className="text-display-sm md:text-display">{t("title")}</h1>
        <p className="max-w-3xl text-muted-foreground">{t("intro")}</p>
        <Badge variant="demo">{t("devOnly")}</Badge>
        <nav aria-label={t("nav")}>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {sectionIds.map((id) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
                >
                  {t(`sections.${id}`)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <PaletteSection />
      <ContrastSection />
      <TypeSection />
      <ButtonsSection />
      <CardsSection />
      <BadgesSection />
      <FormsSection />
      <FeedbackSection />
      <MotionSection />
    </div>
  );
}
