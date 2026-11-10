import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LockIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { CopyLinkButton } from "@/components/member/copy-link-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { Link } from "@/lib/i18n/navigation";
import { visibleProfile } from "@/lib/member/visibility";

type Props = PageProps<"/[locale]/members/[slug]">;

export const metadata: Metadata = { robots: { index: false } };

async function ProfileView({ params }: { params: Props["params"] }) {
  const { slug } = await params;
  const [row, viewer] = await Promise.all([
    getDb().profile.findUnique({
      where: { slug },
      include: {
        user: { select: { name: true } },
        industry: true,
        homeChapter: { select: { name: true } },
      },
    }),
    getSessionUser(),
  ]);
  if (!row) notFound();
  const [t, locale] = await Promise.all([getTranslations("profile"), getLocale()]);
  const isOwner = viewer?.id === row.userId;
  const profile = visibleProfile(row, isOwner);

  if (!profile) {
    return (
      <div className="flex flex-col items-start gap-3">
        <LockIcon aria-hidden="true" className="size-8 text-brand-700" />
        <h1 className="text-h1">{row.user.name}</h1>
        <p className="text-muted-foreground">{t("private")}</p>
      </div>
    );
  }
  const regions = new Intl.DisplayNames([locale], { type: "region" });
  const languages = new Intl.DisplayNames([locale], { type: "language" });
  const facts = [
    { label: t("chapter"), value: profile.chapter },
    {
      label: t("origin"),
      value: profile.originCountryCode && regions.of(profile.originCountryCode),
    },
    { label: t("languages"), value: profile.languages?.map((l) => languages.of(l)).join(", ") },
    { label: t("industry"), value: profile.industry },
    { label: t("skills"), value: profile.skills?.join(", ") },
  ].filter((f) => f.value);

  return (
    <article className="flex flex-col gap-6" data-testid="member-profile">
      <header className="flex flex-col items-start gap-2">
        <div className="flex flex-wrap gap-2">
          {row.isDemo ? <Badge variant="demo">{t("demo")}</Badge> : null}
          {profile.openToCoffee ? <Badge variant="secondary">{t("coffee")}</Badge> : null}
        </div>
        <h1 className="text-h1">{profile.name}</h1>
        {profile.headline ? (
          <p className="text-lead text-muted-foreground">{profile.headline}</p>
        ) : null}
      </header>
      {profile.bio ? <p className="max-w-prose whitespace-pre-line">{profile.bio}</p> : null}
      {facts.length ? (
        <dl className="grid gap-4 sm:grid-cols-2">
          {facts.map((f) => (
            <div key={f.label}>
              <dt className="eyebrow text-muted-foreground">{f.label}</dt>
              <dd className="font-semibold text-ink">{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <CopyLinkButton path={`/members/${slug}`} />
        {isOwner ? (
          <Link href="/settings/profile" className={buttonVariants({ variant: "secondary" })}>
            {t("edit")}
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export default function MemberProfilePage({ params }: Props) {
  return (
    <div className="container-page max-w-3xl py-12">
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <ProfileView params={params} />
      </Suspense>
    </div>
  );
}
