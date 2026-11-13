import { AwardIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { placeLabel } from "@/lib/growth/rules";
import { Link } from "@/lib/i18n/navigation";

type Ambassador = {
  id: string;
  scope: "global" | "country" | "city";
  countryCode: string | null;
  city: string | null;
  isDemo: boolean;
  user: {
    name: string;
    profile: { slug: string; isPublic: boolean; headline: string | null } | null;
  };
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Ambassador cards: name (linked when the profile is public), tier and place. */
export async function AmbassadorList({ ambassadors }: { ambassadors: Ambassador[] }) {
  const [t, locale] = await Promise.all([getTranslations("ambassadors"), getLocale()]);
  const regions = new Intl.DisplayNames([locale], { type: "region" });
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="ambassador-list">
      {ambassadors.map((a, i) => {
        const profile = a.user.profile?.isPublic ? a.user.profile : null;
        return (
          <li
            key={a.id}
            className="flex animate-rise items-start gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card"
            style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
          >
            <span
              aria-hidden="true"
              className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-950 font-heading font-bold text-on-dark"
            >
              {initials(a.user.name)}
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              {profile ? (
                <Link
                  href={`/members/${profile.slug}`}
                  className="font-semibold text-brand-950 hover:underline"
                >
                  {a.user.name}
                </Link>
              ) : (
                <span className="font-semibold text-brand-950">{a.user.name}</span>
              )}
              <span className="flex flex-wrap items-center gap-1.5">
                <Badge variant="founding" className="gap-1">
                  <AwardIcon aria-hidden="true" className="size-3.5" />
                  {t(`tiers.${a.scope}.short`)}
                </Badge>
                {a.isDemo ? <Badge variant="demo">{t("demo")}</Badge> : null}
              </span>
              <span className="text-small text-muted-foreground">
                {placeLabel(a, (code) => regions.of(code) ?? code, t("global"))}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
