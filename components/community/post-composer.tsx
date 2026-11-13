"use client";

import { useActionState, useRef, useState } from "react";
import { SendIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { controlStyles } from "@/components/ui/control-styles";
import { POST_MAX } from "@/lib/community/rules";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/server/actions/account";
import { createPost } from "@/server/actions/community";

type Kind = "post" | "question" | "announcement";

/** Post composer: kind, text with a live counter; errors inline, success toast, form resets. */
export function PostComposer({ groupId, kinds }: { groupId: string; kinds: Kind[] }) {
  const t = useTranslations("group");
  const [length, setLength] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, form) => {
    const result = await createPost(prev, form);
    if (result?.ok) {
      toast.success(t("published"));
      formRef.current?.reset();
      setLength(0);
    }
    return result;
  }, null);

  const errorKey = state && !state.ok ? (state.message ?? "default") : null;
  const errorText = errorKey
    ? t.has(`errors.${errorKey}`)
      ? t(`errors.${errorKey}`)
      : t("errors.default")
    : null;
  const near = length > POST_MAX * 0.9;

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5"
      data-testid="post-composer"
    >
      <input type="hidden" name="groupId" value={groupId} />
      <label htmlFor="post-body" className="text-h4 font-heading font-bold text-brand-950">
        {t("composer")}
      </label>
      <textarea
        id="post-body"
        name="body"
        required
        minLength={3}
        maxLength={POST_MAX}
        rows={4}
        aria-describedby="post-hint post-count"
        aria-invalid={errorKey ? true : undefined}
        onChange={(e) => setLength(e.currentTarget.value.length)}
        className={cn(controlStyles, "min-h-28 resize-y py-2.5")}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p id="post-hint" className="text-small text-muted-foreground">
          {t("bodyHint")}
        </p>
        <p
          id="post-count"
          aria-live="polite"
          className={cn("text-small tabular-nums", near ? "text-danger" : "text-muted-foreground")}
        >
          {t("count", { count: length, max: POST_MAX })}
        </p>
      </div>
      {errorText ? (
        <p role="alert" className="text-small font-semibold text-danger">
          {errorText}
        </p>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">{t("kind")}</legend>
          {kinds.map((kind, i) => (
            <label
              key={kind}
              className="relative inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line-strong px-4 text-small font-semibold text-ink transition-colors duration-(--duration-micro) has-checked:border-brand-700 has-checked:bg-brand-50 has-checked:text-brand-950 has-focus-visible:outline-2 has-focus-visible:outline-ring"
            >
              <input
                type="radio"
                name="kind"
                value={kind}
                defaultChecked={i === 0}
                className="sr-only"
              />
              {t(`kinds.${kind}`)}
            </label>
          ))}
        </fieldset>
        <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
          <SendIcon aria-hidden="true" />
          {pending ? t("publishing") : t("publish")}
        </Button>
      </div>
    </form>
  );
}
