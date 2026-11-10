import { getTranslations } from "next-intl/server";

import { ActionForm, Toggle } from "@/components/common/action-form";
import { buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { Link } from "@/lib/i18n/navigation";
import { updateProfile } from "@/server/actions/account";

const FLAGS = [
  "isPublic",
  "showBio",
  "showOrigin",
  "showLanguages",
  "showIndustry",
  "showSkills",
] as const;

export default async function ProfileSettingsPage() {
  const user = await requireUser("/settings/profile");
  const [t, o, profile] = await Promise.all([
    getTranslations("settings"),
    getTranslations("onboarding"),
    getDb().profile.findUnique({ where: { userId: user.id } }),
  ]);
  if (!profile) {
    return (
      <Link href="/onboarding" className={buttonVariants()}>
        {o("title")}
      </Link>
    );
  }
  return (
    <ActionForm
      action={updateProfile}
      submitLabel={t("save")}
      pendingLabel={t("saving")}
      successText={t("saved")}
      errorTexts={{ default: t("error") }}
      testId="profile-form"
    >
      <Field id="headline" label={t("profile.headline")}>
        {(props) => (
          <Input {...props} name="headline" maxLength={120} defaultValue={profile.headline ?? ""} />
        )}
      </Field>
      <Field id="bio" label={t("profile.bio")}>
        {(props) => (
          <Textarea
            {...props}
            name="bio"
            rows={5}
            maxLength={1000}
            defaultValue={profile.bio ?? ""}
          />
        )}
      </Field>
      <Field id="skills" label={t("profile.skills")} hint={t("profile.skillsHint")}>
        {(props) => (
          <Input
            {...props}
            name="skills"
            maxLength={300}
            defaultValue={profile.skills.join(", ")}
          />
        )}
      </Field>
      <Toggle
        name="openToCoffee"
        label={t("profile.coffee")}
        defaultChecked={profile.openToCoffee}
      />
      <fieldset className="flex flex-col gap-1 rounded-xl border border-line p-4">
        <legend className="px-1 font-heading font-semibold text-brand-950">
          {t("profile.visibility")}
        </legend>
        <p className="text-small text-muted-foreground">{t("profile.visibilityLead")}</p>
        {FLAGS.map((flag) => (
          <Toggle
            key={flag}
            name={flag}
            label={t(`profile.${flag}`)}
            defaultChecked={profile[flag]}
          />
        ))}
        <Link
          href={`/members/${profile.slug}`}
          className={buttonVariants({ variant: "link", size: "inline", className: "self-start" })}
        >
          {t("profile.viewPublic")}
        </Link>
      </fieldset>
    </ActionForm>
  );
}
