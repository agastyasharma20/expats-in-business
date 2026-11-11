import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { PlanCard } from "@/components/pricing/plan-card";
import { getPlans, type PricingPlan } from "@/lib/billing/plans";
import { monthsSaved, plansForInterval } from "@/lib/billing/rules";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pricing");
  return { title: t("title"), description: t("lead") };
}

const FAQ = ["vat", "cancel", "methods"] as const;

function PlanGrid({
  plans,
  locale,
  className,
}: {
  plans: PricingPlan[];
  locale: string;
  className: string;
}) {
  return (
    <ul className={className}>
      {plans.map((plan) => (
        <li key={plan.code} className="flex">
          <PlanCard plan={plan} locale={locale} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Plans come from the Plan table (proposed prices, labelled). Static page: the billing-period switch
 * is two radio buttons and CSS (:has), so it works without JavaScript and keeps the page fast.
 */
export default async function PricingPage() {
  const [t, locale, plans] = await Promise.all([
    getTranslations("pricing"),
    getLocale(),
    getPlans(),
  ]);
  const plus = (interval: "month" | "year") =>
    plans.find((p) => p.tier === "plus" && p.interval === interval);
  const saved = monthsSaved(plus("month")?.amountMinor ?? 0, plus("year")?.amountMinor ?? 0);
  const grid = "grid gap-6 md:grid-cols-2 xl:grid-cols-4";

  return (
    <div className="container-page flex flex-col gap-10 py-12">
      <header className="flex max-w-3xl flex-col gap-3">
        <h1 className="text-h1">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("lead")}</p>
        <p
          role="note"
          className="rounded-lg border border-warning/40 bg-warning-50 px-4 py-3 text-small font-semibold text-warning"
          data-testid="pricing-banner"
        >
          {t("banner")}
        </p>
      </header>

      <div className="group/billing flex flex-col gap-8">
        <fieldset className="flex flex-wrap items-center gap-3">
          <legend className="sr-only">{t("billing")}</legend>
          <div className="inline-flex rounded-full border border-line-strong bg-surface p-1">
            {(["month", "year"] as const).map((interval) => (
              <label
                key={interval}
                className="relative inline-flex min-h-11 cursor-pointer items-center rounded-full px-5 font-semibold text-brand-950 has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"
              >
                <input
                  type="radio"
                  name="billing"
                  id={`bill-${interval}`}
                  value={interval}
                  defaultChecked={interval === "month"}
                  className="sr-only"
                />
                {interval === "month" ? t("monthly") : t("yearly")}
              </label>
            ))}
          </div>
          {saved > 0 ? (
            <span className="text-small font-semibold text-brand-700">{t("yearlySave")}</span>
          ) : null}
        </fieldset>

        <PlanGrid
          plans={plansForInterval(plans, "month")}
          locale={locale}
          className={`${grid} group-has-[#bill-year:checked]/billing:hidden`}
        />
        <PlanGrid
          plans={plansForInterval(plans, "year")}
          locale={locale}
          className={`${grid} hidden group-has-[#bill-year:checked]/billing:grid`}
        />
      </div>

      <section aria-labelledby="pricing-faq" className="flex max-w-3xl flex-col gap-2">
        <h2 id="pricing-faq" className="text-h3">
          {t("faqTitle")}
        </h2>
        {FAQ.map((key) => (
          <details key={key} className="rounded-xl border border-line bg-surface px-4">
            <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-brand-950">
              {t(`faq.${key}.q`)}
            </summary>
            <p className="pb-4 text-muted-foreground">{t(`faq.${key}.a`)}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
