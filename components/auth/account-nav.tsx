import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { can } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { Link } from "@/lib/i18n/navigation";
import { accountNav } from "@/lib/nav";

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
  const profile = await getDb().profile.findUnique({
    where: { userId: user.id },
    select: { slug: true },
  });
  return (
    <UserMenu
      name={user.name}
      profileSlug={profile?.slug ?? null}
      showAdmin={can(user, "admin.access")}
    />
  );
}
