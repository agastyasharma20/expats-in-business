"use client";

import { useState } from "react";
import { CheckIcon, LinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/** Copies the profile URL (old bug 4). Falls back to a selectable field when the Clipboard API is blocked. */
export function CopyLinkButton({ path }: { path: string }) {
  const t = useTranslations("profile");
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const url =
    typeof window === "undefined" ? path : new URL(path, window.location.origin).toString();

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
      toast.success(t("copied"));
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button type="button" variant="outline" onClick={copy}>
        {state === "copied" ? <CheckIcon aria-hidden="true" /> : <LinkIcon aria-hidden="true" />}
        {t("copyLink")}
      </Button>
      {state === "failed" ? (
        <label className="flex w-full flex-col gap-1 text-small">
          <span role="alert">{t("copyFailed")}</span>
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="min-h-11 w-full rounded-md border border-line-strong px-3"
          />
        </label>
      ) : null}
    </div>
  );
}
