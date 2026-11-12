import { EyeOffIcon, PinIcon, Trash2Icon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { ActionButton } from "@/components/common/action-button";
import { Badge } from "@/components/ui/badge";
import type { FeedPost } from "@/lib/community/groups";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import { deleteOwnPost, togglePin } from "@/server/actions/community";

import { ReactionBar } from "./reaction-bar";
import { ReportDialog } from "./report-dialog";

const KIND_STYLE = {
  post: "",
  question: "border-l-4 border-l-brand-700",
  announcement: "border-l-4 border-l-ember-600",
} as const;

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** One post: author, kind, time, text (plain text only, never HTML), reactions and tools. */
export async function PostCard({
  post,
  canModerate,
  signedIn,
}: {
  post: FeedPost;
  canModerate: boolean;
  signedIn: boolean;
}) {
  const [t, format] = await Promise.all([getTranslations("group"), getFormatter()]);
  const name = post.author.slug ? (
    <Link
      href={`/members/${post.author.slug}`}
      className="font-semibold text-brand-950 hover:underline"
    >
      {post.author.name}
    </Link>
  ) : (
    <span className="font-semibold text-brand-950">{post.author.name}</span>
  );

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5",
        KIND_STYLE[post.kind],
        post.underReview && "border-dashed bg-warning-50/40",
      )}
      data-testid="post"
      aria-labelledby={`post-${post.id}-author`}
    >
      <header className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-100 font-heading text-small font-bold text-brand-950"
        >
          {initials(post.author.name)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <p id={`post-${post.id}-author`} className="truncate">
            {name}
          </p>
          <p className="text-small text-muted-foreground">
            <time dateTime={post.createdAt.toISOString()}>
              {format.relativeTime(post.createdAt)}
            </time>
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          {post.pinned ? (
            <Badge variant="secondary" className="gap-1">
              <PinIcon aria-hidden="true" className="size-3.5" />
              {t("pinned")}
            </Badge>
          ) : null}
          {post.kind !== "post" ? (
            <Badge variant={post.kind === "announcement" ? "bubble" : "verified"}>
              {t(`kinds.${post.kind}`)}
            </Badge>
          ) : null}
          {post.isDemo ? <Badge variant="demo">{t("demo")}</Badge> : null}
        </div>
      </header>

      {post.underReview ? (
        <p className="flex items-center gap-2 text-small font-semibold text-warning">
          <EyeOffIcon aria-hidden="true" className="size-4" />
          {t("underReview")}
        </p>
      ) : null}
      {canModerate && post.openReports ? (
        <p className="text-small font-semibold text-danger">
          {t("openReports", { count: post.openReports })}
        </p>
      ) : null}

      <p className="text-body break-words whitespace-pre-line text-ink">{post.body}</p>

      {signedIn ? (
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <ReactionBar postId={post.id} reactions={post.reactions} />
          <div className="flex flex-wrap items-center gap-1">
            {canModerate ? (
              <ActionButton
                action={togglePin}
                fields={{ postId: post.id }}
                variant="ghost"
                toasts={{ pinned: t("pinnedToast"), unpinned: t("unpinnedToast") }}
                errorText={t("errors.forbidden")}
              >
                <PinIcon aria-hidden="true" />
                {post.pinned ? t("unpin") : t("pin")}
              </ActionButton>
            ) : null}
            {post.isMine ? (
              <ActionButton
                action={deleteOwnPost}
                fields={{ postId: post.id }}
                variant="ghost"
                toasts={{ "": t("deleted") }}
                className="text-muted-foreground"
              >
                <Trash2Icon aria-hidden="true" />
                {t("delete")}
              </ActionButton>
            ) : (
              <ReportDialog postId={post.id} />
            )}
          </div>
        </footer>
      ) : null}
    </article>
  );
}
