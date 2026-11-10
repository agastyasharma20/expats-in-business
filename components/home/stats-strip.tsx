import { getTranslations } from "next-intl/server";

import { StatCounter } from "@/components/motion/stat-counter";
import { Badge } from "@/components/ui/badge";
import { getFact } from "@/config/facts";
import { getCommunityCounts } from "@/lib/home/queries";

type Stat = { value: number; suffix?: string; label: string; demo: boolean };

/**
 * "35+ sessions" comes from the facts registry (verified). Counts read from the database are
 * tagged "Demo data" while the database holds seeded demo records.
 */
export async function StatsStrip() {
  const t = await getTranslations("home.stats");
  const counts = await getCommunityCounts();
  const sessions = getFact("org.sessionsHeld").value;

  const stats: Stat[] = [
    {
      value: Number.parseInt(sessions, 10),
      suffix: sessions.replace(/^\d+/, ""),
      label: t("sessions"),
      demo: false,
    },
    { value: counts.liveChapters, label: t("chapters"), demo: false },
    { value: counts.members, label: t("members"), demo: counts.demo },
    { value: counts.bubbles, label: t("bubbles"), demo: counts.demo },
  ];

  return (
    <section aria-labelledby="stats-title" className="border-y border-line bg-brand-50">
      <h2 id="stats-title" className="sr-only">
        {t("title")}
      </h2>
      <dl className="container-page grid grid-cols-2 gap-x-6 gap-y-8 py-10 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-1">
            <dt className="order-2 text-small font-semibold text-muted-foreground">{stat.label}</dt>
            <dd className="order-1 font-heading text-display-sm font-bold text-brand-950">
              <StatCounter value={stat.value} suffix={stat.suffix} />
            </dd>
            {stat.demo ? (
              <dd className="order-3">
                <Badge variant="demo">{t("demoTag")}</Badge>
              </dd>
            ) : null}
          </div>
        ))}
      </dl>
    </section>
  );
}
