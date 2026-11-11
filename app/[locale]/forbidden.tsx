import { ShieldAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { StatusMessage } from "@/components/common/status-message";
import { buttonVariants } from "@/components/ui/button";
import { getFact } from "@/config/facts";
import { Link } from "@/lib/i18n/navigation";

/** Styled 403, rendered by forbidden() from requirePermission. */
export default function Forbidden() {
  const t = useTranslations("errors");
  const nav = useTranslations("nav");
  return (
    <StatusMessage
      icon={ShieldAlertIcon}
      eyebrow={t("forbiddenEyebrow")}
      title={t("forbiddenTitle")}
      description={t("forbiddenDescription")}
      actions={
        <>
          <Link href="/dashboard" className={buttonVariants()}>
            {nav("dashboard")}
          </Link>
          <a
            href={`mailto:${getFact("contact.email").value}`}
            className={buttonVariants({ variant: "outline" })}
          >
            {t("contact")}
          </a>
        </>
      }
    />
  );
}
