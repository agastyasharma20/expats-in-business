"use client";

import { useOptimistic, useTransition } from "react";
import { useTranslations } from "next-intl";

import type { Reaction } from "@/lib/community/rules";
import { cn } from "@/lib/utils";
import { toggleReaction } from "@/server/actions/community";

type Item = { emoji: Reaction; count: number; mine: boolean };

/**
 * Reactions with an optimistic update. Each one is a real form button (works without JS); the
 * server checks the emoji against the allow-list and the post against the viewer's access.
 */
export function ReactionBar({ postId, reactions }: { postId: string; reactions: Item[] }) {
  const t = useTranslations("group");
  const [optimistic, flip] = useOptimistic(reactions, (current, emoji: Reaction) =>
    current.map((r) =>
      r.emoji === emoji ? { ...r, mine: !r.mine, count: r.count + (r.mine ? -1 : 1) } : r,
    ),
  );
  const [, startTransition] = useTransition();

  return (
    <ul className="flex flex-wrap gap-1.5" aria-label={t("reactions")}>
      {optimistic.map((r) => (
        <li key={r.emoji}>
          <form
            action={(form) =>
              startTransition(async () => {
                flip(r.emoji);
                await toggleReaction(null, form);
              })
            }
          >
            <input type="hidden" name="postId" value={postId} />
            <input type="hidden" name="emoji" value={r.emoji} />
            <button
              type="submit"
              aria-pressed={r.mine}
              aria-label={t("react", { emoji: r.emoji, count: r.count })}
              className={cn(
                "inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-full border px-2.5 text-small transition-transform duration-(--duration-micro) active:scale-95",
                r.mine
                  ? "border-brand-700 bg-brand-50 font-bold text-brand-950"
                  : "border-line bg-surface text-ink hover:border-line-strong",
                !r.count && !r.mine && "opacity-80",
              )}
            >
              <span aria-hidden="true">{r.emoji}</span>
              {r.count ? (
                <span aria-hidden="true" className="tabular-nums">
                  {r.count}
                </span>
              ) : null}
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
