import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { BookOpenIcon, HandshakeIcon, MicIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ActionForm } from "@/components/common/action-form";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { controlStyles } from "@/components/ui/control-styles";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import { applyToContribute } from "@/server/actions/applications";
import { withAlternates } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("involved");
  return withAlternates("/get-involved", { title: t("title"), description: t("lead") });
}

const WAYS = [
  { type: "speaker", icon: MicIcon },
  { type: "story", icon: BookOpenIcon },
  { type: "contributor", icon: HandshakeIcon },
] as const;

async function ApplyArea() {
  await connection();
  const [t, user] = await Promise.all([getTranslations("involved"), getSessionUser()]);
  if (!user) {
    return (
      <Link
        href={`/sign-in?next=${encodeURIComponent("/get-involved")}`}
        className={buttonVariants({ size: "lg", className: "self-start" })}
      >
        {t("signIn")}
      </Link>
    );
  }
  const mine = await getDb().application.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: { id: true, type: true, status: true, answers: true },
  });
  const field = "flex flex-col gap-1 font-semibold text-ink";
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <ActionForm
        action={applyToContribute}
        submitLabel={t("send")}
        pendingLabel={t("sending")}
        successText={t("sent")}
        errorTexts={{
          default: t("errors.default"),
          exists: t("errors.exists"),
          rateLimited: t("errors.rateLimited"),
        }}
        className="rounded-2xl border border-line bg-surface p-6 shadow-card"
        testId="involved-form"
      >
        <label className={field}>
          {t("fields.type")}
          <select name="type" className={cn(controlStyles, "h-11")}>
            {WAYS.map((w) => (
              <option key={w.type} value={w.type}>
                {t(`ways.${w.type}.title`)}
              </option>
            ))}
          </select>
        </label>
        <label className={field}>
          {t("fields.topic")}
          <input
            name="topic"
            required
            minLength={5}
            maxLength={120}
            className={cn(controlStyles, "h-11")}
          />
        </label>
        <label className={field}>
          {t("fields.pitch")}
          <textarea
            name="pitch"
            required
            minLength={40}
            maxLength={2000}
            rows={6}
            className={cn(controlStyles, "resize-y py-2.5")}
          />
          <span className="text-small font-normal text-muted-foreground">
            {t("fields.pitchHint")}
          </span>
        </label>
        <label className={field}>
          {t("fields.link")}
          <input
            name="link"
            type="url"
            placeholder="https://"
            maxLength={300}
            className={cn(controlStyles, "h-11")}
          />
        </label>
        <p className="text-small text-muted-foreground">{t("privacy")}</p>
      </ActionForm>
      <aside className="flex flex-col gap-3">
        <h2 className="text-h3">{t("mine")}</h2>
        {mine.length ? (
          <ul className="flex flex-col gap-2" data-testid="my-applications">
            {mine.map((a) => (
              <li
                key={a.id}
                className="flex flex-col gap-1 rounded-xl border border-line bg-surface p-3"
              >
                <span className="font-semibold text-brand-950">
                  {(a.answers as { topic?: string }).topic ?? t(`ways.${a.type}.title`)}
                </span>
                <span className="flex gap-2">
                  <Badge variant="secondary">{t(`ways.${a.type}.title`)}</Badge>
                  <Badge
                    variant={
                      a.status === "accepted"
                        ? "verified"
                        : a.status === "declined"
                          ? "outline"
                          : "unconfirmed"
                    }
                  >
                    {t(`status.${a.status}`)}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-small text-muted-foreground">{t("none")}</p>
        )}
      </aside>
    </div>
  );
}

export default async function GetInvolvedPage() {
  const t = await getTranslations("involved");
  return (
    <div className="container-page flex flex-col gap-10 py-12">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      <ul className="grid gap-4 md:grid-cols-3">
        {WAYS.map((w, i) => (
          <li
            key={w.type}
            className="flex animate-rise flex-col gap-3 rounded-2xl border border-line bg-surface p-6 shadow-card"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-brand-100 text-brand-950">
              <w.icon aria-hidden="true" className="size-6" />
            </span>
            <h2 className="text-h3">{t(`ways.${w.type}.title`)}</h2>
            <p className="text-ink">{t(`ways.${w.type}.text`)}</p>
          </li>
        ))}
      </ul>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ApplyArea />
      </Suspense>
    </div>
  );
}
