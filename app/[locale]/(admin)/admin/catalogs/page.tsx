import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { LibraryIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ActionForm, Toggle } from "@/components/common/action-form";
import { Panel } from "@/components/dashboard/panel";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { controlStyles } from "@/components/ui/control-styles";
import { isAdmin } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { fromMinorUnits } from "@/lib/money";
import { cn } from "@/lib/utils";
import { saveCategory, saveFormat, savePlan } from "@/server/actions/catalogs";

// Session-bound page: blocking navigation is expected (no instant prerender).
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminCatalogs");
  return { title: t("title"), robots: { index: false } };
}

const input = cn(controlStyles, "h-11");
const field = "flex flex-col gap-1 text-small font-semibold text-ink";

/** "The truth without a deploy": formats, provider categories and plan prices, all audited. */
export default async function CatalogsPage() {
  const user = await requirePermission("admin.access");
  if (!isAdmin(user)) forbidden();
  const db = getDb();
  const [t, formats, categories, plans] = await Promise.all([
    getTranslations("adminCatalogs"),
    db.eventFormat.findMany({ orderBy: { sortOrder: "asc" } }),
    db.providerCategory.findMany({ orderBy: { sortOrder: "asc" } }),
    db.plan.findMany({ orderBy: [{ sortOrder: "asc" }, { code: "asc" }] }),
  ]);
  const errors = {
    default: t("errors.default"),
    exists: t("errors.exists"),
    rateLimited: t("errors.rateLimited"),
  };
  const common = {
    submitLabel: t("save"),
    pendingLabel: t("saving"),
    successText: t("saved"),
    errorTexts: errors,
    submitVariant: "outline" as const,
  };

  return (
    <div className="container-page flex flex-col gap-8 py-10">
      <PageHeader icon={LibraryIcon} title={t("title")} lead={t("lead")} />

      <Panel id="plans" title={t("plans")} icon={LibraryIcon} testId="catalog-plans">
        <p className="text-small text-muted-foreground">{t("plansNote")}</p>
        <ul className="flex flex-col gap-3">
          {plans.map((plan) => (
            <li key={plan.id} className="rounded-xl border border-line p-4">
              <ActionForm action={savePlan} {...common} className="gap-3 lg:flex-row lg:items-end">
                <input type="hidden" name="id" value={plan.id} />
                <span className="flex min-w-48 flex-col">
                  <span className="font-semibold text-brand-950">{plan.name}</span>
                  <span className="text-small text-muted-foreground">
                    {plan.code} · {plan.interval ?? t("oneOff")}
                  </span>
                  <Badge
                    variant={plan.priceStatus === "approved" ? "verified" : "unconfirmed"}
                    className="mt-1 self-start"
                  >
                    {t(`priceStatus.${plan.priceStatus}`)}
                  </Badge>
                </span>
                <label className={field}>
                  {t("amount", { currency: plan.currency })}
                  <input
                    name="amount"
                    required
                    inputMode="decimal"
                    defaultValue={String(fromMinorUnits(plan.amountMinor, plan.currency))}
                    className={input}
                  />
                </label>
                <label className={field}>
                  {t("status")}
                  <select name="priceStatus" defaultValue={plan.priceStatus} className={input}>
                    <option value="proposal">{t("priceStatus.proposal")}</option>
                    <option value="approved">{t("priceStatus.approved")}</option>
                  </select>
                </label>
                <Toggle name="isActive" label={t("active")} defaultChecked={plan.isActive} />
              </ActionForm>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel id="formats" title={t("formats")} icon={LibraryIcon}>
          <ul className="flex flex-col gap-3">
            {[...formats, null].map((f) => (
              <li key={f?.id ?? "new"} className="rounded-xl border border-line p-4">
                <ActionForm action={saveFormat} {...common} submitLabel={f ? t("save") : t("add")}>
                  {f ? (
                    <input type="hidden" name="id" value={f.id} />
                  ) : (
                    <p className="font-semibold text-brand-950">{t("newFormat")}</p>
                  )}
                  <div className="grid gap-3 sm:grid-cols-[1fr_7rem_5rem]">
                    <label className={field}>
                      {t("name")}
                      <input
                        name="name"
                        required
                        defaultValue={f?.name ?? ""}
                        maxLength={60}
                        className={input}
                      />
                    </label>
                    <label className={field}>
                      {t("minutes")}
                      <input
                        name="defaultDurationMin"
                        type="number"
                        required
                        min={15}
                        max={720}
                        defaultValue={f?.defaultDurationMin ?? 120}
                        className={input}
                      />
                    </label>
                    <label className={field}>
                      {t("order")}
                      <input
                        name="sortOrder"
                        type="number"
                        min={0}
                        max={99}
                        defaultValue={f?.sortOrder ?? formats.length}
                        className={input}
                      />
                    </label>
                  </div>
                  <label className={field}>
                    {t("description")}
                    <textarea
                      name="description"
                      required
                      minLength={10}
                      maxLength={400}
                      rows={2}
                      defaultValue={f?.description ?? ""}
                      className={cn(controlStyles, "resize-y py-2.5")}
                    />
                  </label>
                </ActionForm>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel id="categories" title={t("categories")} icon={LibraryIcon}>
          <ul className="flex flex-col gap-3">
            {[...categories, null].map((c) => (
              <li key={c?.id ?? "new"} className="rounded-xl border border-line p-4">
                <ActionForm
                  action={saveCategory}
                  {...common}
                  submitLabel={c ? t("save") : t("add")}
                  className="gap-3 sm:flex-row sm:items-end"
                >
                  {c ? <input type="hidden" name="id" value={c.id} /> : null}
                  <label className={cn(field, "flex-1")}>
                    {c ? t("name") : t("newCategory")}
                    <input
                      name="name"
                      required
                      defaultValue={c?.name ?? ""}
                      maxLength={60}
                      className={input}
                    />
                  </label>
                  <label className={field}>
                    {t("order")}
                    <input
                      name="sortOrder"
                      type="number"
                      min={0}
                      max={99}
                      defaultValue={c?.sortOrder ?? categories.length}
                      className={cn(input, "w-20")}
                    />
                  </label>
                </ActionForm>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
