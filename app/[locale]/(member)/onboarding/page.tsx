import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ActionForm } from "@/components/common/action-form";
import { OnboardingFields } from "@/components/onboarding/onboarding-fields";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { Link } from "@/lib/i18n/navigation";
import { ONBOARDING_STEPS } from "@/lib/onboarding";
import { saveOnboardingStep } from "@/server/actions/onboarding";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding");
  return { title: t("title"), robots: { index: false } };
}

/** Six steps; each one saves on its own, so leaving half-way loses nothing. */
export default async function OnboardingPage({ searchParams }: PageProps<"/[locale]/onboarding">) {
  const user = await requireUser("/onboarding");
  const profile = await getDb().profile.findUnique({
    where: { userId: user.id },
    include: { goals: { select: { goal: { select: { slug: true } } } } },
  });
  const done = profile?.onboardingStep ?? 0;
  const requested = Number((await searchParams).step) || done + 1;
  // You can revisit any finished step, but not skip ahead.
  const number = Math.min(Math.max(requested, 1), Math.min(done + 1, ONBOARDING_STEPS.length));
  const step = ONBOARDING_STEPS[number - 1]!;
  const t = await getTranslations("onboarding");
  const last = number === ONBOARDING_STEPS.length;

  return (
    <div className="container-page flex max-w-2xl flex-col gap-6 py-12">
      <header className="flex flex-col gap-2">
        <p className="eyebrow text-brand-700">
          {t("stepOf", { step: number, total: ONBOARDING_STEPS.length })}
        </p>
        <h1 className="text-h1">{t(`steps.${step}.title`)}</h1>
        <p className="text-muted-foreground">{t(`steps.${step}.lead`)}</p>
        <div
          role="progressbar"
          aria-label={t("title")}
          aria-valuemin={1}
          aria-valuemax={ONBOARDING_STEPS.length}
          aria-valuenow={number}
          className="h-2 overflow-hidden rounded-full bg-brand-100"
        >
          <div
            className="h-full origin-left bg-brand-700"
            style={{ transform: `scaleX(${number / ONBOARDING_STEPS.length})` }}
          />
        </div>
      </header>
      <ActionForm
        key={step}
        action={saveOnboardingStep}
        submitLabel={last ? t("finish") : t("next")}
        pendingLabel={t("saved")}
        errorTexts={{ default: t("errors.required") }}
        className="rounded-xl border border-line bg-surface p-6 shadow-card"
        testId="onboarding-form"
      >
        <input type="hidden" name="step" value={step} />
        <OnboardingFields step={step} profile={profile} />
      </ActionForm>
      {number > 1 ? (
        <Link
          href={`/onboarding?step=${number - 1}`}
          className={buttonVariants({ variant: "link", size: "inline" })}
        >
          {t("back")}
        </Link>
      ) : null}
    </div>
  );
}
