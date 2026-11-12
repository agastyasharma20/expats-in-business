"use client";

import { useActionState, useState } from "react";
import { FlagIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { controlStyles } from "@/components/ui/control-styles";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/server/actions/account";
import { reportPost } from "@/server/actions/community";

/** Report a post with a reason. The post disappears for the reporter after sending. */
export function ReportDialog({ postId }: { postId: string }) {
  const t = useTranslations("group");
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, form) => {
    const result = await reportPost(prev, form);
    if (result?.ok) {
      toast.success(t("reported"));
      setOpen(false);
    }
    return result;
  }, null);
  const error =
    state && !state.ok
      ? t.has(`errors.${state.message}`)
        ? t(`errors.${state.message}`)
        : t("errors.reportDefault")
      : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <FlagIcon aria-hidden="true" />
          {t("report")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={action} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t("reportTitle")}</DialogTitle>
            <DialogDescription>{t("reportLead")}</DialogDescription>
          </DialogHeader>
          <input type="hidden" name="postId" value={postId} />
          <label htmlFor={`reason-${postId}`} className="font-semibold text-ink">
            {t("reportReason")}
          </label>
          <textarea
            id={`reason-${postId}`}
            name="reason"
            required
            minLength={5}
            maxLength={500}
            rows={3}
            aria-invalid={error ? true : undefined}
            className={cn(controlStyles, "resize-y py-2.5")}
          />
          {error ? (
            <p role="alert" className="text-small font-semibold text-danger">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={pending}>
              {t("reportSend")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
