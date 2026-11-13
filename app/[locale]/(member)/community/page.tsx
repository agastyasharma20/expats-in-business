import type { Metadata } from "next";
import { GlobeIcon, MessagesSquareIcon, ShieldCheckIcon, UsersIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { listGroups, moderatesAnything } from "@/lib/community/groups";
import { Link } from "@/lib/i18n/navigation";

// Session-bound page: blocking navigation is expected (no instant prerender).
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("community");
  return { title: t("title"), robots: { index: false } };
}

type Group = Awaited<ReturnType<typeof listGroups>>["mine"][number];

async function GroupGrid({ groups, label }: { groups: Group[]; label: string }) {
  const [t, format] = await Promise.all([getTranslations("community"), getFormatter()]);
  return (
    <section aria-label={label} className="flex flex-col gap-4">
      <h2 className="text-h3">{label}</h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group, i) => (
          <li
            key={group.id}
            className="animate-rise"
            style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
          >
            <Link
              href={`/community/${group.slug}`}
              className="group flex h-full flex-col gap-3 rounded-2xl border border-line bg-surface p-5 shadow-card transition-transform duration-(--duration-micro) hover:-translate-y-0.5 hover:border-line-strong"
              data-testid="group-card"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand-100 text-brand-950">
                  {group.kind === "bubble" ? (
                    <GlobeIcon aria-hidden="true" className="size-5" />
                  ) : (
                    <UsersIcon aria-hidden="true" className="size-5" />
                  )}
                </span>
                <span className="flex gap-1.5">
                  <Badge variant={group.kind === "bubble" ? "bubble" : "verified"}>
                    {t(`kind.${group.kind}`)}
                  </Badge>
                  {group.isDemo ? <Badge variant="demo">{t("demo")}</Badge> : null}
                </span>
              </span>
              <span className="font-heading text-body font-bold text-brand-950 group-hover:underline">
                {group.name}
              </span>
              <span className="text-small text-muted-foreground">
                {group.kind === "bubble" ? group.bubble?.name : group.chapter?.name}
              </span>
              <span className="mt-auto flex flex-wrap items-center justify-between gap-2 text-small text-ink">
                <span>{t("posts", { count: group.postCount })}</span>
                {group.lastActivity ? (
                  <span className="text-muted-foreground">
                    {t("active", { when: format.relativeTime(group.lastActivity) })}
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function CommunityPage() {
  const user = await requireUser("/community");
  const [t, groups, moderator] = await Promise.all([
    getTranslations("community"),
    listGroups(user.id),
    moderatesAnything(user),
  ]);

  return (
    <div className="container-page flex flex-col gap-10 py-12">
      <PageHeader
        icon={MessagesSquareIcon}
        eyebrow={t("eyebrow")}
        title={t("title")}
        lead={t("lead")}
        actions={
          <>
            <Link href="/bubbles" className={buttonVariants({ variant: "outline" })}>
              <GlobeIcon aria-hidden="true" />
              {t("bubbles")}
            </Link>
            {moderator ? (
              <Link href="/moderation" className={buttonVariants({ variant: "secondary" })}>
                <ShieldCheckIcon aria-hidden="true" />
                {t("moderation")}
              </Link>
            ) : null}
          </>
        }
      />
      {groups.mine.length ? (
        <GroupGrid groups={groups.mine} label={t("groups")} />
      ) : (
        <EmptyState
          icon={UsersIcon}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Link href="/bubbles" className={buttonVariants()}>
              {t("bubbles")}
            </Link>
          }
        />
      )}
      {groups.discover.length ? <GroupGrid groups={groups.discover} label={t("discover")} /> : null}
    </div>
  );
}
