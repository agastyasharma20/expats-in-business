import { Suspense } from "react";
import type { Metadata } from "next";
import { forbidden, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { ActionForm, Toggle } from "@/components/common/action-form";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { VERIFICATION_CRITERIA } from "@/config/verification";
import { isAdmin } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { Link } from "@/lib/i18n/navigation";
import { decideVerification } from "@/server/actions/directory";

type Props = PageProps<"/[locale]/admin/providers/[id]">;

export const instant = false;
export const metadata: Metadata = { robots: { index: false } };

async function Checklist({ params }: Props) {
  const { id } = await params;
  const user = await requireUser(`/admin/providers/${id}`);
  if (!isAdmin(user)) forbidden();
  const provider = await getDb().provider.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      verificationStatus: true,
      category: { select: { name: true } },
    },
  });
  if (!provider) notFound();
  const [t, c] = await Promise.all([
    getTranslations("adminProviders"),
    getTranslations("criteria"),
  ]);

  return (
    <>
      <header className="flex flex-col items-start gap-2">
        <Badge variant="secondary">{provider.category.name}</Badge>
        <h1 className="text-h1">{provider.name}</h1>
        <p className="text-muted-foreground">{provider.description}</p>
        <Link
          href={`/providers/${provider.slug}`}
          className="font-semibold text-brand-700 underline"
        >
          /providers/{provider.slug}
        </Link>
        <Badge variant={provider.verificationStatus === "verified" ? "verified" : "outline"}>
          {provider.verificationStatus}
        </Badge>
      </header>
      <div className="grid gap-6 lg:grid-cols-2">
        <ActionForm
          action={decideVerification}
          submitLabel={t("approve")}
          pendingLabel="…"
          successText={t("approved")}
          errorTexts={{ default: t("incomplete"), incomplete: t("incomplete") }}
          className="rounded-xl border border-line bg-surface p-6"
          testId="approve-form"
        >
          <input type="hidden" name="providerId" value={provider.id} />
          <input type="hidden" name="decision" value="approve" />
          <fieldset className="flex flex-col gap-1">
            <legend className="mb-2 font-heading font-semibold text-brand-950">
              {t("checklist")}
            </legend>
            {VERIFICATION_CRITERIA.map((criterion) => (
              <div key={criterion.id} className="flex flex-col">
                <Toggle name={criterion.id} label={c(`${criterion.titleKey}.title`)} />
                <p className="pl-8 text-small text-muted-foreground">
                  {c(`${criterion.titleKey}.body`)}
                </p>
              </div>
            ))}
          </fieldset>
          <Field id="approve-notes" label={t("notes")}>
            {(props) => <Textarea {...props} name="notes" rows={3} maxLength={1000} />}
          </Field>
        </ActionForm>
        <ActionForm
          action={decideVerification}
          submitLabel={t("reject")}
          pendingLabel="…"
          successText={t("rejected")}
          errorTexts={{ default: t("incomplete") }}
          submitVariant="outline"
          className="self-start rounded-xl border border-line bg-surface p-6"
          testId="reject-form"
        >
          <input type="hidden" name="providerId" value={provider.id} />
          <input type="hidden" name="decision" value="reject" />
          <Field id="reject-notes" label={t("notes")}>
            {(props) => <Textarea {...props} name="notes" rows={3} maxLength={1000} />}
          </Field>
        </ActionForm>
      </div>
    </>
  );
}

export default function AdminProviderPage(props: Props) {
  return (
    <div className="container-page flex flex-col gap-6 py-12">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Checklist {...props} />
      </Suspense>
    </div>
  );
}
