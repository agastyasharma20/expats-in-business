import { ClockIcon, MapPinIcon, MicIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { programmeByDay, stagesOf } from "@/lib/festivals/rules";

type Item = {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  stage: string | null;
  performer: string | null;
  startsAt: Date;
  endsAt: Date;
};

/** Programme by day (chapter timezone) with day jump links; plain HTML, works without JS. */
export async function Programme({ items, timeZone }: { items: Item[]; timeZone: string }) {
  const [t, format] = await Promise.all([getTranslations("festival"), getFormatter()]);
  const days = programmeByDay(items, timeZone);
  const stages = stagesOf(items);
  const time = (d: Date) => format.dateTime(d, { hour: "2-digit", minute: "2-digit", timeZone });
  const dayLabel = (day: string) =>
    format.dateTime(new Date(`${day}T12:00:00Z`), {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    });

  return (
    <div className="flex flex-col gap-6">
      {days.length > 1 ? (
        <nav aria-label={t("days")} className="flex flex-wrap gap-2">
          {days.map(({ day }) => (
            <a
              key={day}
              href={`#day-${day}`}
              className="inline-flex min-h-11 items-center rounded-full border border-line-strong bg-surface px-4 text-small font-semibold text-ink hover:border-brand-700"
            >
              {dayLabel(day)}
            </a>
          ))}
        </nav>
      ) : null}
      {stages.length ? (
        <p className="text-small text-muted-foreground">
          {t("stages", { list: stages.join(" · ") })}
        </p>
      ) : null}
      {days.map(({ day, items: list }) => (
        <section
          key={day}
          id={`day-${day}`}
          aria-labelledby={`day-${day}-title`}
          className="flex scroll-mt-28 flex-col gap-3"
        >
          <h3 id={`day-${day}-title`} className="text-h3">
            {dayLabel(day)}
          </h3>
          <ol className="flex flex-col gap-3">
            {list.map((item) => (
              <li
                key={item.id}
                className="grid gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card sm:grid-cols-[8rem_1fr]"
              >
                <p className="flex items-center gap-2 font-heading font-bold text-brand-950 tabular-nums sm:flex-col sm:items-start sm:gap-0">
                  <ClockIcon aria-hidden="true" className="size-4 text-brand-700 sm:hidden" />
                  <time dateTime={item.startsAt.toISOString()}>{time(item.startsAt)}</time>
                  <span className="text-small font-normal text-muted-foreground">
                    – <time dateTime={item.endsAt.toISOString()}>{time(item.endsAt)}</time>
                  </span>
                </p>
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-heading text-body font-bold text-brand-950">
                      {item.title}
                    </span>
                    <Badge variant="secondary">{t(`kinds.${item.kind}`)}</Badge>
                  </div>
                  {item.performer ? (
                    <p className="flex items-center gap-1.5 text-small text-ink">
                      <MicIcon aria-hidden="true" className="size-4 text-brand-700" />
                      {item.performer}
                    </p>
                  ) : null}
                  {item.stage ? (
                    <p className="flex items-center gap-1.5 text-small text-muted-foreground">
                      <MapPinIcon aria-hidden="true" className="size-4" />
                      {item.stage}
                    </p>
                  ) : null}
                  {item.description ? (
                    <p className="text-small text-ink">{item.description}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
