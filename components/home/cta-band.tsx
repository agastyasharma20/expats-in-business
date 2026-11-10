import { getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

/** Final call to action on Deep Teal: the screen's single ember "highlight" button. */
export async function CtaBand() {
  const t = await getTranslations("home");
  return (
    <section aria-labelledby="cta-title" className="bg-brand-950 [--ring:var(--on-dark)]">
      <div className="container-page flex flex-col items-start gap-6 py-16 md:flex-row md:items-center md:justify-between">
        <div className="flex max-w-2xl flex-col gap-2">
          <h2 id="cta-title" className="text-h2 text-on-dark">
            {t("cta.title")}
          </h2>
          <p className="text-on-dark-muted">{t("cta.body")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/sign-in" className={buttonVariants({ variant: "highlight", size: "lg" })}>
            {t("join")}
          </Link>
          <Link
            href="/events"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "border-on-dark-muted bg-transparent text-on-dark hover:bg-brand-800",
            )}
          >
            {t("sessions")}
          </Link>
        </div>
      </div>
    </section>
  );
}
