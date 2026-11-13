import type { Metadata } from "next";
import { PartyPopperIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ActionForm } from "@/components/common/action-form";
import { PageHeader } from "@/components/layout/page-header";
import { controlStyles } from "@/components/ui/control-styles";
import { managedChapterWhere } from "@/lib/admin/scope";
import { requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { MAX_PER_ORDER_LIMIT } from "@/lib/festivals/rules";
import { cn } from "@/lib/utils";
import { createFestival } from "@/server/actions/festivals-admin";

// Session-bound page: blocking navigation is expected (no instant prerender).
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminFestivals");
  return { title: t("newTitle"), robots: { index: false } };
}

/** Step 1 of a festival: the essentials. Programme, tiers, volunteers and stalls follow in the console. */
export default async function NewFestivalPage() {
  const user = await requirePermission("event.manage");
  const t = await getTranslations("adminFestivals");
  const chapters = await getDb().chapter.findMany({
    where: managedChapterWhere(user),
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      currency: true,
      timezone: true,
      venues: { select: { id: true, name: true }, orderBy: { name: "asc" } },
    },
  });
  // Preselect a chapter that has venues: a launching chapter without one cannot host a festival yet.
  const defaultChapter = (chapters.find((c) => c.venues.length) ?? chapters[0])?.id;
  const field = "flex flex-col gap-1 font-semibold text-ink";
  const input = cn(controlStyles, "h-11");
  const errors = {
    default: t("errors.default"),
    venue: t("errors.venue"),
    past: t("errors.past"),
    dates: t("errors.dates"),
    rateLimited: t("errors.rateLimited"),
  };

  return (
    <div className="container-page flex max-w-3xl flex-col gap-8 py-10">
      <PageHeader icon={PartyPopperIcon} title={t("newTitle")} lead={t("newLead")} />
      <ActionForm
        action={createFestival}
        submitLabel={t("create")}
        pendingLabel={t("saving")}
        errorTexts={errors}
        className="rounded-2xl border border-line bg-surface p-6 shadow-card"
        testId="festival-builder"
      >
        <label className={field}>
          {t("fields.chapter")}
          <select name="chapterId" required defaultValue={defaultChapter} className={input}>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.currency}, {c.timezone})
              </option>
            ))}
          </select>
        </label>
        <label className={field}>
          {t("fields.title")}
          <input name="title" required minLength={3} maxLength={120} className={input} />
        </label>
        <label className={field}>
          {t("fields.tagline")}
          <input name="tagline" maxLength={160} className={input} />
        </label>
        <label className={field}>
          {t("fields.summary")}
          <input name="summary" required minLength={10} maxLength={200} className={input} />
        </label>
        <label className={field}>
          {t("fields.description")}
          <textarea
            name="description"
            rows={6}
            maxLength={8000}
            className={cn(controlStyles, "resize-y py-2.5")}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={field}>
            {t("fields.startDate")}
            <input type="date" name="startDate" required className={input} />
          </label>
          <label className={field}>
            {t("fields.startTime")}
            <input type="time" name="startTime" required defaultValue="12:00" className={input} />
          </label>
          <label className={field}>
            {t("fields.endDate")}
            <input type="date" name="endDate" required className={input} />
          </label>
          <label className={field}>
            {t("fields.endTime")}
            <input type="time" name="endTime" required defaultValue="22:00" className={input} />
          </label>
        </div>
        <label className={field}>
          {t("fields.venue")}
          <select name="venueId" required className={input}>
            {chapters.map((c) => (
              <optgroup key={c.id} label={c.name}>
                {c.venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={field}>
            {t("fields.capacity")}
            <input
              type="number"
              name="capacity"
              required
              min={10}
              max={100000}
              defaultValue={500}
              className={input}
            />
          </label>
          <label className={field}>
            {t("fields.maxPerOrder")}
            <input
              type="number"
              name="maxPerOrder"
              required
              min={1}
              max={MAX_PER_ORDER_LIMIT}
              defaultValue={6}
              className={input}
            />
          </label>
          <label className={field}>
            {t("fields.tierName")}
            <input
              name="tierName"
              required
              defaultValue={t("defaultTier")}
              maxLength={60}
              className={input}
            />
          </label>
          <label className={field}>
            {t("fields.tierPrice")}
            <input
              name="tierPrice"
              required
              inputMode="decimal"
              pattern="\d{1,6}([.,]\d{1,2})?"
              defaultValue="0"
              className={input}
            />
          </label>
        </div>
        <p className="text-small text-muted-foreground">{t("draftNote")}</p>
      </ActionForm>
    </div>
  );
}
