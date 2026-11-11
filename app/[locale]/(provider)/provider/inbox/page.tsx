import type { Metadata } from "next";
import { InboxIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { ActionForm } from "@/components/common/action-form";
import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { Link } from "@/lib/i18n/navigation";
import { requestVerification, respondQuote } from "@/server/actions/directory";

export const metadata: Metadata = { robots: { index: false } };

/** Quote requests for the providers this member owns; the requester's email appears only after accepting. */
export default async function ProviderInboxPage() {
  const user = await requireUser("/provider/inbox");
  const [t, locale] = await Promise.all([getTranslations("providerArea"), getLocale()]);
  const db = getDb();
  const [providers, quotes] = await Promise.all([
    db.provider.findMany({
      where: { ownerId: user.id },
      select: { id: true, slug: true, name: true, verificationStatus: true },
    }),
    db.quoteRequest.findMany({
      where: { provider: { ownerId: user.id } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
      select: {
        id: true,
        message: true,
        status: true,
        createdAt: true,
        provider: { select: { name: true } },
        requester: { select: { name: true, email: true } },
      },
    }),
  ]);
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="quotes-title" className="flex flex-col gap-3">
        <h1 id="quotes-title" className="text-h2">
          {t("inboxTitle")}
        </h1>
        <p className="text-muted-foreground">{t("inboxLead")}</p>
        {quotes.length ? (
          <ul className="flex flex-col gap-3" data-testid="quote-inbox">
            {quotes.map((q) => (
              <li
                key={q.id}
                className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-brand-950">
                    {t("from", { name: q.requester.name })} · {q.provider.name}
                  </span>
                  <Badge
                    variant={
                      q.status === "accepted"
                        ? "verified"
                        : q.status === "open"
                          ? "unconfirmed"
                          : "outline"
                    }
                  >
                    {q.status === "accepted"
                      ? t("accepted")
                      : q.status === "open"
                        ? t("open")
                        : t("declined")}
                  </Badge>
                </div>
                <p className="whitespace-pre-line text-ink">{q.message}</p>
                <p className="text-small text-muted-foreground">{date.format(q.createdAt)}</p>
                {q.status === "accepted" ? (
                  <p className="font-semibold">
                    <a href={`mailto:${q.requester.email}`} className="text-brand-700 underline">
                      {t("contact", { email: q.requester.email })}
                    </a>
                  </p>
                ) : null}
                {q.status === "open" ? (
                  <div className="flex gap-2">
                    <ActionForm
                      action={respondQuote}
                      submitLabel={t("accept")}
                      pendingLabel="…"
                      errorTexts={{ default: "" }}
                    >
                      <input type="hidden" name="id" value={q.id} />
                      <input type="hidden" name="decision" value="accept" />
                    </ActionForm>
                    <ActionForm
                      action={respondQuote}
                      submitLabel={t("decline")}
                      pendingLabel="…"
                      errorTexts={{ default: "" }}
                      submitVariant="ghost"
                    >
                      <input type="hidden" name="id" value={q.id} />
                      <input type="hidden" name="decision" value="decline" />
                    </ActionForm>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={InboxIcon}
            title={t("inboxTitle")}
            description={t("empty")}
            action={
              <Link href="/provider/analytics" className={buttonVariants({ variant: "outline" })}>
                {t("analytics")}
              </Link>
            }
          />
        )}
      </section>
      <section aria-labelledby="my-providers" className="flex flex-col gap-3">
        <h2 id="my-providers" className="text-h3">
          {t("providers")}
        </h2>
        <ul className="flex flex-col gap-3">
          {providers.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4"
            >
              <div className="flex flex-col">
                <Link
                  href={`/providers/${p.slug}`}
                  className="font-semibold text-brand-950 underline"
                >
                  {p.name}
                </Link>
                <span
                  className="text-small text-muted-foreground"
                  data-testid="verification-status"
                >
                  {t("status", { status: t(`statuses.${p.verificationStatus}`) })}
                </span>
              </div>
              {p.verificationStatus === "none" || p.verificationStatus === "rejected" ? (
                <ActionForm
                  action={requestVerification}
                  submitLabel={t("requestVerification")}
                  pendingLabel="…"
                  successText={t("verificationRequested")}
                  errorTexts={{ default: "" }}
                  submitVariant="outline"
                >
                  <input type="hidden" name="providerId" value={p.id} />
                </ActionForm>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
