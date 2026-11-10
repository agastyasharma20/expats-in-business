"use client";

import { Fragment, useTransition } from "react";
import { CheckIcon, MapPinIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GLOBAL_CHAPTER, type ChapterOption } from "@/lib/chapters-shared";
import { setPreferredChapter } from "@/server/actions/preferences";

type ChapterSwitcherMenuProps = {
  options: ChapterOption[];
  current: string;
  className?: string;
};

/** Picks Global or a chapter; saves it as a preference cookie and refreshes server data. */
export function ChapterSwitcherMenu({ options, current, className }: ChapterSwitcherMenuProps) {
  const t = useTranslations("chapter");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const currentOption = options.find((option) => option.slug === current);
  const currentName = currentOption?.name ?? t("global");

  const choose = (slug: string, name: string) => {
    if (slug === current) return;
    startTransition(async () => {
      const result = await setPreferredChapter({ slug });
      if (result.ok) {
        toast(t("saved", { name }));
        router.refresh();
      }
    });
  };

  const items = [{ slug: GLOBAL_CHAPTER, name: t("global"), status: "live" as const }, ...options];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" aria-busy={pending || undefined} className={className}>
          <MapPinIcon aria-hidden="true" />
          <span className="sr-only">{t("label")}: </span>
          {currentName}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel>{t("choose")}</DropdownMenuLabel>
        {items.map((item, index) => (
          <Fragment key={item.slug}>
            {index === 1 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem
              aria-current={item.slug === current ? "true" : undefined}
              onSelect={() => choose(item.slug, item.name)}
            >
              <span className="flex-1">{item.name}</span>
              {item.status === "launching" ? (
                <Badge variant="secondary">{t("launching")}</Badge>
              ) : null}
              {item.slug === current ? <CheckIcon aria-hidden="true" /> : null}
            </DropdownMenuItem>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
