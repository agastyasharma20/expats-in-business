import { getTranslations } from "next-intl/server";

import { ActionForm } from "@/components/common/action-form";
import { buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { QUOTE_REQUESTS_PER_DAY } from "@/config/verification";
import { getDb } from "@/lib/db";
import { reviewEligibility } from "@/lib/directory/eligibility";
import { Link } from "@/lib/i18n/navigation";
import { requestQuote, submitReview } from "@/server/actions/directory";

type Ctx = { slug: string; providerId: string; ownerId: string | null; viewerId: string | null };

/** Quote request form (signed-in members, not the owner). */
export async function QuotePanel({ slug, ownerId, viewerId }: Ctx) {
  const [t, a] = await Promise.all([
    getTranslations("providers.quote"),
    getTranslations("providerArea"),
  ]);
  if (!viewerId) {
    return (
      <Link
        href={`/sign-in?next=${encodeURIComponent(`/providers/${slug}`)}`}
        className={buttonVariants({ size: "lg" })}
      >
        {t("signIn")}
      </Link>
    );
  }
  if (viewerId === ownerId) {
    return (
      <p className="text-muted-foreground">
        {t("own")}{" "}
        <Link href="/provider/inbox" className="font-semibold text-brand-700 underline">
          {a("inbox")}
        </Link>
      </p>
    );
  }
  return (
    <ActionForm
      action={requestQuote}
      submitLabel={t("send")}
      pendingLabel={t("sending")}
      successText={t("sent")}
      errorTexts={{ default: t("errors.default"), rateLimited: t("errors.rateLimited") }}
      className="[&_button]:w-full"
      testId="quote-form"
    >
      <input type="hidden" name="slug" value={slug} />
      <Field
        id="quote-message"
        label={t("message")}
        hint={t("limit", { count: QUOTE_REQUESTS_PER_DAY })}
        required
      >
        {(props) => (
          <Textarea {...props} name="message" rows={5} required minLength={20} maxLength={2000} />
        )}
      </Field>
    </ActionForm>
  );
}

/** Review form only for eligible members; everyone else sees why not (brief 3E). */
export async function ReviewPanel({ slug, providerId, ownerId, viewerId }: Ctx) {
  const t = await getTranslations("providers.review");
  const db = getDb();
  const [quote, shared, existing] = viewerId
    ? await Promise.all([
        db.quoteRequest.count({ where: { providerId, requesterId: viewerId } }),
        ownerId
          ? db.checkIn.count({
              where: { userId: viewerId, event: { checkIns: { some: { userId: ownerId } } } },
            })
          : 0,
        db.review.count({ where: { providerId, authorId: viewerId } }),
      ])
    : [0, 0, 0];
  const verdict = reviewEligibility({
    viewerId,
    ownerId,
    hasQuoteRequest: quote > 0,
    sharedEvent: shared > 0,
    alreadyReviewed: existing > 0,
  });

  if (verdict === "signIn") {
    return (
      <Link
        href={`/sign-in?next=${encodeURIComponent(`/providers/${slug}`)}`}
        className={buttonVariants({ variant: "outline" })}
      >
        {t("signIn")}
      </Link>
    );
  }
  if (verdict === "owner") return null;
  if (verdict === "alreadyReviewed") return <p className="text-muted-foreground">{t("already")}</p>;
  if (verdict === "noInteraction")
    return (
      <p
        className="rounded-lg border border-line bg-canvas p-4 text-small text-muted-foreground"
        data-testid="review-not-eligible"
      >
        {t("notEligible")}
      </p>
    );

  return (
    <ActionForm
      action={submitReview}
      submitLabel={t("submit")}
      pendingLabel={t("submit")}
      successText={t("thanks")}
      errorTexts={{
        default: t("errors.default"),
        noInteraction: t("errors.noInteraction"),
        alreadyReviewed: t("errors.alreadyReviewed"),
        owner: t("errors.owner"),
      }}
      className="rounded-xl border border-line bg-surface p-5"
      testId="review-form"
    >
      <input type="hidden" name="slug" value={slug} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">{t("rating")}</legend>
        <div className="flex flex-wrap gap-2">
          {[5, 4, 3, 2, 1].map((n) => (
            <label
              key={n}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line-strong px-4 has-checked:border-brand-700 has-checked:bg-brand-50"
            >
              <input
                type="radio"
                name="rating"
                value={n}
                required
                className="size-4 accent-brand-700"
              />
              {t("stars", { count: n })}
            </label>
          ))}
        </div>
      </fieldset>
      <Field id="review-body" label={t("body")} required>
        {(props) => (
          <Textarea {...props} name="body" rows={4} required minLength={20} maxLength={1000} />
        )}
      </Field>
    </ActionForm>
  );
}
