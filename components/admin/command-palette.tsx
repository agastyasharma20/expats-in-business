"use client";

import { useEffect, useMemo, useState } from "react";
import { CornerDownLeftIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { controlStyles } from "@/components/ui/control-styles";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

export type PaletteItem = { href: string; label: string; group: string };

/**
 * Ctrl/Cmd + K command palette for the admin area: type to filter, arrows to move, Enter to go.
 * It only navigates; every destination still checks permissions on the server.
 */
export function CommandPalette({ items }: { items: PaletteItem[] }) {
  const t = useTranslations("adminShell");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((i) => `${i.label} ${i.group}`.toLowerCase().includes(q)) : items;
  }, [items, query]);

  function go(item: PaletteItem | undefined) {
    if (!item) return;
    setOpen(false);
    router.push(item.href);
  }

  function changeOpen(value: boolean) {
    setOpen(value);
    setQuery("");
    setActive(0);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => changeOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-strong bg-surface px-3 text-small text-muted-foreground hover:text-ink"
        data-testid="command-palette-trigger"
      >
        <SearchIcon aria-hidden="true" className="size-4" />
        {t("search")}
        <kbd className="ml-2 hidden rounded border border-line px-1.5 font-sans text-[0.75rem] sm:inline">
          Ctrl K
        </kbd>
      </button>
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogTitle className="sr-only">{t("paletteTitle")}</DialogTitle>
          <DialogDescription className="sr-only">{t("paletteHint")}</DialogDescription>
          <div className="border-b border-line p-3">
            <input
              autoFocus
              role="combobox"
              aria-expanded="true"
              aria-controls="palette-results"
              aria-activedescendant={results[active] ? `palette-${active}` : undefined}
              aria-label={t("paletteTitle")}
              value={query}
              placeholder={t("placeholder")}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((i) => Math.min(i + 1, results.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((i) => Math.max(i - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  go(results[active]);
                }
              }}
              className={cn(controlStyles, "h-11")}
            />
          </div>
          <ul id="palette-results" role="listbox" className="max-h-80 overflow-y-auto p-2">
            {results.length ? (
              results.map((item, i) => (
                <li
                  key={item.href}
                  id={`palette-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item)}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-3",
                    i === active ? "bg-brand-50 text-brand-950" : "text-ink",
                  )}
                >
                  <span className="flex flex-col">
                    <span className="font-semibold">{item.label}</span>
                    <span className="text-small text-muted-foreground">{item.group}</span>
                  </span>
                  {i === active ? (
                    <CornerDownLeftIcon aria-hidden="true" className="size-4" />
                  ) : null}
                </li>
              ))
            ) : (
              <li className="p-3 text-muted-foreground">{t("noResults")}</li>
            )}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
