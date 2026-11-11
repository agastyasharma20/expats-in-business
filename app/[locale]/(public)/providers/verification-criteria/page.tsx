import type { Metadata } from "next";
import { BadgeCheckIcon, InfoIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { VERIFICATION_CRITERIA } from "@/config/verification";
import { Link } from "@/lib/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("criteria");
  return { title: t("title"), description: t("lead") };
}

/** Published criteria: the same list the admin checklist uses (config/verification.ts). */
export default async function CriteriaPage() {
  const t = await getTranslations("criteria");
  return (
    <div className="container-page flex max-w-3xl flex-col gap-8 py-12">
      <header className="flex flex-col gap-3">
        <h1 className="text-h1">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("lead")}</p>
      </header>
      <ol className="flex flex-col gap-4" data-testid="criteria">
        {VERIFICATION_CRITERIA.map((criterion, index) => (
          <li
            key={criterion.id}
            className="flex gap-4 rounded-xl border border-line bg-surface p-5 shadow-card"
          >
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-100 font-heading font-bold text-brand-950"
            >
              {index + 1}
            </span>
            <div className="flex flex-col gap-1">
              <h2 className="flex items-center gap-2 text-h3">
                <BadgeCheckIcon aria-hidden="true" className="size-5 text-brand-700" />
                {t(`${criterion.titleKey}.title`)}
              </h2>
              <p className="text-ink">{t(`${criterion.titleKey}.body`)}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="flex gap-3 rounded-lg border border-warning/40 bg-warning-50 p-4 text-warning">
        <InfoIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        {t("notGuarantee")}
      </p>
      <Link href="/providers?verified=1" className={buttonVariants({ className: "self-start" })}>
        {t("browse")}
      </Link>
    </div>
  );
}
