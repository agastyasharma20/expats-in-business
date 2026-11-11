import type { Metadata } from "next";
import { BellIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { ActionForm } from "@/components/common/action-form";
import { EmptyState } from "@/components/common/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { Link } from "@/lib/i18n/navigation";
import type { NotificationType } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { markNotificationsRead } from "@/server/actions/directory";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("notifications");
  return { title: t("title"), robots: { index: false } };
}

export default async function NotificationsPage() {
  const user = await requireUser("/notifications");
  const [t, locale] = await Promise.all([getTranslations("notifications"), getLocale()]);
  const items = await getDb().notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const unread = items.some((n) => !n.readAt);

  return (
    <div className="container-page flex max-w-3xl flex-col gap-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-h1">{t("title")}</h1>
        {unread ? (
          <ActionForm
            action={markNotificationsRead}
            submitLabel={t("markRead")}
            pendingLabel="…"
            successText={t("marked")}
            errorTexts={{ default: "" }}
            submitVariant="outline"
          >
            {null}
          </ActionForm>
        ) : null}
      </header>
      {items.length ? (
        <ul
          className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface"
          data-testid="notifications"
        >
          {items.map((n) => (
            <li key={n.id} className={cn("flex flex-col gap-1 p-4", !n.readAt && "bg-brand-50")}>
              <Link href={n.href} className="font-semibold text-brand-950 hover:underline">
                {!n.readAt ? (
                  <span
                    aria-hidden="true"
                    className="mr-2 inline-block size-2 rounded-full bg-brand-700 align-middle"
                  />
                ) : null}
                {t(`types.${n.type as NotificationType}`, (n.data ?? {}) as Record<string, string>)}
              </Link>
              <span className="text-small text-muted-foreground">{date.format(n.createdAt)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={BellIcon}
          title={t("title")}
          description={t("empty")}
          action={
            <Link href="/members" className={buttonVariants()}>
              {t("title")}
            </Link>
          }
        />
      )}
    </div>
  );
}
