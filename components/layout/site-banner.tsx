import { InfoIcon, TriangleAlertIcon } from "lucide-react";
import { cacheLife, cacheTag } from "next/cache";
import { getTranslations } from "next-intl/server";

import { parseBanner } from "@/lib/admin/rules";
import { getDb } from "@/lib/db";
import { cn } from "@/lib/utils";

async function readBanner() {
  "use cache";
  cacheLife("minutes");
  cacheTag("banner");
  // Throws on failure (never cache an error); SiteBanner catches outside the cache.
  const row = await getDb().siteSetting.findUnique({ where: { key: "banner" } });
  return parseBanner(row?.value);
}

/** Site-wide notice set in /admin/settings (plain text, cached, invalidated on save). */
export async function SiteBanner() {
  const banner = await readBanner().catch(() => null);
  if (!banner) return null;
  const t = await getTranslations("banner");
  const Icon = banner.tone === "warning" ? TriangleAlertIcon : InfoIcon;
  return (
    <aside
      aria-label={t("label")}
      data-testid="site-banner"
      className={cn(
        "border-b text-small font-semibold",
        banner.tone === "warning"
          ? "border-warning/40 bg-warning-50 text-warning"
          : "border-brand-200 bg-brand-50 text-brand-950",
      )}
    >
      <p className="container-page flex items-center gap-2 py-2">
        <Icon aria-hidden="true" className="size-4 shrink-0" />
        {banner.text}
      </p>
    </aside>
  );
}
