import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { listFormats } from "@/lib/events/queries";
import { Link } from "@/lib/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("events.formats");
  return { title: t("title"), description: t("lead") };
}

/** Session types explained (old bug 9: the "Session Types" page was empty). */
export default async function FormatsPage() {
  const [t, formats] = await Promise.all([getTranslations("events.formats"), listFormats()]);
  return (
    <div className="container-page flex flex-col gap-8 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1">{t("title")}</h1>
        <p className="text-muted-foreground">{t("lead")}</p>
      </header>
      <ul className="grid gap-6 md:grid-cols-2">
        {formats.map((format) => (
          <li
            key={format.slug}
            className="flex flex-col items-start gap-3 rounded-xl border border-line bg-surface p-6 shadow-card"
          >
            <h2 className="text-h3">{format.name}</h2>
            <p className="text-small font-semibold text-brand-700">
              {t("duration", { minutes: format.defaultDurationMin })}
            </p>
            <p className="flex-1 text-muted-foreground">{format.description}</p>
            <Link
              href={`/events?format=${format.slug}`}
              className={buttonVariants({ variant: "outline" })}
            >
              {t("see", { format: format.name })}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
