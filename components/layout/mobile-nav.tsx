"use client";

import { useState } from "react";
import { MenuIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { accountNav, mainNav } from "@/lib/nav";

import { NavLink } from "./nav-link";

/** Menu sheet for screens below 1024px. Server-rendered switchers arrive as `controls`. */
export function MobileNav({ controls }: { controls: React.ReactNode }) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("menu")}>
          <MenuIcon aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(22rem,100vw)] gap-0">
        <SheetHeader>
          <SheetTitle>{t("menuTitle")}</SheetTitle>
        </SheetHeader>
        <nav aria-label={t("main")} className="flex flex-col gap-1 px-4">
          {mainNav.map((item) => (
            <NavLink key={item.id} href={item.href} onNavigate={close} className="text-body">
              {t(item.id)}
            </NavLink>
          ))}
        </nav>
        <div className="mt-6 flex flex-col items-start gap-2 border-t border-line px-4 pt-6">
          {controls}
          <NavLink href={accountNav.signIn.href} onNavigate={close}>
            {t("signIn")}
          </NavLink>
        </div>
      </SheetContent>
    </Sheet>
  );
}
