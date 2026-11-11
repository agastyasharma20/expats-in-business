import { CheckIcon, MailIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ActionForm } from "@/components/common/action-form";
import { buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { getDb } from "@/lib/db";
import { Link } from "@/lib/i18n/navigation";
import { sendConnectionRequest } from "@/server/actions/directory";

/**
 * Connect on a member profile (double opt-in). Contact details are shown only after both sides
 * accepted, and only to the two people concerned.
 */
export async function ConnectPanel({
  slug,
  profileUserId,
  viewerId,
}: {
  slug: string;
  profileUserId: string;
  viewerId: string | null;
}) {
  const t = await getTranslations("members");
  if (!viewerId) {
    return (
      <Link
        href={`/sign-in?next=${encodeURIComponent(`/members/${slug}`)}`}
        className={buttonVariants({ variant: "outline" })}
      >
        {t("signIn")}
      </Link>
    );
  }
  if (viewerId === profileUserId) return null;

  const db = getDb();
  const connection = await db.connection.findFirst({
    where: {
      OR: [
        { requesterId: viewerId, addresseeId: profileUserId },
        { requesterId: profileUserId, addresseeId: viewerId },
      ],
    },
    select: { status: true, addresseeId: true },
  });

  if (connection?.status === "accepted") {
    const person = await db.user.findUnique({
      where: { id: profileUserId },
      select: { email: true },
    });
    return (
      <section
        className="flex flex-col gap-2 rounded-xl border border-success/40 bg-success-50 p-4"
        data-testid="contact"
      >
        <p className="flex items-center gap-2 font-semibold text-success">
          <CheckIcon aria-hidden="true" className="size-5" />
          {t("connected")}
        </p>
        {person ? (
          <p className="flex items-center gap-2 text-ink">
            <MailIcon aria-hidden="true" className="size-4 text-brand-700" />
            <span className="sr-only">{t("contact")}: </span>
            <a href={`mailto:${person.email}`} className="font-semibold text-brand-700 underline">
              {person.email}
            </a>
          </p>
        ) : null}
        <p className="text-small text-muted-foreground">{t("contactHint")}</p>
      </section>
    );
  }
  if (connection?.status === "pending") {
    return connection.addresseeId === viewerId ? (
      <Link href="/connections" className={buttonVariants()}>
        {t("pending")}
      </Link>
    ) : (
      <p role="status" className="font-semibold text-muted-foreground" data-testid="connect-status">
        {t("pending")}
      </p>
    );
  }
  if (connection?.status === "declined") return null;

  return (
    <ActionForm
      action={sendConnectionRequest}
      submitLabel={t("sendRequest")}
      pendingLabel={t("sendRequest")}
      successText={t("requestSent")}
      errorTexts={{
        default: t("errors.default"),
        exists: t("errors.exists"),
        declined: t("errors.declined"),
        rateLimited: t("errors.rateLimited"),
      }}
      className="w-full max-w-md rounded-xl border border-line bg-surface p-4"
      testId="connect-form"
    >
      <input type="hidden" name="slug" value={slug} />
      <Field id="connect-message" label={t("connectMessage")} hint={t("connectMessageHint")}>
        {(props) => <Textarea {...props} name="message" rows={3} maxLength={300} />}
      </Field>
    </ActionForm>
  );
}
