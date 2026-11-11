import { UsersIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ListPage } from "@/components/member/list-page";
import { requireUser } from "@/lib/auth/session";
import { getMyConnections } from "@/lib/member/queries";

export default async function ConnectionsPage() {
  const user = await requireUser("/connections");
  const [t, d, rows] = await Promise.all([
    getTranslations("dashboard.myConnections"),
    getTranslations("dashboard"),
    getMyConnections(user.id),
  ]);
  return (
    <ListPage
      title={t("title")}
      icon={UsersIcon}
      items={rows.map((row) => ({
        id: row.id,
        title: row.person.name,
        href: row.person.profile ? `/members/${row.person.profile.slug}` : undefined,
        meta: [row.person.profile?.headline, row.metAt ? t("metAt", { event: row.metAt }) : null]
          .filter(Boolean)
          .join(" · "),
      }))}
      empty={{ text: t("empty"), actionLabel: d("findEvent"), actionHref: "/events" }}
    />
  );
}
