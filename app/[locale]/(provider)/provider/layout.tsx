import { forbidden } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { SettingsTabs } from "@/components/settings/settings-tabs";
import { can } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";

export const instant = false;

/** Provider area: only members who own a provider profile (a capability, not a role). */
export default async function ProviderLayout({ children }: LayoutProps<"/[locale]/provider">) {
  const user = await requireUser("/provider/inbox");
  if (!can(user, "provider.inbox")) forbidden();
  const t = await getTranslations("providerArea");
  return (
    <div className="container-page flex flex-col gap-6 py-12">
      <SettingsTabs
        label={t("nav")}
        tabs={[
          { href: "/provider/inbox", label: t("inbox") },
          { href: "/provider/analytics", label: t("analytics") },
        ]}
      />
      {children}
    </div>
  );
}
