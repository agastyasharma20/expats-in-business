import { BellIcon, CoffeeIcon, MessagesSquareIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";
import type { getDashboardExtras } from "@/lib/member/dashboard-extras";
import type { NotificationType } from "@/lib/notifications";

import { Panel } from "./panel";

type Extras = Awaited<ReturnType<typeof getDashboardExtras>>;

const cornerLink =
  "text-small font-semibold text-primary hover:underline inline-flex min-h-11 items-center";

/** Latest posts from the member's chapter and Bubble groups. */
export async function ActivityPanel({ posts, delay }: { posts: Extras["posts"]; delay: number }) {
  const [t, format] = await Promise.all([getTranslations("dashboard"), getFormatter()]);
  return (
    <Panel
      id="activity"
      title={t("activity.title")}
      icon={MessagesSquareIcon}
      delay={delay}
      aside={
        <Link href="/community" className={cornerLink}>
          {t("activity.all")}
        </Link>
      }
    >
      {posts.length ? (
        <ul className="flex flex-col divide-y divide-line">
          {posts.map((post) => (
            <li key={post.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
              <Link
                href={`/community/${post.group.slug}`}
                className="line-clamp-2 text-ink hover:text-brand-950 hover:underline"
              >
                {post.body}
              </Link>
              <span className="text-small text-muted-foreground">
                {post.author.name} · {post.group.name} · {format.relativeTime(post.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className="text-muted-foreground">{t("activity.empty")}</p>
          <Link href="/bubbles" className={buttonVariants({ variant: "outline", size: "sm" })}>
            {t("activity.cta")}
          </Link>
        </div>
      )}
    </Panel>
  );
}

/** This week's Coffee Roulette state with the one next action. */
export async function RoulettePanel({ match, delay }: { match: Extras["match"]; delay: number }) {
  const t = await getTranslations("dashboard");
  return (
    <Panel id="roulette" title={t("roulette.title")} icon={CoffeeIcon} delay={delay}>
      {match ? (
        <div className="flex flex-col items-start gap-3">
          <Badge variant={match.status === "confirmed" ? "verified" : "unconfirmed"}>
            {match.status === "confirmed" ? t("roulette.confirmed") : t("roulette.waiting")}
          </Badge>
          <p className="text-ink">{t("roulette.with", { names: match.names.join(", ") })}</p>
          <Link
            href="/roulette"
            className={buttonVariants({
              size: "sm",
              variant: match.needsAnswer ? "default" : "outline",
            })}
          >
            {match.needsAnswer ? t("roulette.answer") : t("roulette.open")}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className="text-muted-foreground">{t("roulette.empty")}</p>
          <Link href="/roulette" className={buttonVariants({ size: "sm", variant: "outline" })}>
            {t("roulette.join")}
          </Link>
        </div>
      )}
    </Panel>
  );
}

/** Unread notifications (first four) with a link to all. */
export async function NotificationsPanel({
  items,
  delay,
}: {
  items: Extras["notifications"];
  delay: number;
}) {
  const [t, n, format] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("notifications"),
    getFormatter(),
  ]);
  return (
    <Panel
      id="inbox"
      title={t("inbox.title")}
      icon={BellIcon}
      delay={delay}
      aside={
        <Link href="/notifications" className={cornerLink}>
          {t("inbox.all")}
        </Link>
      }
    >
      {items.length ? (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex min-h-11 items-start gap-2 rounded-lg p-2 hover:bg-brand-50"
              >
                <span
                  aria-hidden="true"
                  className="mt-2 size-2 shrink-0 rounded-full bg-brand-700"
                />
                <span className="flex flex-col">
                  <span className="text-ink">
                    {n(
                      `types.${item.type as NotificationType}`,
                      (item.data ?? {}) as Record<string, string>,
                    )}
                  </span>
                  <span className="text-small text-muted-foreground">
                    {format.relativeTime(item.createdAt)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">{t("inbox.empty")}</p>
      )}
    </Panel>
  );
}
