"use client";

import { useActionState, useEffect, useRef } from "react";
import { CircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { SuccessCheck } from "@/components/motion";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/server/actions/account";
import { setTaskDone } from "@/server/actions/roadmap";

/** Done toggle: a real form (works without JS); the success tick draws in when a step is completed. */
export function TaskToggle({ id, done, title }: { id: string; done: boolean; title: string }) {
  const t = useTranslations("roadmap");
  const [state, action, pending] = useActionState<ActionState, FormData>(setTaskDone, null);
  const announced = useRef<ActionState>(null);
  useEffect(() => {
    if (state && state !== announced.current && state.ok && state.message === "done")
      toast.success(t("doneToast"));
    announced.current = state;
  }, [state, t]);
  const justDone = state?.ok && state.message === "done";

  return (
    <form action={action} className="flex items-center gap-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="done" value={done ? "false" : "true"} />
      {done ? (
        justDone ? (
          <SuccessCheck label={t("doneToast")} className="size-8" />
        ) : (
          <span
            aria-hidden="true"
            className="inline-flex size-8 items-center justify-center rounded-full bg-success-50 text-success"
          >
            ✓
          </span>
        )
      ) : (
        <CircleIcon aria-hidden="true" className="size-8 text-line-strong" />
      )}
      <Button
        type="submit"
        variant={done ? "ghost" : "outline"}
        size="sm"
        disabled={pending}
        aria-label={`${done ? t("markOpen") : t("markDone")}: ${title}`}
      >
        {done ? t("markOpen") : t("markDone")}
      </Button>
    </form>
  );
}
