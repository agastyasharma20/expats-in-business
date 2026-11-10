import { MapPinIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getChapterStrip } from "@/lib/home/queries";
import { Link } from "@/lib/i18n/navigation";

import { SectionHeading } from "./section-heading";

export async function ChaptersStrip() {
  const t = await getTranslations("home.chapters");
  const stats = await getTranslations("home.stats");
  const { chapters, topRequests } = await getChapterStrip();

  return (
    <section aria-labelledby="chapters-title" className="bg-brand-50">
      <div className="container-page flex flex-col gap-8 py-16">
        <SectionHeading id="chapters-title" title={t("title")} lead={t("lead")} />
        <ul className="grid gap-4 md:grid-cols-3">
          {chapters.map((chapter) => (
            <li
              key={chapter.slug}
              className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6 shadow-card"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 font-heading text-xl font-bold text-brand-950">
                  <MapPinIcon aria-hidden="true" className="size-5 text-brand-700" />
                  {chapter.name}
                </span>
                <Badge variant={chapter.status === "live" ? "verified" : "secondary"}>
                  {chapter.status === "live" ? t("live") : t("launching")}
                </Badge>
              </div>
              <Link
                href="/chapters"
                className={`${buttonVariants({ variant: chapter.status === "live" ? "default" : "outline", size: "sm" })} self-start`}
              >
                {chapter.status === "live" ? t("visit") : t("waitlist")}
              </Link>
            </li>
          ))}
          <li className="flex flex-col gap-4 rounded-xl border border-dashed border-line-strong bg-surface p-6">
            <span className="font-heading text-xl font-bold text-brand-950">{t("request")}</span>
            {topRequests.length ? (
              <div className="flex flex-col gap-2">
                <span className="text-small font-semibold text-muted-foreground">
                  {t("mostRequested")}
                </span>
                <ul className="flex flex-wrap gap-2">
                  {topRequests.map((request) => (
                    <li key={request.city}>
                      <Badge variant="outline">
                        {request.city} · {t("votes", { count: request.votes })}
                      </Badge>
                    </li>
                  ))}
                </ul>
                {topRequests.some((r) => r.isDemo) ? (
                  <Badge variant="demo">{stats("demoTag")}</Badge>
                ) : null}
              </div>
            ) : null}
            <Link
              href="/chapters"
              className={`${buttonVariants({ variant: "secondary", size: "sm" })} mt-auto self-start`}
            >
              {t("request")}
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}
