import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { CheckIcon, ShieldCheckIcon, Trash2Icon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { ActionButton } from "@/components/common/action-button";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { moderatesAnything, moderationQueue } from "@/lib/community/groups";
import { Link } from "@/lib/i18n/navigation";
import { moderatePost } from "@/server/actions/community";

// Session-bound page: blocking navigation is expected (no instant prerender).
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("moderation");
  return { title: t("title"), robots: { index: false } };
}

/** Reported posts in groups the viewer moderates; keep or remove, each decision is audited. */
export default async function ModerationPage() {
  const user = await requireUser("/moderation");
  if (!(await moderatesAnything(user))) forbidden();
  const [t, g, format, queue] = await Promise.all([
    getTranslations("moderation"),
    getTranslations("group"),
    getFormatter(),
    moderationQueue(user),
  ]);

  return (
    <div className="container-page flex flex-col gap-8 py-12">
      <PageHeader icon={ShieldCheckIcon} title={t("title")} lead={t("lead")} />
      {queue.length ? (
        <ol className="flex flex-col gap-4" data-testid="moderation-queue">
          {queue.map((post) => (
            <li
              key={post.id}
              className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 shadow-card"
            >
              <div className="flex flex-wrap items-center gap-2 text-small">
                <Link
                  href={`/community/${post.group.slug}`}
                  className="font-semibold text-primary hover:underline"
                >
                  {post.group.name}
                </Link>
                <span className="text-muted-foreground">
                  · {post.author.name} ·{" "}
                  <time dateTime={post.createdAt.toISOString()}>
                    {format.relativeTime(post.createdAt)}
                  </time>
                </span>
                <Badge variant="destructive">{t("reports", { count: post.reports.length })}</Badge>
                {post.hiddenAt ? <Badge variant="unconfirmed">{t("autoHidden")}</Badge> : null}
              </div>
              <p className="rounded-lg bg-canvas p-3 break-words whitespace-pre-line text-ink">
                {post.body}
              </p>
              <ul className="flex flex-col gap-1 text-small text-ink">
                {post.reports.map((report) => (
                  <li key={report.id}>{t("reason", { reason: report.reason })}</li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <ActionButton
                  action={moderatePost}
                  fields={{ postId: post.id, decision: "keep" }}
                  toasts={{ kept: t("kept") }}
                  errorText={g("errors.forbidden")}
                  testId="moderation-keep"
                >
                  <CheckIcon aria-hidden="true" />
                  {t("keep")}
                </ActionButton>
                <ActionButton
                  action={moderatePost}
                  fields={{ postId: post.id, decision: "remove" }}
                  variant="destructive"
                  toasts={{ removed: t("removedToast") }}
                  errorText={g("errors.forbidden")}
                  testId="moderation-remove"
                >
                  <Trash2Icon aria-hidden="true" />
                  {t("remove")}
                </ActionButton>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState
          icon={ShieldCheckIcon}
          title={t("emptyTitle")}
          description={t("empty")}
          action={
            <Link href="/community" className={buttonVariants({ variant: "outline" })}>
              {t("toCommunity")}
            </Link>
          }
        />
      )}
    </div>
  );
}
