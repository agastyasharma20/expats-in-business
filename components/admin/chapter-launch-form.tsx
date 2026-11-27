import { getTranslations } from "next-intl/server";

import { ActionForm } from "@/components/common/action-form";
import { controlStyles } from "@/components/ui/control-styles";
import { LAUNCH_STATUSES } from "@/lib/growth/launch";
import { cn } from "@/lib/utils";
import { launchChapter } from "@/server/actions/chapter-launch";

const input = cn(controlStyles, "h-11");
const field = "flex flex-col gap-1 text-small font-semibold text-ink";
const hint = "text-small font-normal text-muted-foreground";

type CountryOption = {
  code: string;
  name: string;
  defaultTimezone: string;
  defaultCurrency: string;
};

/** Launch a city: three required fields, everything else defaults from the country. */
export async function ChapterLaunchForm({ countries }: { countries: CountryOption[] }) {
  const t = await getTranslations("adminChapters");
  return (
    <ActionForm
      action={launchChapter}
      submitLabel={t("launch")}
      pendingLabel={t("launching")}
      successText={t("launched")}
      errorTexts={{
        default: t("errors.default"),
        rateLimited: t("errors.rateLimited"),
        country: t("errors.country"),
        exists: t("errors.exists"),
        leadNotFound: t("errors.leadNotFound"),
      }}
      testId="chapter-launch"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <label className={field}>
          {t("fields.city")}
          <input name="city" required minLength={2} maxLength={60} className={input} />
        </label>
        <label className={field}>
          {t("fields.country")}
          <select name="countryCode" required defaultValue="" className={input}>
            <option value="" disabled>
              {t("fields.countryPlaceholder")}
            </option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className={field}>
          {t("fields.status")}
          <select name="status" defaultValue="launching" className={input}>
            {LAUNCH_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </select>
          <span className={hint}>{t("fields.statusHint")}</span>
        </label>
        <label className={field}>
          {t("fields.timezone")}
          <input name="timezone" maxLength={60} placeholder="Europe/Warsaw" className={input} />
          <span className={hint}>{t("fields.defaultHint")}</span>
        </label>
        <label className={field}>
          {t("fields.currency")}
          <input
            name="currency"
            maxLength={3}
            placeholder="PLN"
            className={cn(input, "uppercase")}
          />
          <span className={hint}>{t("fields.defaultHint")}</span>
        </label>
        <label className={field}>
          {t("fields.lead")}
          <input name="leadEmail" type="email" maxLength={200} className={input} />
          <span className={hint}>{t("fields.leadHint")}</span>
        </label>
        <label className={cn(field, "md:col-span-3")}>
          {t("fields.tagline")}
          <input name="tagline" maxLength={120} className={input} />
        </label>
      </div>
    </ActionForm>
  );
}
