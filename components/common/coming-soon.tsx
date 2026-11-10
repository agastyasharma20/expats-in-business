import {
  BookOpenIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
  GlobeIcon,
  MapIcon,
  KeyRoundIcon,
  TagIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getFact } from "@/config/facts";
import { Link } from "@/lib/i18n/navigation";

import { EmptyState } from "./empty-state";
import { ExternalLink } from "./external-link";

export const comingSoonFeatures = {
  events: CalendarDaysIcon,
  members: UsersIcon,
  providers: BriefcaseIcon,
  guides: BookOpenIcon,
  pricing: TagIcon,
  signIn: KeyRoundIcon,
  bubbles: GlobeIcon,
  chapters: MapIcon,
} as const satisfies Record<string, LucideIcon>;

export type ComingSoonFeature = keyof typeof comingSoonFeatures;

/**
 * Designed placeholder for a nav destination whose milestone has not shipped yet: real heading,
 * what is coming, and two working next actions. Later milestones replace the route's page.
 */
export function ComingSoon({ feature }: { feature: ComingSoonFeature }) {
  const t = useTranslations("comingSoon");
  const common = useTranslations("common");

  return (
    <div className="container-page flex flex-1 flex-col gap-8 py-12 md:py-16">
      <header className="flex flex-col items-start gap-3">
        <Badge variant="secondary">{t("badge")}</Badge>
        <h1 className="text-h1">{t(`${feature}.title`)}</h1>
      </header>
      <EmptyState
        icon={comingSoonFeatures[feature]}
        title={t("lead")}
        description={t(`${feature}.description`)}
        action={
          <>
            <Link href="/" className={buttonVariants({ variant: "default" })}>
              {common("backHome")}
            </Link>
            <ExternalLink
              href={getFact("community.whatsapp").value}
              className={`${buttonVariants({ variant: "outline" })} no-underline`}
            >
              {t("whatsapp")}
            </ExternalLink>
          </>
        }
      />
    </div>
  );
}
