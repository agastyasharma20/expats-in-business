import { Suspense } from "react";
import { useTranslations } from "next-intl";

import { AccountNav, SignInButton } from "@/components/auth/account-nav";
import { FestivalSpotlightPill } from "@/components/festivals/spotlight";
import { InstallButton } from "@/components/pwa/install-button";
import { Link } from "@/lib/i18n/navigation";
import { mainNav } from "@/lib/nav";

import { ChapterSwitcher } from "./chapter-switcher";
import { HeaderScrollState } from "./header-scroll-state";
import { LanguageSwitcher } from "./language-switcher";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { NavLink } from "./nav-link";

const HEADER_ID = "site-header";

/**
 * Sticky header. On scroll it moves up by 8px and the logo scales to 90%: transforms only, so
 * nothing below shifts. All links come from lib/nav.ts.
 */
export function SiteHeader() {
  const t = useTranslations("nav");

  return (
    <header
      id={HEADER_ID}
      className="group/header sticky top-0 z-40 border-b border-line bg-surface pt-2 transition-transform duration-(--duration-micro) ease-(--ease-brand) data-scrolled:-translate-y-2 data-scrolled:shadow-card"
    >
      <HeaderScrollState headerId={HEADER_ID} />
      <div className="container-page flex h-16 items-center gap-4">
        <Link
          href="/"
          aria-label={t("home")}
          className="flex shrink-0 origin-left items-center rounded-md transition-transform duration-(--duration-micro) group-data-scrolled/header:scale-90"
        >
          <Logo priority className="h-9" />
        </Link>
        <nav aria-label={t("main")} className="hidden flex-1 items-center gap-1 lg:flex">
          {mainNav.map((item) => (
            <NavLink key={item.id} href={item.href}>
              {t(item.id)}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <Suspense fallback={null}>
            <FestivalSpotlightPill />
          </Suspense>
          <InstallButton iconOnlyOnSmall />
          <div className="hidden items-center gap-1 lg:flex">
            <ChapterSwitcher />
            <LanguageSwitcher />
          </div>
          <Suspense fallback={<SignInButton />}>
            <AccountNav />
          </Suspense>
          <MobileNav
            controls={
              <>
                <ChapterSwitcher className="px-3" />
                <LanguageSwitcher className="px-3" />
              </>
            }
          />
        </div>
      </div>
    </header>
  );
}
