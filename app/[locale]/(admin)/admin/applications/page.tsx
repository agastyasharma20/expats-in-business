import type { Metadata } from "next";
import { InboxIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { ActionButton } from "@/components/common/action-button";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { isAdmin } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { moveApplication } from "@/server/actions/applications";

// Session-bound page: blocking navigation is expected (no instant prerender).
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminApplications");
  return { title: t("title"), robots: { index: false } };
}

const COLUMNS = ["submitted", "in_review", "accepted", "declined"] as const;
const NEXT: Record<(typeof COLUMNS)[number], (typeof COLUMNS)[number][]> = {
  submitted: ["in_review", "declined"],
  in_review: ["accepted", "declined"],
  accepted: ["in_review"],
  declined: ["in_review"],
};

/** Applications board: speakers, stories and contributors move left to right; applicants are told. */
export default async function ApplicationsPage() {
  const user = await requirePermission("applications.review");
  const leadOf = user.roles
    .filter((r) => r.role === "chapter_lead" && r.chapterId)
    .map((r) => r.chapterId!);
  const [t, format, apps] = await Promise.all([
    getTranslations("adminApplications"),
    getFormatter(),
    getDb().application.findMany({
      where: isAdmin(user) ? {} : { chapterId: { in: leadOf } },
      orderBy: { createdAt: "asc" },
      take: 400,
      select: {
        id: true,
        type: true,
        status: true,
        name: true,
        answers: true,
        isDemo: true,
        createdAt: true,
        chapter: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="container-page flex flex-col gap-8 py-10">
      <PageHeader icon={InboxIcon} title={t("title")} lead={t("lead")} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" data-testid="applications-board">
        {COLUMNS.map((column) => {
          const items = apps.filter((a) => a.status === column);
          return (
            <section
              key={column}
              aria-labelledby={`col-${column}`}
              className="flex flex-col gap-3 rounded-2xl bg-canvas p-3"
            >
              <h2
                id={`col-${column}`}
                className="flex items-center justify-between px-1 text-body font-bold"
              >
                {t(`status.${column}`)}
                <Badge variant="outline">{items.length}</Badge>
              </h2>
              {items.length ? (
                <ul className="flex flex-col gap-3">
                  {items.map((a) => {
                    const answers = a.answers as {
                      topic?: string;
                      pitch?: string;
                      link?: string | null;
                      note?: string;
                    };
                    return (
                      <li
                        key={a.id}
                        className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4 shadow-card"
                      >
                        <span className="flex flex-wrap gap-1.5">
                          <Badge variant="secondary">{t(`types.${a.type}`)}</Badge>
                          {a.isDemo ? <Badge variant="demo">{t("demo")}</Badge> : null}
                        </span>
                        <span className="font-semibold text-brand-950">
                          {answers.topic ?? answers.note ?? "—"}
                        </span>
                        <span className="text-small text-muted-foreground">
                          {a.name} · {a.chapter?.name ?? t("global")} ·{" "}
                          {format.relativeTime(a.createdAt)}
                        </span>
                        {answers.pitch ? (
                          <details className="text-small text-ink">
                            <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-primary">
                              {t("read")}
                            </summary>
                            <p className="whitespace-pre-line">{answers.pitch}</p>
                            {answers.link ? (
                              <a
                                href={answers.link}
                                target="_blank"
                                rel="noopener noreferrer nofollow"
                                className="text-primary underline"
                              >
                                {answers.link}
                              </a>
                            ) : null}
                          </details>
                        ) : null}
                        <span className="flex flex-wrap gap-1.5">
                          {NEXT[column].map((to) => (
                            <ActionButton
                              key={to}
                              action={moveApplication}
                              fields={{ id: a.id, status: to }}
                              variant={to === "accepted" ? "default" : "outline"}
                              toasts={{ [to]: t(`moved.${to}`) }}
                              errorText={t("error")}
                            >
                              {t(`move.${to}`)}
                            </ActionButton>
                          ))}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="px-1 text-small text-muted-foreground">{t("empty")}</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
