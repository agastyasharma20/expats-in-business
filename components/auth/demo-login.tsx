"use client";

import { useState } from "react";
import { CheckIcon, FlaskConicalIcon, Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

type DemoLoginProps = {
  next: string;
  password: string;
  personas: readonly { id: string; email: string }[];
};

/**
 * Sandbox sign-in: one click on a person signs in as that demo account. It reuses the normal
 * password sign-in (no extra server endpoint), so it exists only where the server renders it:
 * DEMO_MODE on. Announces progress and errors to screen readers.
 */
export function DemoLogin({ next, password, personas }: DemoLoginProps) {
  const t = useTranslations("auth");
  const [active, setActive] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signInAs(persona: string, email: string) {
    if (active) return;
    setActive(persona);
    setError(null);
    const { error: err } = await authClient.signIn.email({
      email,
      password,
    });
    if (err) {
      setActive(null);
      setError(err.status === 429 ? t("rateLimited") : t("error"));
      return;
    }
    setDone(persona);
    // Full navigation so the server renders the signed-in layout straight away.
    window.location.assign(next);
  }

  const status = done
    ? t("demoOpening", { name: t(`demoPersonas.${done}.name`) })
    : active
      ? t("demoSigningIn", { name: t(`demoPersonas.${active}.name`) })
      : "";

  return (
    <section
      aria-labelledby="demo-title"
      data-testid="demo-login"
      className="flex flex-col gap-4 rounded-2xl border border-brand-200 bg-brand-50 p-6"
    >
      <header className="flex items-start gap-3">
        <span className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-brand-950">
          <FlaskConicalIcon aria-hidden="true" className="size-5" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 id="demo-title" className="text-h3">
            {t("demoTitle")}
          </h2>
          <p className="text-small text-ink">{t("demoQuick")}</p>
        </div>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2">
        {personas.map(({ id: persona, email }, i) => {
          const busy = active === persona;
          return (
            <li key={persona} style={{ animationDelay: `${i * 60}ms` }} className="animate-rise">
              <button
                type="button"
                onClick={() => signInAs(persona, email)}
                disabled={active !== null}
                data-testid={`demo-${persona}`}
                className={cn(
                  "group flex min-h-14 w-full items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-left shadow-card",
                  "transition-[transform,box-shadow] duration-150 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 motion-safe:active:scale-[0.98]",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
                  "disabled:cursor-wait disabled:opacity-70",
                )}
              >
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-950 font-heading text-body font-bold text-on-dark"
                >
                  {busy ? (
                    done === persona ? (
                      <CheckIcon className="size-5" />
                    ) : (
                      <Loader2Icon className="size-5 motion-safe:animate-spin" />
                    )
                  ) : (
                    t(`demoPersonas.${persona}.name`).charAt(0)
                  )}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="font-heading font-semibold text-brand-950">
                    {t(`demoPersonas.${persona}.name`)}
                  </span>
                  <span className="text-small text-muted-foreground">
                    {t(`demoPersonas.${persona}.role`)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p
        role="status"
        aria-live="polite"
        className="min-h-6 text-small font-semibold text-brand-950"
      >
        {status}
      </p>
      {error ? (
        <p role="alert" className="text-small font-semibold text-danger">
          {error}
        </p>
      ) : null}
      <p className="text-small text-muted-foreground">{t("demoNote", { password })}</p>
    </section>
  );
}
