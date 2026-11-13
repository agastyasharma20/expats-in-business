import { BellIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { can } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/session";
import { moderatesAnything } from "@/lib/community/groups";
import { getDb } from "@/lib/db";
import { getFlags } from "@/lib/features";
import { Link } from "@/lib/i18n/navigation";
import { accountNav } from "@/lib/nav";
import { unreadCount } from "@/lib/notifications";

import { UserMenu } from "./user-menu";

export function SignInButton() {
  const t = useTranslations("nav");
  return (
    <Button asChild variant="outline" className="hidden sm:inline-flex">
      <Link href={accountNav.signIn.href}>{t("signIn")}</Link>
    </Button>
  );
}

/** Header account slot: reads the session, so it renders inside <Suspense> (fallback = sign-in). */
export async function AccountNav() {
  const user = await getSessionUser();
  if (!user) return <SignInButton />;
  const [profile, unread, t, flags, moderator] = await Promise.all([
    getDb().profile.findUnique({ where: { userId: user.id }, select: { slug: true } }),
    unreadCount(user.id),
    getTranslations("notifications"),
    getFlags(),
    moderatesAnything(user),
  ]);
  return (
    <>
      <Link
        href="/notifications"
        aria-label={t("bell", { count: unread })}
        data-testid="notification-bell"
        className="relative inline-flex size-11 items-center justify-center rounded-md text-brand-950 hover:bg-brand-50"
      >
        <BellIcon aria-hidden="true" className="size-5" />
        {unread ? (
          <span
            aria-hidden="true"
            className="absolute top-1.5 right-1.5 min-w-5 rounded-full bg-primary px-1 text-center text-[0.6875rem] leading-5 font-bold text-primary-foreground"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </Link>
      <UserMenu
        name={user.name}
        profileSlug={profile?.slug ?? null}
        showAdmin={can(user, "admin.access")}
        showProvider={can(user, "provider.inbox")}
        showRoulette={flags.coffeeRoulette}
        showModeration={moderator}
      />
    </>
  );
}
