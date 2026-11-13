"use client";

import { useTransition } from "react";
import { CheckIcon, LanguagesIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { locales, type Locale } from "@/lib/i18n/routing";
import { rememberLocale } from "@/server/actions/preferences";
import { cn } from "@/lib/utils";

type LanguageSwitcherProps = {
  /** "dark" for use on Deep Teal (footer). */
  tone?: "light" | "dark";
  className?: string;
};

/** Switches the UI language while staying on the same page. Language names are endonyms. */
export function LanguageSwitcher({ tone = "light", className }: LanguageSwitcherProps) {
  const t = useTranslations("language");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={tone === "dark" ? "outline" : "ghost"}
          aria-busy={pending || undefined}
          className={cn(
            tone === "dark" &&
              "border-on-dark-muted bg-transparent text-on-dark hover:bg-brand-800 aria-expanded:bg-brand-800",
            className,
          )}
        >
          <LanguagesIcon aria-hidden="true" />
          <span className="sr-only">{t("label")}: </span>
          {t(`names.${locale}`)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel>{t("label")}</DropdownMenuLabel>
        {locales.map((option) => (
          <DropdownMenuItem
            key={option}
            lang={option}
            aria-current={option === locale ? "true" : undefined}
            onSelect={() => {
              if (option === locale) return;
              // Signed-in members: emails follow this choice too (no-op for visitors).
              void rememberLocale(option);
              startTransition(() => router.replace(pathname, { locale: option }));
            }}
          >
            <span className="flex-1">{t(`names.${option}`)}</span>
            {option === locale ? <CheckIcon aria-hidden="true" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
