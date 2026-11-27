import type { Metadata } from "next";
import { HandshakeIcon, MegaphoneIcon, MicIcon, StoreIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/common/empty-state";
import { ExternalLink } from "@/components/common/external-link";
import { PageBand } from "@/components/layout/page-band";
import { buttonVariants } from "@/components/ui/button";
import { getFact } from "@/config/facts";
import { Link } from "@/lib/i18n/navigation";
import { withAlternates } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("partners");
  return withAlternates("/partners", { title: t("title"), description: t("lead") });
}

const WAYS = [
  { id: "host", icon: StoreIcon },
  { id: "support", icon: MegaphoneIcon },
  { id: "speak", icon: MicIcon },
] as const;

/**
 * Partners. Names appear only where docs/FACTS.md confirms the collaboration; a partner's logo
 * waits for written permission, so that part is a designed empty state with a next action.
 */
export default async function PartnersPage() {
  const t = await getTranslations("partners");
  const meetup = getFact("org.jointMeetup");
  return (
    <div className="flex flex-col">
      <PageBand
        eyebrow={t("eyebrow")}
        title={t("title")}
        lead={t("lead")}
        actions={
          <Link href="/help" className={buttonVariants({ variant: "highlight", size: "lg" })}>
            <HandshakeIcon aria-hidden="true" />
            {t("become")}
          </Link>
        }
      />

      <div className="container-page flex flex-col gap-14 py-14">
        <section aria-labelledby="collab-title" className="flex flex-col gap-5">
          <h2 id="collab-title" className="text-h2">
            {t("collabTitle")}
          </h2>
          <article
            className="flex animate-rise flex-col gap-2 rounded-2xl border border-line bg-surface p-6 shadow-card"
            data-testid="partner-collaboration"
          >
            <p className="font-heading text-h3 font-bold text-brand-950">{meetup.value}</p>
            {meetup.source ? (
              <ExternalLink href={meetup.source} className="self-start text-small">
                {t("source")}
              </ExternalLink>
            ) : null}
          </article>
        </section>

        <section aria-labelledby="logos-title" className="flex flex-col gap-5">
          <h2 id="logos-title" className="text-h2">
            {t("logosTitle")}
          </h2>
          <EmptyState
            icon={HandshakeIcon}
            headingLevel="h3"
            title={t("logosEmptyTitle")}
            description={t("logosEmptyText")}
            action={
              <Link href="/help" className={buttonVariants({ variant: "outline" })}>
                {t("become")}
              </Link>
            }
          />
        </section>

        <section aria-labelledby="ways-title" className="flex flex-col gap-5">
          <h2 id="ways-title" className="text-h2">
            {t("waysTitle")}
          </h2>
          <ul className="grid gap-4 md:grid-cols-3" data-testid="partner-ways">
            {WAYS.map(({ id, icon: Icon }, i) => (
              <li
                key={id}
                style={{ animationDelay: `${i * 60}ms` }}
                className="flex animate-rise flex-col gap-3 rounded-2xl bg-brand-50 p-6"
              >
                <Icon aria-hidden="true" className="size-8 text-brand-950" />
                <h3 className="text-h3">{t(`ways.${id}.title`)}</h3>
                <p className="text-ink">{t(`ways.${id}.text`)}</p>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            <Link href="/help" className={buttonVariants({ size: "lg" })}>
              {t("contact")}
            </Link>
            <Link
              href="/get-involved"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              {t("involved")}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
