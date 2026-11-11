import { CheckIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ActionForm } from "@/components/common/action-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { PricingPlan } from "@/lib/billing/plans";
import { Link } from "@/lib/i18n/navigation";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { subscribe } from "@/server/actions/billing";

/** Equal-height plan card: price, who it is for, features, one clear action. */
export async function PlanCard({ plan, locale }: { plan: PricingPlan; locale: string }) {
  const t = await getTranslations("pricing");
  const money = (amountMinor: number) =>
    formatMoney({ amountMinor, currency: plan.currency }, locale, { hideZeroDecimals: true });
  const popular = plan.tier === "plus";

  let price: React.ReactNode = t("free");
  if (plan.contactOnly) price = t("from", { price: money(plan.amountMinor) });
  else if (plan.amountMinor > 0) {
    price = (
      <>
        {money(plan.amountMinor)}
        <span className="text-base font-semibold text-muted-foreground">
          {" "}
          {plan.interval === "year" ? t("perYear") : t("perMonth")}
        </span>
      </>
    );
  }

  return (
    <article
      className={cn(
        "flex w-full flex-col gap-5 rounded-2xl border bg-surface p-6 shadow-card",
        popular ? "border-brand-700 ring-1 ring-brand-700" : "border-line",
      )}
      data-testid={`plan-${plan.code}`}
    >
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-h3">{plan.name}</h2>
          {popular ? <Badge>{t("popular")}</Badge> : null}
        </div>
        <p className="text-small text-muted-foreground">{t(`tiers.${plan.tier}`)}</p>
      </header>
      <p className="font-heading text-h2 font-bold text-brand-950">{price}</p>
      {plan.perLeadFeeMinor ? (
        <p className="-mt-3 text-small text-muted-foreground">
          {t("perLead", { fee: money(plan.perLeadFeeMinor) })}
        </p>
      ) : null}
      <ul className="flex flex-1 flex-col gap-2">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-small text-ink">
            <CheckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-700" />
            {t.has(`features.${feature}`)
              ? t(`features.${feature}` as "features.profile")
              : feature}
          </li>
        ))}
      </ul>
      {plan.contactOnly ? (
        <Link href="/pricing/corporate" className={buttonVariants({ variant: "outline" })}>
          {t("contact")}
        </Link>
      ) : plan.amountMinor === 0 ? (
        <Link href="/sign-in" className={buttonVariants({ variant: "outline" })}>
          {t("join")}
        </Link>
      ) : (
        <ActionForm
          action={subscribe}
          submitLabel={t("choose", { plan: plan.name })}
          pendingLabel={t("processing")}
          errorTexts={{ default: t("errors.default"), unavailable: t("errors.unavailable") }}
          submitVariant={popular ? "default" : "outline"}
          className="[&_button]:w-full"
        >
          <input type="hidden" name="plan" value={plan.code} />
        </ActionForm>
      )}
    </article>
  );
}
