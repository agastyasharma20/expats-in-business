"use client";

import { useState } from "react";
import { MailIcon } from "lucide-react";

type Props = { memberId: string; name: string; label: string; error: string };

const linkStyle =
  "inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-small font-semibold text-brand-700 hover:bg-brand-50";

/** "Show email" button: fetches the address on click, so it is not in the page source. */
export function RevealEmail({ memberId, name, label, error }: Props) {
  const [email, setEmail] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function reveal() {
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch(`/api/team/email/${memberId}`, { method: "POST" });
      if (!response.ok) throw new Error("failed");
      setEmail(((await response.json()) as { email: string }).email);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  if (email) {
    return (
      <a href={`mailto:${email}`} className={linkStyle}>
        <MailIcon aria-hidden className="size-4" />
        {email}
      </a>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={reveal}
        disabled={busy}
        aria-label={`${label}: ${name}`}
        className={linkStyle}
      >
        <MailIcon aria-hidden className="size-4" />
        {label}
      </button>
      {failed ? (
        <span role="alert" className="text-small text-danger">
          {error}
        </span>
      ) : null}
    </span>
  );
}
