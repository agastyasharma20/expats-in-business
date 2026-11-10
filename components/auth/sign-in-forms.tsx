"use client";

import { useState } from "react";
import { MailIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";

type SignInFormsProps = {
  next: string;
  google: boolean;
  demo: { password: string; accounts: string[] } | null;
};

/** Magic link (primary), password (demo accounts), Google when configured. */
export function SignInForms({ next, google, demo }: SignInFormsProps) {
  const t = useTranslations("auth");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const fail = (status?: number) => setError(status === 429 ? t("rateLimited") : t("error"));

  async function sendLink(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const { error: err } = await authClient.signIn.magicLink({ email, callbackURL: next });
    setPending(false);
    if (err) fail(err.status);
    else setSentTo(email);
  }

  async function signInWithPassword(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const { error: err } = await authClient.signIn.email({ email, password });
    if (err) {
      setPending(false);
      fail(err.status);
      return;
    }
    // Full navigation so the server renders the signed-in layout straight away.
    window.location.assign(next);
  }

  if (sentTo) {
    return (
      <div
        role="status"
        className="flex flex-col items-start gap-3 rounded-xl border border-line bg-surface p-6"
      >
        <MailIcon aria-hidden="true" className="size-8 text-brand-700" />
        <h2 className="text-h3">{t("checkInbox")}</h2>
        <p className="text-muted-foreground">{t("checkInboxBody", { email: sentTo })}</p>
        <Button variant="link" size="inline" onClick={() => setSentTo(null)}>
          {t("useAnother")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <form
        onSubmit={sendLink}
        className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6 shadow-card"
      >
        <Field id="signin-email" label={t("email")} required>
          {(props) => (
            <Input
              {...props}
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? t("sending") : t("sendLink")}
        </Button>
        {google ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => authClient.signIn.social({ provider: "google", callbackURL: next })}
          >
            {t("google")}
          </Button>
        ) : null}
      </form>

      <details className="rounded-xl border border-line bg-surface p-6">
        <summary className="min-h-11 cursor-pointer font-heading font-semibold text-brand-950">
          {t("orPassword")}
        </summary>
        <form onSubmit={signInWithPassword} className="mt-4 flex flex-col gap-4">
          <Field id="signin-password" label={t("password")} required>
            {(props) => (
              <Input
                {...props}
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </Field>
          <Button type="submit" variant="secondary" disabled={pending}>
            {t("signIn")}
          </Button>
        </form>
      </details>

      {error ? (
        <p role="alert" className="font-semibold text-danger">
          {error}
        </p>
      ) : null}

      {demo ? (
        <section
          aria-labelledby="demo-title"
          className="rounded-xl border border-warning/40 bg-warning-50 p-6"
        >
          <h2 id="demo-title" className="text-h3 text-warning">
            {t("demoTitle")}
          </h2>
          <p className="text-small text-warning">{t("demoLead", { password: demo.password })}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {demo.accounts.map((account) => (
              <li key={account}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={t("demoUse", { email: account })}
                  onClick={() => {
                    setEmail(account);
                    setPassword(demo.password);
                  }}
                >
                  {account.split("@")[0]}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
