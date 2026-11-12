import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, GlobeIcon, LockIcon, MessageCircleIcon, UsersIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/common/empty-state";
import { PostCard } from "@/components/community/post-card";
import { PostComposer } from "@/components/community/post-composer";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth/session";
import { getGroupFeed } from "@/lib/community/groups";
import { allowedKinds } from "@/lib/community/rules";
import { getDb } from "@/lib/db";
import { Link } from "@/lib/i18n/navigation";

// Session-bound page: blocking navigation is expected (no instant prerender).
export const instant = false;

type Props = PageProps<"/[locale]/community/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const group = await getDb().group.findUnique({ where: { slug }, select: { name: true } });
  return { title: group?.name, robots: { index: false } };
}

function parseBefore(value: string | string[] | undefined): Date | undefined {
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

async function GroupView({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const user = await requireUser(`/community/${slug}`);
  const before = parseBefore(query.before);
  const [t, feed] = await Promise.all([getTranslations("group"), getGroupFeed(slug, user, before)]);
  if (!feed) notFound();
  const { group, access, posts, hasMore } = feed;
  const oldest = posts.at(-1)?.createdAt;

  return (
    <>
      <Link
        href="/community"
        className="inline-flex min-h-11 items-center gap-2 self-start text-small font-semibold text-primary hover:underline"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        {t("back")}
      </Link>
      <PageHeader
        icon={group.kind === "bubble" ? GlobeIcon : UsersIcon}
        eyebrow={group.kind === "bubble" ? group.bubble?.name : group.chapter?.name}
        title={group.name}
        actions={
          <>
            {group.isDemo ? <Badge variant="demo">{t("demoGroup")}</Badge> : null}
            {access.canModerate ? <Badge variant="verified">{t("youModerate")}</Badge> : null}
            {group.bubble ? (
              <Link
                href={`/bubbles/${group.bubble.slug}`}
                className={buttonVariants({ variant: "outline" })}
              >
                {t("bubblePage")}
              </Link>
            ) : null}
          </>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex flex-col gap-4">
          {before ? null : access.canPost ? (
            <PostComposer groupId={group.id} kinds={allowedKinds(access.canModerate)} />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-line-strong bg-surface p-4">
              <p className="flex items-center gap-2 text-ink">
                <LockIcon aria-hidden="true" className="size-4 text-brand-700" />
                {group.kind === "bubble" ? t("cannotPost") : t("cannotPostChapter")}
              </p>
              {group.bubble ? (
                <Link
                  href={`/bubbles/${group.bubble.slug}`}
                  className={buttonVariants({ size: "sm" })}
                >
                  {t("join")}
                </Link>
              ) : (
                <Link href="/settings/profile" className={buttonVariants({ size: "sm" })}>
                  {t("setChapter")}
                </Link>
              )}
            </div>
          )}

          {posts.length ? (
            <ol className="flex flex-col gap-4" aria-label={t("feed")}>
              {posts.map((post) => (
                <li key={post.id}>
                  <PostCard post={post} canModerate={access.canModerate} signedIn />
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              icon={MessageCircleIcon}
              title={t("emptyTitle")}
              description={t("empty")}
              headingLevel="h2"
              action={
                <Link href="/community" className={buttonVariants({ variant: "outline" })}>
                  {t("back")}
                </Link>
              }
            />
          )}
          {hasMore && oldest ? (
            <Link
              href={`/community/${group.slug}?before=${encodeURIComponent(oldest.toISOString())}`}
              className={buttonVariants({ variant: "outline", className: "self-center" })}
            >
              {t("older")}
            </Link>
          ) : null}
        </div>

        <aside className="flex flex-col gap-3 self-start rounded-2xl border border-line bg-brand-50 p-5 lg:sticky lg:top-24">
          <h2 className="text-body font-bold">{t("rulesTitle")}</h2>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-small text-ink">
            <li>{t("rules.kind")}</li>
            <li>{t("rules.privacy")}</li>
            <li>{t("rules.selling")}</li>
            <li>{t("rules.report")}</li>
          </ul>
        </aside>
      </div>
    </>
  );
}

export default function GroupPage({ params, searchParams }: Props) {
  return (
    <div className="container-page flex flex-col gap-6 py-12">
      <Suspense
        fallback={
          <div className="flex flex-col gap-4" aria-hidden="true">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        }
      >
        <GroupView params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
