import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";

import { HeroArt } from "./hero-art";

/** 60ms stagger for the CSS entrances. */
const delay = (index: number) => ({ animationDelay: `${index * 60}ms` });

/**
 * Hero. Entrances are CSS keyframes, so everything is visible on first paint without waiting for
 * JavaScript. The h1 is the LCP element: it rises (transform only) and never fades.
 */
export async function Hero() {
  const t = await getTranslations("home");

  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden bg-surface">
      <div className="container-page relative z-10 flex flex-col items-start gap-6 pt-14 pb-44 md:pt-20 md:pb-60 lg:pb-72">
        <p className="eyebrow animate-rise text-brand-700" style={delay(0)}>
          {t("eyebrow")}
        </p>
        <h1
          id="hero-title"
          className="max-w-3xl animate-rise-move text-display-sm md:text-display"
          style={delay(1)}
        >
          {t("title")}
        </h1>
        <p
          className="max-w-2xl animate-rise text-lg leading-8 text-muted-foreground"
          style={delay(2)}
        >
          {t("lead")}
        </p>
        <div className="flex animate-rise flex-wrap gap-3" style={delay(3)}>
          <Link href="/sign-in" className={buttonVariants({ size: "lg" })}>
            {t("join")}
          </Link>
          <Link href="/events" className={buttonVariants({ size: "lg", variant: "outline" })}>
            {t("sessions")}
          </Link>
        </div>
      </div>
      {/* Country panorama for the visitor's chapter; streams in and draws itself (no layout shift: absolutely positioned). */}
      <Suspense>
        <HeroArt className="pointer-events-none absolute inset-x-0 bottom-0 text-brand-500/70" />
      </Suspense>
    </section>
  );
}
