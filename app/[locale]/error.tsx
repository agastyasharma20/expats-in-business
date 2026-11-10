"use client";

import { useEffect } from "react";
import { TriangleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { StatusMessage } from "@/components/common/status-message";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";

export default function LocaleError({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations("errors");
  const common = useTranslations("common");

  useEffect(() => {
    // Details stay in the browser console for developers; users see a plain message.
    console.error(error);
  }, [error]);

  return (
    <StatusMessage
      icon={TriangleAlertIcon}
      eyebrow={t("errorEyebrow")}
      title={t("errorTitle")}
      description={t("errorDescription")}
      actions={
        <>
          <Button onClick={() => retry()}>{t("retry")}</Button>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            {common("backHome")}
          </Link>
        </>
      }
    />
  );
}
