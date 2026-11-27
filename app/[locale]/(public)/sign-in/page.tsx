import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { DemoLogin } from "@/components/auth/demo-login";
import { SignInForms } from "@/components/auth/sign-in-forms";
import { googleEnabled } from "@/lib/auth/auth";
import { getSessionUser } from "@/lib/auth/session";
import { getEnv } from "@/lib/env";
import { safeNext } from "@/lib/safe-redirect";

// Personalised (session + ?next): rendered per request.
export const instant = false;

const DEMO_PERSONAS = ["admin", "lead", "priya", "karim", "marta", "sponsor"].map((id) => ({
  id,
  email: `${id === "marta" ? "marta.provider" : id}@demo.eib.local`,
}));

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("title"), robots: { index: false } };
}

export default async function SignInPage({ searchParams }: PageProps<"/[locale]/sign-in">) {
  const next = safeNext((await searchParams).next, getEnv().APP_URL);
  if (await getSessionUser()) redirect(next);
  const t = await getTranslations("auth");
  const demoMode = getEnv().DEMO_MODE;

  return (
    <div className="container-page flex max-w-xl flex-col gap-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1">{t("title")}</h1>
        <p className="text-muted-foreground">{t("lead")}</p>
      </header>
      {demoMode ? <DemoLogin next={next} password="Demo!2026" personas={DEMO_PERSONAS} /> : null}
      <SignInForms next={next} google={googleEnabled} />
    </div>
  );
}
