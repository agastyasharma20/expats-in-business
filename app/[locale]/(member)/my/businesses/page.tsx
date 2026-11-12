import { BriefcaseIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ListPage } from "@/components/member/list-page";
import { requireUser } from "@/lib/auth/session";
import { getMyBusinesses } from "@/lib/member/queries";

// Session-bound page: blocking navigation is expected (no instant prerender).
export const instant = false;

export default async function MyBusinessesPage() {
  const user = await requireUser("/my/businesses");
  const [t, nav, rows] = await Promise.all([
    getTranslations("dashboard.myBusinesses"),
    getTranslations("nav"),
    getMyBusinesses(user.id),
  ]);
  return (
    <ListPage
      title={t("title")}
      icon={BriefcaseIcon}
      items={rows.map((row) => ({
        id: row.id,
        title: row.name,
        meta: `${row.chapter.name} · ${row.description}`,
      }))}
      empty={{ text: t("empty"), actionLabel: nav("pricing"), actionHref: "/pricing" }}
    />
  );
}
