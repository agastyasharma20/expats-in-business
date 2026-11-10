import { CompassIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { StatusMessage } from "@/components/common/status-message";
import { buttonVariants } from "@/components/ui/button";
import { getFact } from "@/config/facts";
import { Link } from "@/lib/i18n/navigation";

export default function LocaleNotFound() {
  const t = useTranslations("errors");
  const common = useTranslations("common");
  return (
    <StatusMessage
      icon={CompassIcon}
      eyebrow={t("notFoundEyebrow")}
      title={t("notFoundTitle")}
      description={t("notFoundDescription")}
      actions={
        <>
          <Link href="/" className={buttonVariants()}>
            {common("backHome")}
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
