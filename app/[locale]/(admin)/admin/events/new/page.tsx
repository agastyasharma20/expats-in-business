import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ActionForm, Toggle } from "@/components/common/action-form";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { managedChapterWhere } from "@/lib/admin/scope";
import { requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { addDays, utcToZoned } from "@/lib/time";
import { createEvent } from "@/server/actions/events-admin";

export const metadata: Metadata = { robots: { index: false } };

const selectClass =
  "min-h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export default async function NewEventPage() {
  const user = await requirePermission("admin.access");
  const db = getDb();
  const [t, chapters, formats] = await Promise.all([
    getTranslations("adminEvents.builder"),
    db.chapter.findMany({
      where: { ...managedChapterWhere(user), status: { in: ["live", "launching"] } },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        timezone: true,
        currency: true,
        venues: { select: { id: true, name: true }, orderBy: { name: "asc" } },
      },
    }),
    db.eventFormat.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, defaultDurationMin: true },
    }),
  ]);
  const first = chapters[0];
  if (!first) return <p className="container-page py-12">{t("errors.default")}</p>;
  // Default: same weekday next week, 18:00 local, in the first chapter's zone.
  const next = utcToZoned(addDays(new Date(), 7), first.timezone);
  const date = `${next.year}-${String(next.month).padStart(2, "0")}-${String(next.day).padStart(2, "0")}`;

  return (
    <div className="container-page flex max-w-3xl flex-col gap-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1">{t("title")}</h1>
        <p className="text-muted-foreground">{t("lead", { zone: first.timezone })}</p>
      </header>
      <ActionForm
        action={createEvent}
        submitLabel={t("create")}
        pendingLabel={t("creating")}
        errorTexts={{
          default: t("errors.default"),
          past: t("errors.past"),
          venue: t("errors.venue"),
        }}
        className="rounded-xl border border-line bg-surface p-6 shadow-card"
        testId="event-builder"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="chapterId" label={t("chapter")} required>
            {(props) => (
              <select {...props} name="chapterId" defaultValue={first.id} className={selectClass}>
                {chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field id="formatId" label={t("format")} required>
            {(props) => (
              <select {...props} name="formatId" className={selectClass}>
                {formats.map((f) => (
                  <option
                    key={f.id}
                    value={f.id}
                  >{`${f.name} (${f.defaultDurationMin} min)`}</option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <Field id="title" label={t("titleField")} required>
          {(props) => <Input {...props} name="title" required minLength={3} maxLength={120} />}
        </Field>
        <Field id="summary" label={t("summary")} hint={t("summaryHint")} required>
          {(props) => <Input {...props} name="summary" required minLength={10} maxLength={200} />}
        </Field>
        <Field id="description" label={t("description")}>
          {(props) => <Textarea {...props} name="description" rows={5} maxLength={5000} />}
        </Field>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field id="date" label={t("date")} required>
            {(props) => <Input {...props} type="date" name="date" required defaultValue={date} />}
          </Field>
          <Field id="start" label={t("start")} required>
            {(props) => <Input {...props} type="time" name="start" required defaultValue="18:00" />}
          </Field>
          <Field id="duration" label={t("duration")} hint={t("durationHint")}>
            {(props) => (
              <Input {...props} type="number" name="duration" min={15} max={720} step={15} />
            )}
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="venueId" label={t("venue")}>
            {(props) => (
              <select {...props} name="venueId" className={selectClass}>
                <option value="">—</option>
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
            )}
          </Field>
          <Field id="onlineUrl" label={t("onlineUrl")}>
            {(props) => <Input {...props} type="url" name="onlineUrl" placeholder="https://" />}
          </Field>
        </div>
        <Toggle name="online" label={t("online")} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="capacity" label={t("capacity")} required>
            {(props) => (
              <Input
                {...props}
                type="number"
                name="capacity"
                required
                min={1}
                max={5000}
                defaultValue={40}
              />
            )}
          </Field>
          <Field
            id="price"
            label={t("price", { currency: first.currency })}
            hint={t("priceHint")}
            required
          >
            {(props) => (
              <Input
                {...props}
                type="number"
                name="price"
                required
                min={0}
                step="0.01"
                defaultValue={0}
              />
            )}
          </Field>
        </div>
        <Toggle name="publish" label={t("publish")} defaultChecked />
      </ActionForm>
    </div>
  );
}
