import { getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";

export default async function BillingSettingsPage() {
  const [t, nav] = await Promise.all([getTranslations("settings.billing"), getTranslations("nav")]);
  return (
    <section className="flex flex-col items-start gap-3 rounded-xl border border-line bg-surface p-6">
      <h2 className="text-h3">{t("plan")}</h2>
      <p className="text-muted-foreground">{t("lead")}</p>
      <Link href="/pricing" className={buttonVariants({ variant: "outline" })}>
        {nav("pricing")}
      </Link>
    </section>
  );
}
