import { getTranslations } from "next-intl/server";

import { ActionForm } from "@/components/common/action-form";
import { controlStyles } from "@/components/ui/control-styles";
import { cn } from "@/lib/utils";
import { voteForCity } from "@/server/actions/chapters";

/** "Bring EiB to my city": country from the list EiB knows, city as typed (any script). */
export async function VoteCityForm({ countries }: { countries: { code: string; name: string }[] }) {
  const t = await getTranslations("chapters");
  return (
    <ActionForm
      action={voteForCity}
      submitLabel={t("vote.submit")}
      pendingLabel={t("vote.sending")}
      successText={t("vote.thanks")}
      errorTexts={{
        default: t("vote.errors.default"),
        rateLimited: t("vote.errors.rateLimited"),
        exists: t("vote.errors.exists"),
        country: t("vote.errors.default"),
      }}
      className="gap-4 sm:flex-row sm:items-end"
      testId="vote-city"
    >
      <label className="flex flex-col gap-1 text-small font-semibold text-ink">
        {t("vote.country")}
        <select name="countryCode" required className={cn(controlStyles, "h-11 min-w-44")}>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-1 flex-col gap-1 text-small font-semibold text-ink">
        {t("vote.city")}
        <input
          name="city"
          required
          minLength={2}
          maxLength={60}
          placeholder={t("vote.placeholder")}
          className={cn(controlStyles, "h-11")}
        />
      </label>
    </ActionForm>
  );
}
