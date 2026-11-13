import { getTranslations } from "next-intl/server";

import { ActionButton } from "@/components/common/action-button";
import { Badge } from "@/components/ui/badge";
import type { ActionState } from "@/server/actions/account";
import { nextMoves, type ReviewStatus } from "@/lib/growth/rules";

export type ReviewItem = {
  id: string;
  status: ReviewStatus;
  title: string;
  meta: string;
  body: string;
  extra?: string | null;
  link?: string | null;
  tags: string[];
  isDemo: boolean;
};

const COLUMNS = ["submitted", "in_review", "waitlisted", "accepted", "declined"] as const;

/**
 * Kanban board for ambassador and role applications. Only moves the server also allows are
 * rendered as buttons (lib/growth/rules), so no button is a dead end.
 */
export async function ReviewBoard({
  items,
  action,
  testId,
}: {
  items: ReviewItem[];
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  testId: string;
}) {
  const t = await getTranslations("adminGrowth");
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" data-testid={testId}>
      {COLUMNS.map((column) => {
        const list = items.filter((i) => i.status === column);
        return (
          <section
            key={column}
            aria-labelledby={`${testId}-${column}`}
            className="flex flex-col gap-3 rounded-2xl bg-canvas p-3"
          >
            <h3
              id={`${testId}-${column}`}
              className="flex items-center justify-between px-1 text-body font-bold"
            >
              {t(`status.${column}`)}
              <Badge variant="outline">{list.length}</Badge>
            </h3>
            {list.length ? (
              <ul className="flex flex-col gap-3">
                {list.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4 shadow-card"
                  >
                    <span className="flex flex-wrap gap-1.5">
                      {item.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                      {item.isDemo ? <Badge variant="demo">{t("demo")}</Badge> : null}
                    </span>
                    <span className="font-semibold text-brand-950">{item.title}</span>
                    <span className="text-small text-muted-foreground">{item.meta}</span>
                    <details className="text-small text-ink">
                      <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-primary">
                        {t("read")}
                      </summary>
                      <p className="whitespace-pre-line">{item.body}</p>
                      {item.extra ? (
                        <p className="mt-2 whitespace-pre-line text-muted-foreground">
                          {item.extra}
                        </p>
                      ) : null}
                      {item.link ? (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="mt-2 inline-flex min-h-11 items-center break-all text-primary underline"
                        >
                          {item.link}
                        </a>
                      ) : null}
                    </details>
                    <span className="flex flex-wrap gap-1.5">
                      {nextMoves(item.status).map((to) => (
                        <ActionButton
                          key={to}
                          action={action}
                          fields={{ id: item.id, status: to }}
                          variant={to === "accepted" ? "default" : "outline"}
                          size="sm"
                          toastOnResolve
                          toasts={{ [to]: t(`moved.${to}`) }}
                          errorText={t("error")}
                        >
                          {t(`move.${to}`)}
                        </ActionButton>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-1 text-small text-muted-foreground">{t("empty")}</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
