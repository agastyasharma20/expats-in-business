"use client";

import { LogOutIcon, UserIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth/client";
import { Link, useRouter } from "@/lib/i18n/navigation";

type UserMenuProps = { name: string; profileSlug: string | null; showAdmin: boolean };

/** Signed-in account menu: every item navigates or acts. */
export function UserMenu({ name, profileSlug, showAdmin }: UserMenuProps) {
  const t = useTranslations("nav");
  const items = [
    { href: "/dashboard", label: t("dashboard") },
    ...(profileSlug ? [{ href: `/members/${profileSlug}`, label: t("myProfile") }] : []),
    { href: "/settings/profile", label: t("settings") },
    ...(showAdmin ? [{ href: "/admin", label: t("admin") }] : []),
  ];
  const router = useRouter();
  async function signOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" aria-label={t("account")} data-testid="user-menu">
          <UserIcon aria-hidden="true" />
          <span className="hidden max-w-32 truncate sm:inline">{name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((item) => (
          <DropdownMenuItem key={item.href} asChild>
            <Link href={item.href}>{item.label}</Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut}>
          <LogOutIcon aria-hidden="true" />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
