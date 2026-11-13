import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { chapterHealth } from "@/lib/admin/metrics";

type Chapter = { id: string; name: string; status: string };

/** Per-chapter health table on the command centre: members, sessions, check-ins and leads. */
export async function ChapterHealth({ chapters }: { chapters: Chapter[] }) {
  const [t, health] = await Promise.all([
    getTranslations("admin"),
    chapterHealth(chapters.map((c) => c.id)),
  ]);
  return (
    <section aria-labelledby="health-title" className="flex flex-col gap-4">
      <h2 id="health-title" className="text-h3">
        {t("health.title")}
      </h2>
      <div
        className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-card"
        tabIndex={0}
        role="region"
        aria-labelledby="health-title"
      >
        <table className="w-full min-w-[36rem] text-left text-small" data-testid="chapter-health">
          <thead className="bg-canvas text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t("health.chapter")}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t("health.status")}
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                {t("health.members")}
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                {t("health.sessions")}
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                {t("health.checkIns")}
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                {t("health.leads")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {chapters.map((chapter) => {
              const row = health.find((h) => h.id === chapter.id)!;
              return (
                <tr key={chapter.id}>
                  <th scope="row" className="px-4 py-3 font-semibold text-brand-950">
                    {chapter.name}
                  </th>
                  <td className="px-4 py-3">
                    <Badge variant={chapter.status === "live" ? "verified" : "unconfirmed"}>
                      {t(`health.statuses.${chapter.status}`)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.members}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.sessions}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.checkIns}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.leads || (
                      <span className="font-semibold text-danger">{t("health.noLead")}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
