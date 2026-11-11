import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HandshakeIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ActionForm } from "@/components/common/action-form";
import { EmptyState } from "@/components/common/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { Link } from "@/lib/i18n/navigation";
import { requestConnection, setWhoIMet } from "@/server/actions/connections";

type Props = PageProps<"/[locale]/met/[slug]">;

export const instant = false;
export const metadata: Metadata = { robots: { index: false } };

async function MetView({ params }: Props) {
  const { slug } = await params;
  const user = await requireUser(`/met/${slug}`);
  const db = getDb();
  const event = await db.event.findUnique({ where: { slug }, select: { id: true, title: true } });
  if (!event) notFound();
  const t = await getTranslations("met");
  const [attended, consent] = await Promise.all([
    db.checkIn.findFirst({ where: { eventId: event.id, userId: user.id }, select: { id: true } }),
    db.consent.findUnique({ where: { userId_type: { userId: user.id, type: "who_i_met" } } }),
  ]);
  const heading = <h1 className="text-h1">{t("title", { event: event.title })}</h1>;
  if (!attended) {
    return (
      <>
        {heading}
        <EmptyState
          icon={HandshakeIcon}
          title={t("title", { event: event.title })}
          description={t("notAttended")}
          action={
            <Link href={`/events/${slug}`} className={buttonVariants()}>
              {event.title}
            </Link>
          }
        />
      </>
    );
  }
  const optedIn = Boolean(consent?.granted);
  const people = optedIn
    ? await db.checkIn.findMany({
        where: {
          eventId: event.id,
          userId: { not: user.id },
          user: { consents: { some: { type: "who_i_met", granted: true } } },
        },
        select: {
          user: {
            select: {
              id: true,
              name: true,
              profile: { select: { slug: true, headline: true } },
              connectionsSent: { where: { addresseeId: user.id }, select: { status: true } },
              connectionsReceived: { where: { requesterId: user.id }, select: { status: true } },
            },
          },
        },
        orderBy: { checkedInAt: "asc" },
      })
    : [];

  return (
    <>
      {heading}
      <p className="text-muted-foreground">{t("lead")}</p>
      <section className="flex flex-col items-start gap-3 rounded-xl border border-line bg-surface p-6">
        <h2 className="text-h3">{t("optInTitle")}</h2>
        <p className="text-muted-foreground">{optedIn ? t("visible") : t("optInLead")}</p>
        <ActionForm
          action={setWhoIMet}
          submitLabel={optedIn ? t("optOut") : t("optIn")}
          pendingLabel="…"
          errorTexts={{ default: "" }}
          submitVariant={optedIn ? "outline" : "default"}
          testId="who-i-met-consent"
        >
          <input type="hidden" name="granted" value={optedIn ? "false" : "true"} />
        </ActionForm>
      </section>
      {optedIn ? (
        people.length ? (
          <ul
            className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface"
            data-testid="met-list"
          >
            {people.map(({ user: person }) => {
              const status =
                person.connectionsSent[0]?.status ?? person.connectionsReceived[0]?.status;
              return (
                <li
                  key={person.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="flex flex-col">
                    {person.profile ? (
                      <Link
                        href={`/members/${person.profile.slug}`}
                        className="font-semibold text-brand-950 hover:underline"
                      >
                        {person.name}
                      </Link>
                    ) : (
                      <span className="font-semibold">{person.name}</span>
                    )}
                    {person.profile?.headline ? (
                      <span className="text-small text-muted-foreground">
                        {person.profile.headline}
                      </span>
                    ) : null}
                  </div>
                  {status === "accepted" ? (
                    <span className="font-semibold text-success">{t("connected")}</span>
                  ) : status ? (
                    <span className="text-muted-foreground">{t("requested")}</span>
                  ) : (
                    <ActionForm
                      action={requestConnection}
                      submitLabel={t("connect")}
                      pendingLabel="…"
                      successText={t("sent")}
                      errorTexts={{ default: t("notAttended") }}
                    >
                      <input type="hidden" name="addresseeId" value={person.id} />
                      <input type="hidden" name="eventId" value={event.id} />
                    </ActionForm>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground">{t("empty")}</p>
        )
      ) : null}
    </>
  );
}

export default function MetPage(props: Props) {
  return (
    <div className="container-page flex max-w-3xl flex-col gap-6 py-12">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <MetView {...props} />
      </Suspense>
    </div>
  );
}
