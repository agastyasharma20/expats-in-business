import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { UsersIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { FounderMessage } from "@/components/team/founder-message";
import { MemberCard } from "@/components/team/member-card";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/lib/i18n/navigation";
import { withAlternates } from "@/lib/seo";
import { getTeamPage } from "@/lib/team/queries";
import { TEAM_GROUPS } from "@/lib/team/schemas";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("team");
  return withAlternates("/team", { title: t("title"), description: t("lead") });
}

async function TeamContent() {
  await connection();
  const [t, { founder, members }] = await Promise.all([getTranslations("team"), getTeamPage()]);
  if (!founder && members.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-line-strong bg-surface p-6">
        <p className="text-muted-foreground">{t("empty")}</p>
        <Link href="/get-involved" className={buttonVariants({ variant: "outline" })}>
          {t("emptyAction")}
        </Link>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-12">
      {founder ? <FounderMessage founder={founder} /> : null}
      {TEAM_GROUPS.map((group) => {
        const people = members.filter((m) => m.grp === group);
        if (!people.length) return null;
        return (
          <section key={group} aria-labelledby={`team-${group}`} className="flex flex-col gap-5">
            <h2 id={`team-${group}`} className="text-h3">
              {t(`groups.${group}`)}
            </h2>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {people.map((member) => (
                <MemberCard key={member.id} member={member} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/** Public team page: the founder's message and the people behind EiB (all edited in /admin/team). */
export default async function TeamPage() {
  const t = await getTranslations("team");
  return (
    <div className="container-page flex flex-col gap-10 py-10">
      <PageHeader icon={UsersIcon} eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-3xl" />}>
        <TeamContent />
      </Suspense>
    </div>
  );
}
