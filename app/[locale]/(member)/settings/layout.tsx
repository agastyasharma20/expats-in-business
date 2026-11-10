import { getTranslations } from "next-intl/server";

import { SettingsTabs } from "@/components/settings/settings-tabs";

const TABS = ["profile", "account", "email", "billing", "privacy"] as const;

export default async function SettingsLayout({ children }: LayoutProps<"/[locale]/settings">) {
  const t = await getTranslations("settings");
  return (
    <div className="container-page flex max-w-3xl flex-col gap-6 py-12">
      <h1 className="text-h1">{t("title")}</h1>
      <SettingsTabs
        label={t("title")}
        tabs={TABS.map((tab) => ({ href: `/settings/${tab}`, label: t(`tabs.${tab}`) }))}
      />
      <div>{children}</div>
    </div>
  );
}
