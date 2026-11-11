import { CalendarDaysIcon, MapPinIcon, UsersIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { getDb } from "@/lib/db";

export default async function AdminPage() {
  const t = await getTranslations("admin");
  const db = getDb();
  const [members, events, chapters] = await Promise.all([
    db.user.count(),
    db.event.count(),
    db.chapter.count(),
  ]);
  const cards = [
    { label: t("members"), value: members, icon: UsersIcon },
    { label: t("events"), value: events, icon: CalendarDaysIcon },
    { label: t("chapters"), value: chapters, icon: MapPinIcon },
  ];
  return (
    <div className="container-page flex flex-col gap-8 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1">{t("title")}</h1>
        <p className="text-muted-foreground">{t("lead")}</p>
      </header>
      <dl className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="flex items-center gap-4 rounded-xl border border-line bg-surface p-6 shadow-card"
          >
            <card.icon aria-hidden="true" className="size-6 text-brand-700" />
            <div className="flex flex-col">
              <dt className="text-small text-muted-foreground">{card.label}</dt>
              <dd className="font-heading text-h3 font-bold text-brand-950">{card.value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}
