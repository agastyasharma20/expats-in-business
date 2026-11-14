import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { CoffeeIcon, PlayIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { ActionButton } from "@/components/common/action-button";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { parseScopeKey } from "@/config/roulette";
import { isAdmin } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { weekStart } from "@/lib/community/roulette";
import { getDb } from "@/lib/db";
import { runRouletteNow } from "@/server/actions/admin-ops";

// Session-bound page: blocking navigation is expected (no instant prerender).
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminRoulette");
  return { title: t("title"), robots: { index: false } };
}

/** Each roulette scope: participants, this week's round, acceptance rate; run a draw now. */
export default async function AdminRoulettePage() {
  const user = await requirePermission("admin.access");
  if (!isAdmin(user)) forbidden();
  const db = getDb();
  const week = weekStart(new Date());
  const [t, format, scopes, chapters, bubbles] = await Promise.all([
    getTranslations("adminRoulette"),
    getFormatter(),
    db.rouletteOptIn.groupBy({ by: ["scopeKey"], _count: { _all: true } }),
    db.chapter.findMany({ select: { id: true, name: true } }),
    db.bubble.findMany({ select: { id: true, name: true } }),
  ]);
  const names = new Map([...chapters, ...bubbles].map((x) => [x.id, x.name]));
  const rows = await Promise.all(
    scopes.map(async (s) => {
      const round = await db.rouletteRound.findUnique({
        where: { scopeKey_weekStart: { scopeKey: s.scopeKey, weekStart: week } },
        select: { matches: { select: { status: true } } },
      });
      const scope = parseScopeKey(s.scopeKey);
      const matches = round?.matches ?? [];
      return {
        key: s.scopeKey,
        kind: scope?.kind ?? "chapter",
        name: (scope && names.get(scope.id)) ?? s.scopeKey,
        participants: s._count._all,
        drawn: Boolean(round),
        matches: matches.length,
        confirmed: matches.filter((m) => m.status === "confirmed").length,
      };
    }),
  );

  return (
    <div className="container-page flex flex-col gap-8 py-10">
      <PageHeader
        icon={CoffeeIcon}
        title={t("title")}
        lead={t("lead", { week: format.dateTime(week, { dateStyle: "medium", timeZone: "UTC" }) })}
      />
      {rows.length ? (
        <ul className="grid gap-4 md:grid-cols-2" data-testid="admin-roulette">
          {rows.map((row) => (
            <li
              key={row.key}
              className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-card"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex flex-col">
                  <span className="font-heading text-body font-bold text-brand-950">
                    {row.name}
                  </span>
                  <span className="text-small text-muted-foreground">{t(`kind.${row.kind}`)}</span>
                </span>
                <Badge variant={row.drawn ? "verified" : "unconfirmed"}>
                  {row.drawn ? t("drawn") : t("notDrawn")}
                </Badge>
              </div>
              <dl className="grid grid-cols-3 gap-2 text-center">
                {[
                  ["participants", row.participants],
                  ["matches", row.matches],
                  ["confirmed", row.confirmed],
                ].map(([key, value]) => (
                  <div key={key} className="rounded-xl bg-canvas p-3">
                    <dt className="text-small text-muted-foreground">{t(`stats.${key}`)}</dt>
                    <dd className="font-heading text-h3 font-bold text-brand-950 tabular-nums">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              {row.drawn ? null : (
                <ActionButton
                  action={runRouletteNow}
                  fields={{ scope: row.key }}
                  variant="default"
                  toasts={{ ran: t("ran"), already: t("already") }}
                  errorText={t("error")}
                  className="self-start"
                >
                  <PlayIcon aria-hidden="true" />
                  {t("run")}
                </ActionButton>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-line-strong bg-surface p-6 text-muted-foreground">
          {t("empty")}
        </p>
      )}
    </div>
  );
}
