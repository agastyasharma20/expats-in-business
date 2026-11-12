import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { FlagIcon, MegaphoneIcon, SettingsIcon, ToggleRightIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ActionButton } from "@/components/common/action-button";
import { ActionForm, Toggle } from "@/components/common/action-form";
import { Panel } from "@/components/dashboard/panel";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { controlStyles } from "@/components/ui/control-styles";
import { FLAG_NAMES } from "@/config/features";
import { parseBanner } from "@/lib/admin/rules";
import { isAdmin } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getFlags } from "@/lib/features";
import { cn } from "@/lib/utils";
import { broadcast, setBanner, setFeatureFlag } from "@/server/actions/admin";

// Session-bound page: blocking navigation is expected (no instant prerender).
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminSettings");
  return { title: t("title"), robots: { index: false } };
}

/** Change how the platform behaves without a deploy: feature flags, site banner, announcements. */
export default async function AdminSettingsPage() {
  const user = await requirePermission("admin.access");
  if (!isAdmin(user)) forbidden();
  const db = getDb();
  const [t, flags, bannerRow, chapters] = await Promise.all([
    getTranslations("adminSettings"),
    getFlags(),
    db.siteSetting.findUnique({ where: { key: "banner" } }),
    db.chapter.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const raw = (bannerRow?.value ?? {}) as { text?: string; tone?: string };
  const banner = parseBanner(bannerRow?.value);
  const errors = {
    default: t("errors.default"),
    rateLimited: t("errors.rateLimited"),
    banner: t("errors.banner"),
    broadcast: t("errors.broadcast"),
  };

  return (
    <div className="container-page flex flex-col gap-8 py-10">
      <PageHeader icon={SettingsIcon} title={t("title")} lead={t("lead")} />

      <Panel id="flags" title={t("flags.title")} icon={ToggleRightIcon} testId="feature-flags">
        <p className="text-small text-muted-foreground">{t("flags.lead")}</p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {FLAG_NAMES.map((flag) => (
            <li
              key={flag}
              className="flex items-center justify-between gap-3 rounded-xl border border-line p-4"
            >
              <span className="flex flex-col">
                <span className="font-semibold text-brand-950">{t(`flags.names.${flag}`)}</span>
                <span className="text-small text-muted-foreground">{t(`flags.help.${flag}`)}</span>
              </span>
              <span className="flex items-center gap-2">
                <Badge variant={flags[flag] ? "verified" : "outline"}>
                  {flags[flag] ? t("flags.on") : t("flags.off")}
                </Badge>
                <ActionButton
                  action={setFeatureFlag}
                  fields={{ flag, enabled: flags[flag] ? "false" : "true" }}
                  toasts={{ saved: t("saved") }}
                  errorText={errors.default}
                  aria-label={`${flags[flag] ? t("flags.turnOff") : t("flags.turnOn")}: ${t(`flags.names.${flag}`)}`}
                  testId={`flag-${flag}`}
                >
                  {flags[flag] ? t("flags.turnOff") : t("flags.turnOn")}
                </ActionButton>
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel id="banner" title={t("banner.title")} icon={FlagIcon}>
          <p className="text-small text-muted-foreground">{t("banner.lead")}</p>
          <ActionForm
            action={setBanner}
            submitLabel={t("save")}
            pendingLabel={t("saving")}
            successText={t("saved")}
            errorTexts={errors}
          >
            <label className="flex flex-col gap-1 font-semibold text-ink">
              {t("banner.text")}
              <input
                name="text"
                maxLength={200}
                defaultValue={raw.text ?? ""}
                className={cn(controlStyles, "h-11")}
              />
            </label>
            <label className="flex flex-col gap-1 font-semibold text-ink">
              {t("banner.tone")}
              <select
                name="tone"
                defaultValue={raw.tone === "warning" ? "warning" : "info"}
                className={cn(controlStyles, "h-11")}
              >
                <option value="info">{t("banner.info")}</option>
                <option value="warning">{t("banner.warning")}</option>
              </select>
            </label>
            <Toggle name="enabled" label={t("banner.enabled")} defaultChecked={Boolean(banner)} />
          </ActionForm>
        </Panel>

        <Panel id="broadcast" title={t("broadcast.title")} icon={MegaphoneIcon}>
          <p className="text-small text-muted-foreground">{t("broadcast.lead")}</p>
          <ActionForm
            action={broadcast}
            submitLabel={t("broadcast.send")}
            pendingLabel={t("saving")}
            successText={t.raw("broadcast.sent") as string}
            errorTexts={errors}
          >
            <label className="flex flex-col gap-1 font-semibold text-ink">
              {t("broadcast.audience")}
              <select name="chapterId" className={cn(controlStyles, "h-11")}>
                <option value="all">{t("broadcast.everyone")}</option>
                {chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 font-semibold text-ink">
              {t("broadcast.text")}
              <textarea
                name="text"
                required
                minLength={10}
                maxLength={280}
                rows={3}
                className={cn(controlStyles, "resize-y py-2.5")}
              />
            </label>
          </ActionForm>
        </Panel>
      </div>
    </div>
  );
}
