import { ArrowRightIcon, ClockIcon, MapPinIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Link } from "@/lib/i18n/navigation";

type Role = {
  slug: string;
  title: string;
  team: string;
  kind: string;
  location: string;
  commitment: string;
  summary: string;
  isDemo: boolean;
};

const KIND_BADGE = {
  volunteer: "bubble",
  internship: "secondary",
  part_time: "verified",
  full_time: "verified",
} as const;

/** One open role: kind, team, place and time commitment, linking to the role page. */
export async function RoleCard({ role, index }: { role: Role; index: number }) {
  const t = await getTranslations("careers");
  return (
    <li className="animate-rise" style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}>
      <Link
        href={`/careers/${role.slug}`}
        className="group flex h-full flex-col gap-3 rounded-2xl border border-line bg-surface p-5 shadow-card transition-transform duration-(--duration-micro) hover:-translate-y-0.5 hover:border-line-strong"
        data-testid="role-card"
      >
        <span className="flex flex-wrap items-center gap-1.5">
          <Badge variant={KIND_BADGE[role.kind as keyof typeof KIND_BADGE] ?? "secondary"}>
            {t(`kinds.${role.kind}`)}
          </Badge>
          <Badge variant="outline">{role.team}</Badge>
          {role.isDemo ? <Badge variant="demo">{t("demo")}</Badge> : null}
        </span>
        <span className="font-heading text-h3 font-bold text-brand-950 group-hover:underline">
          {role.title}
        </span>
        <span className="text-small text-ink">{role.summary}</span>
        <span className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-small text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPinIcon aria-hidden="true" className="size-4" />
            {role.location}
          </span>
          <span className="flex items-center gap-1.5">
            <ClockIcon aria-hidden="true" className="size-4" />
            {role.commitment}
          </span>
        </span>
        <span className="inline-flex items-center gap-1 text-small font-semibold text-primary">
          {t("view")}
          <ArrowRightIcon
            aria-hidden="true"
            className="size-4 transition-transform duration-(--duration-micro) group-hover:translate-x-0.5"
          />
        </span>
      </Link>
    </li>
  );
}
