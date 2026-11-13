import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";

import { ActionForm } from "@/components/common/action-form";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { ENTITLED_STATUSES } from "@/lib/billing/rules";
import { getDb } from "@/lib/db";
import { Link } from "@/lib/i18n/navigation";
import { formatMoney } from "@/lib/money";
import { getStripe } from "@/lib/stripe";
import { openBillingPortal, setCancelAtPeriodEnd } from "@/server/actions/billing";

// Session-bound page: blocking navigation is expected (no instant prerender).
export const instant = false;

type Props = PageProps<"/[locale]/settings/billing">;

async function StatusNotice({ searchParams }: { searchParams: Props["searchParams"] }) {
  const status = (await searchParams).status;
  if (status !== "simulated" && status !== "success") return null;
  const t = await getTranslations("billing");
  return status === "simulated" ? (
    <p role="status" className="rounded-lg border border-warning/40 bg-warning-50 p-4 text-warning">
      {t("simulated")}
    </p>
  ) : (
    <p role="status" className="rounded-lg border border-success/40 bg-success-50 p-4 text-success">
      {t("success")}
    </p>
  );
}

export default async function BillingSettingsPage({ searchParams }: Props) {
  const user = await requireUser("/settings/billing");
  const [t, p, s, locale] = await Promise.all([
    getTranslations("billing"),
    getTranslations("pricing"),
    getTranslations("settings"),
    getLocale(),
  ]);
  const sub = await getDb().subscription.findFirst({
    where: { userId: user.id, status: { in: [...ENTITLED_STATUSES] } },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  });
  const date = (d: Date | null) =>
    d ? new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(d) : "";

  return (
    <div className="flex flex-col gap-6" data-testid="billing">
      <Suspense>
        <StatusNotice searchParams={searchParams} />
      </Suspense>
      <section className="flex flex-col items-start gap-3 rounded-xl border border-line bg-surface p-6">
        {sub ? (
          <>
            <h2 className="text-h3">{t("current", { plan: sub.plan.name })}</h2>
            <p className="text-ink">
              {formatMoney(
                { amountMinor: sub.plan.amountMinor, currency: sub.plan.currency },
                locale,
                { hideZeroDecimals: true },
              )}{" "}
              {sub.plan.interval === "year" ? p("perYear") : p("perMonth")}
            </p>
            <p className="text-muted-foreground">
              {sub.cancelAtPeriodEnd
                ? t("ends", { date: date(sub.currentPeriodEnd) })
                : t("renews", { date: date(sub.currentPeriodEnd) })}
            </p>
            <div className="flex flex-wrap gap-3">
              <ActionForm
                action={setCancelAtPeriodEnd}
                submitLabel={sub.cancelAtPeriodEnd ? t("resume") : t("cancel")}
                pendingLabel={s("saving")}
                successText={sub.cancelAtPeriodEnd ? t("resumed") : t("cancelled")}
                errorTexts={{ default: s("error") }}
                submitVariant={sub.cancelAtPeriodEnd ? "default" : "outline"}
                testId="cancel-plan"
              >
                <input
                  type="hidden"
                  name="cancel"
                  value={sub.cancelAtPeriodEnd ? "false" : "true"}
                />
              </ActionForm>
              {sub.stripeSubscriptionId && getStripe() ? (
                <ActionForm
                  action={openBillingPortal}
                  submitLabel={t("manage")}
                  pendingLabel={s("saving")}
                  errorTexts={{ default: s("error") }}
                  submitVariant="ghost"
                >
                  {null}
                </ActionForm>
              ) : null}
              <Link href="/pricing" className={buttonVariants({ variant: "ghost" })}>
                {t("change")}
              </Link>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-h3">{t("current", { plan: "Community" })}</h2>
            <p className="text-muted-foreground">{t("community")}</p>
            <Link href="/pricing" className={buttonVariants()}>
              {t("seePlans")}
            </Link>
          </>
        )}
      </section>
    </div>
  );
}
