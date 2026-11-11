import { Suspense } from "react";
import type { Metadata } from "next";
import { MessageCircleQuestionIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ChatPanel } from "@/components/concierge/chat-panel";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { hasEntitlement } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/session";
import { Link } from "@/lib/i18n/navigation";

type Props = PageProps<"/[locale]/concierge">;

const SUGGESTIONS = ["pesel", "trustedProfile", "ksef", "bank", "freeHelp"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("concierge");
  return { title: t("title"), description: t("lead") };
}

async function Concierge({ searchParams }: { searchParams: Props["searchParams"] }) {
  const [user, t, params] = await Promise.all([
    getSessionUser(),
    getTranslations("concierge"),
    searchParams,
  ]);
  if (!user) {
    return (
      <section className="flex flex-col items-start gap-3 rounded-xl border border-line bg-surface p-6 shadow-card">
        <h2 className="text-h3">{t("signInTitle")}</h2>
        <p className="text-muted-foreground">{t("signInLead")}</p>
        <Link href="/sign-in?next=%2Fconcierge" className={buttonVariants()}>
          {t("signIn")}
        </Link>
      </section>
    );
  }
  const q = typeof params.q === "string" ? params.q.slice(0, 200) : undefined;
  return (
    <ChatPanel
      suggestions={SUGGESTIONS.map((k) => t(`suggestions.${k}`))}
      initialQuestion={q}
      unlimited={hasEntitlement(user, "concierge.unlimited")}
    />
  );
}

export default async function ConciergePage({ searchParams }: Props) {
  const t = await getTranslations("concierge");
  return (
    <div className="container-page flex max-w-3xl flex-col gap-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="flex items-center gap-3 text-h1">
          <MessageCircleQuestionIcon aria-hidden="true" className="size-9 text-brand-700" />
          {t("title")}
        </h1>
        <p className="text-muted-foreground">{t("lead")}</p>
      </header>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Concierge searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
