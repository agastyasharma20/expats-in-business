import { UsersIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ActionForm } from "@/components/common/action-form";
import { ListPage } from "@/components/member/list-page";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getMyConnections } from "@/lib/member/queries";
import { respondConnection } from "@/server/actions/connections";

/** Requests addressed to me: accept or decline (double opt-in). */
async function PendingRequests({ userId }: { userId: string }) {
  const [t, pending] = await Promise.all([
    getTranslations("connectionsPending"),
    getDb().connection.findMany({
      where: { addresseeId: userId, status: "pending" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        message: true,
        requester: { select: { name: true } },
        metAtEvent: { select: { title: true } },
      },
    }),
  ]);
  if (!pending.length) return null;
  return (
    <section aria-labelledby="pending-title" className="container-page flex flex-col gap-4 pt-12">
      <h2 id="pending-title" className="text-h3">
        {t("title")}
      </h2>
      <ul
        className="flex flex-col divide-y divide-line rounded-xl border border-brand-700/40 bg-surface"
        data-testid="pending-requests"
      >
        {pending.map((request) => (
          <li key={request.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex flex-col">
              <span className="font-semibold text-brand-950">{request.requester.name}</span>
              {request.message ? <p className="text-small text-ink">“{request.message}”</p> : null}
              {request.metAtEvent ? (
                <span className="text-small text-muted-foreground">
                  {t("metAt", { event: request.metAtEvent.title })}
                </span>
              ) : null}
            </div>
            <div className="flex gap-2">
              <ActionForm
                action={respondConnection}
                submitLabel={t("accept")}
                pendingLabel="…"
                successText={t("accepted")}
                errorTexts={{ default: "" }}
              >
                <input type="hidden" name="id" value={request.id} />
                <input type="hidden" name="decision" value="accept" />
              </ActionForm>
              <ActionForm
                action={respondConnection}
                submitLabel={t("decline")}
                pendingLabel="…"
                successText={t("declined")}
                errorTexts={{ default: "" }}
                submitVariant="ghost"
              >
                <input type="hidden" name="id" value={request.id} />
                <input type="hidden" name="decision" value="decline" />
              </ActionForm>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function ConnectionsPage() {
  const user = await requireUser("/connections");
  const [t, d, rows] = await Promise.all([
    getTranslations("dashboard.myConnections"),
    getTranslations("dashboard"),
    getMyConnections(user.id),
  ]);
  return (
    <>
      <PendingRequests userId={user.id} />
      <ListPage
        title={t("title")}
        icon={UsersIcon}
        items={rows.map((row) => ({
          id: row.id,
          title: row.person.name,
          href: row.person.profile ? `/members/${row.person.profile.slug}` : undefined,
          meta: [
            row.person.profile?.headline,
            row.metAt ? t("metAt", { event: row.metAt }) : null,
            row.person.email,
          ]
            .filter(Boolean)
            .join(" · "),
        }))}
        empty={{ text: t("empty"), actionLabel: d("findEvent"), actionHref: "/events" }}
      />
    </>
  );
}
