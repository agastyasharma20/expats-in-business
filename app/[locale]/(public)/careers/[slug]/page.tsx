import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeftIcon, CheckCircle2Icon, ClockIcon, MapPinIcon, UsersIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ActionButton } from "@/components/common/action-button";
import { ActionForm } from "@/components/common/action-form";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { controlStyles } from "@/components/ui/control-styles";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth/session";
import { getRole } from "@/lib/growth/opportunities";
import { Link } from "@/lib/i18n/navigation";
import { withAlternates } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { applyForRole, withdrawRoleApplication } from "@/server/actions/roles";

type Props = PageProps<"/[locale]/careers/[slug]">;

export const instant = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const found = await getRole(slug, null);
  if (!found) return {};
  return withAlternates(`/careers/${slug}`, {
    title: found.role.title,
    description: found.role.summary,
  });
}

async function RoleView({ params }: { params: Props["params"] }) {
  await connection();
  const { slug } = await params;
  const user = await getSessionUser();
  const [t, found] = await Promise.all([
    getTranslations("careers"),
    getRole(slug, user?.id ?? null),
  ]);
  if (!found) notFound();
  const { role, application } = found;
  const open = role.status === "open";
  const field = "flex flex-col gap-1.5 text-small font-semibold text-ink";

  return (
    <div className="container-page flex flex-col gap-8 py-10">
      <Link
        href="/careers"
        className="inline-flex min-h-11 items-center gap-2 self-start text-small font-semibold text-primary hover:underline"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        {t("back")}
      </Link>
      <header className="flex animate-rise flex-col gap-3">
        <p className="flex flex-wrap gap-1.5">
          <Badge variant="bubble">{t(`kinds.${role.kind}`)}</Badge>
          <Badge variant="outline">{role.team}</Badge>
          {role.isDemo ? <Badge variant="demo">{t("demo")}</Badge> : null}
          {!open ? <Badge variant="outline">{t("closed")}</Badge> : null}
        </p>
        <h1 className="text-h1">{role.title}</h1>
        <p className="flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPinIcon aria-hidden="true" className="size-4" />
            {role.location}
          </span>
          <span className="flex items-center gap-1.5">
            <ClockIcon aria-hidden="true" className="size-4" />
            {role.commitment}
          </span>
        </p>
        <p className="max-w-3xl text-lg text-ink">{role.summary}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex flex-col gap-8">
          {[
            { key: "responsibilities", items: role.responsibilities },
            { key: "requirements", items: role.requirements },
          ].map((block) =>
            block.items.length ? (
              <section
                key={block.key}
                aria-labelledby={`${block.key}-title`}
                className="flex flex-col gap-3"
              >
                <h2 id={`${block.key}-title`} className="text-h3">
                  {t(block.key)}
                </h2>
                <ul className="flex flex-col gap-2">
                  {block.items.map((item) => (
                    <li key={item} className="flex gap-2 text-ink">
                      <CheckCircle2Icon
                        aria-hidden="true"
                        className="mt-1 size-4 shrink-0 text-success"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null,
          )}
        </div>

        <aside
          className="flex flex-col gap-4 self-start rounded-2xl border border-line bg-surface p-5 shadow-card lg:sticky lg:top-24"
          aria-labelledby="apply-title"
        >
          <h2 id="apply-title" className="flex items-center gap-2 text-h3">
            <UsersIcon aria-hidden="true" className="size-6 text-brand-700" />
            {t("applyTitle")}
          </h2>
          {application && application.status !== "withdrawn" ? (
            <div className="flex flex-col gap-3" data-testid="role-application">
              <Badge
                variant={application.status === "accepted" ? "verified" : "unconfirmed"}
                className="self-start"
              >
                {t(`status.${application.status}`)}
              </Badge>
              {["submitted", "in_review", "waitlisted"].includes(application.status) ? (
                <ActionButton
                  action={withdrawRoleApplication}
                  fields={{ id: application.id }}
                  variant="ghost"
                  toasts={{ withdrawn: t("withdrawn") }}
                >
                  {t("withdraw")}
                </ActionButton>
              ) : null}
            </div>
          ) : !open ? (
            <p className="text-muted-foreground">{t("closedText")}</p>
          ) : user ? (
            <ActionForm
              action={applyForRole}
              submitLabel={t("send")}
              pendingLabel={t("sending")}
              successText={t("sent")}
              errorTexts={{
                default: t("errors.default"),
                exists: t("errors.exists"),
                closed: t("closedText"),
                rateLimited: t("errors.rateLimited"),
              }}
              testId="role-apply"
            >
              <input type="hidden" name="roleId" value={role.id} />
              <label className={field}>
                {t("message")}
                <textarea
                  name="message"
                  required
                  minLength={40}
                  maxLength={2000}
                  rows={6}
                  className={cn(controlStyles, "resize-y py-2.5")}
                />
                <span className="font-normal text-muted-foreground">{t("messageHint")}</span>
              </label>
              <label className={field}>
                {t("portfolio")}
                <input
                  name="portfolioUrl"
                  type="url"
                  placeholder="https://"
                  maxLength={300}
                  className={cn(controlStyles, "h-11")}
                />
              </label>
              <p className="text-small text-muted-foreground">{t("privacy")}</p>
            </ActionForm>
          ) : (
            <Link
              href={`/sign-in?next=${encodeURIComponent(`/careers/${role.slug}`)}`}
              className={buttonVariants()}
            >
              {t("signIn")}
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}

export default function RolePage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="m-6 h-96" />}>
      <RoleView params={params} />
    </Suspense>
  );
}
