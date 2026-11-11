import { getLocale, getTranslations } from "next-intl/server";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { COUNTRY_CODES, LANGUAGE_CODES, displayNames } from "@/lib/countries";
import { getDb } from "@/lib/db";
import { RESIDENCE_SITUATIONS, type OnboardingStep } from "@/lib/onboarding";

const selectClass =
  "min-h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

type ProfileValues = {
  homeChapterId: string | null;
  originCountryCode: string | null;
  languages: string[];
  industryId: string | null;
  headline: string | null;
  arrivalDate: Date | null;
  residenceSituation: string | null;
  goals: { goal: { slug: string } }[];
} | null;

function CheckGrid({
  name,
  options,
  checked,
}: {
  name: string;
  options: readonly (readonly [string, string])[];
  checked: string[];
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-2">
      {options.map(([value, label]) => (
        <label key={value} className="flex min-h-11 cursor-pointer items-center gap-3 text-ink">
          <input
            type="checkbox"
            name={name}
            value={value}
            defaultChecked={checked.includes(value)}
            className="size-5 accent-brand-700"
          />
          {label}
        </label>
      ))}
    </div>
  );
}

/** Server-rendered fields for one onboarding step (options come from the database or Intl). */
export async function OnboardingFields({
  step,
  profile,
}: {
  step: OnboardingStep;
  profile: ProfileValues;
}) {
  const [t, locale] = await Promise.all([getTranslations("onboarding"), getLocale()]);
  const db = getDb();

  switch (step) {
    case "chapter": {
      const chapters = await db.chapter.findMany({
        where: { status: { in: ["live", "launching"] } },
        orderBy: { launchedAt: "asc" },
        select: { id: true, name: true },
      });
      return (
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-2 font-semibold">{t("steps.chapter.label")}</legend>
          {chapters.map((c, i) => (
            <label key={c.id} className="flex min-h-11 cursor-pointer items-center gap-3 text-ink">
              <input
                type="radio"
                name="chapterId"
                value={c.id}
                required
                defaultChecked={profile?.homeChapterId ? profile.homeChapterId === c.id : i === 0}
                className="size-5 accent-brand-700"
              />
              {c.name}
            </label>
          ))}
        </fieldset>
      );
    }
    case "origin":
      return (
        <Field id="origin" label={t("steps.origin.label")} required>
          {(props) => (
            <select
              {...props}
              name="originCountryCode"
              required
              defaultValue={profile?.originCountryCode ?? ""}
              className={selectClass}
            >
              <option value="" disabled>
                —
              </option>
              {displayNames(COUNTRY_CODES, "region", locale).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          )}
        </Field>
      );
    case "languages":
      return (
        <CheckGrid
          name="languages"
          options={displayNames(LANGUAGE_CODES, "language", locale)}
          checked={profile?.languages ?? []}
        />
      );
    case "industry": {
      const industries = await db.industry.findMany({
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true },
      });
      return (
        <>
          <Field id="industry" label={t("steps.industry.label")} required>
            {(props) => (
              <select
                {...props}
                name="industryId"
                required
                defaultValue={profile?.industryId ?? ""}
                className={selectClass}
              >
                <option value="" disabled>
                  —
                </option>
                {industries.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field
            id="headline"
            label={t("steps.industry.headline")}
            hint={t("steps.industry.headlineHint")}
          >
            {(props) => (
              <Input
                {...props}
                name="headline"
                maxLength={120}
                defaultValue={profile?.headline ?? ""}
              />
            )}
          </Field>
        </>
      );
    }
    case "goals": {
      const goals = await db.goal.findMany({
        orderBy: { sortOrder: "asc" },
        select: { slug: true, name: true },
      });
      return (
        <CheckGrid
          name="goals"
          options={goals.map((g) => [g.slug, g.name] as const)}
          checked={profile?.goals.map((g) => g.goal.slug) ?? []}
        />
      );
    }
    case "arrival":
      return (
        <>
          <Field id="arrival" label={t("steps.arrival.date")} required>
            {(props) => (
              <Input
                {...props}
                type="date"
                name="arrivalDate"
                required
                defaultValue={profile?.arrivalDate?.toISOString().slice(0, 10) ?? ""}
              />
            )}
          </Field>
          <Field id="residence" label={t("steps.arrival.residence")} required>
            {(props) => (
              <select
                {...props}
                name="residenceSituation"
                required
                defaultValue={profile?.residenceSituation ?? ""}
                className={selectClass}
              >
                <option value="" disabled>
                  —
                </option>
                {RESIDENCE_SITUATIONS.map((r) => (
                  <option key={r} value={r}>
                    {t(`residence.${r}`)}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </>
      );
  }
}
