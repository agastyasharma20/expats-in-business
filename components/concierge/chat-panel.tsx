"use client";

import { useEffect, useRef, useState } from "react";
import { SendIcon, ShieldAlertIcon, SquareIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { HandoffReason } from "@/lib/ai/concierge";
import type { Passage } from "@/lib/ai/prompt";

import { AnswerText, HandoffCard, SourceChips } from "./answer-parts";

type Turn =
  | { role: "user"; text: string }
  | {
      role: "assistant";
      text: string;
      sources: Passage[];
      cited: string[];
      handoff: HandoffReason | null;
      streaming: boolean;
    };

type ServerEvent =
  | { type: "quota"; remaining: number | null }
  | { type: "sources"; sources: Passage[] }
  | { type: "text"; text: string }
  | { type: "reset" }
  | { type: "handoff"; reason: HandoffReason }
  | { type: "done"; cited: string[] };

/** Parses complete "event:/data:" frames out of an SSE buffer; returns events and the remainder. */
function parseFrames(buffer: string): { events: ServerEvent[]; rest: string } {
  const frames = buffer.split("\n\n");
  const rest = frames.pop() ?? "";
  const events = frames
    .map((frame) => frame.split("\n").find((line) => line.startsWith("data: ")))
    .filter((line): line is string => Boolean(line))
    .map((line) => JSON.parse(line.slice(6)) as ServerEvent);
  return { events, rest };
}

export function ChatPanel({
  suggestions,
  initialQuestion,
  unlimited,
}: {
  suggestions: string[];
  initialQuestion?: string;
  unlimited: boolean;
}) {
  const t = useTranslations("concierge");
  const locale = useLocale();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState(initialQuestion ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const abort = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => end.current?.scrollIntoView({ block: "nearest" }), [turns]);
  useEffect(() => () => abort.current?.abort(), []);

  const updateLast = (
    patch: (
      turn: Extract<Turn, { role: "assistant" }>,
    ) => Partial<Extract<Turn, { role: "assistant" }>>,
  ) =>
    setTurns((all) => {
      const last = all.at(-1);
      if (!last || last.role !== "assistant") return all;
      return [...all.slice(0, -1), { ...last, ...patch(last) }];
    });

  async function ask(text: string) {
    const q = text.trim();
    if (q.length < 3 || busy) return;
    setError(null);
    setBusy(true);
    setQuestion("");
    setTurns((all) => [
      ...all,
      { role: "user", text: q },
      { role: "assistant", text: "", sources: [], cited: [], handoff: null, streaming: true },
    ]);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const res = await fetch("/api/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, locale }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; limit?: number };
        const key =
          (["rateLimited", "quota", "invalid", "signIn"] as const).find((k) => k === data.error) ??
          "network";
        setError(t(`errors.${key}`, { limit: data.limit ?? 0 }));
        setTurns((all) => all.slice(0, -1));
        return;
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        const parsed = parseFrames(buffer + value);
        buffer = parsed.rest;
        for (const event of parsed.events) {
          if (event.type === "quota") setRemaining(event.remaining);
          else if (event.type === "sources") updateLast(() => ({ sources: event.sources }));
          else if (event.type === "text")
            updateLast((turn) => ({ text: turn.text ? `${turn.text} ${event.text}` : event.text }));
          else if (event.type === "reset") updateLast(() => ({ text: "", cited: [] }));
          else if (event.type === "handoff")
            updateLast(() => ({ text: "", handoff: event.reason, streaming: false }));
          else if (event.type === "done")
            updateLast(() => ({ cited: event.cited, streaming: false }));
        }
      }
      updateLast(() => ({ streaming: false }));
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError(t("errors.network"));
      updateLast((turn) => ({ streaming: false, handoff: turn.text ? turn.handoff : "error" }));
    } finally {
      setBusy(false);
      abort.current = null;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p
        className="flex items-center gap-2 self-start rounded-full border border-warning/40 bg-warning-50 px-3 py-1 text-small font-semibold text-warning"
        data-testid="legal-label"
      >
        <ShieldAlertIcon aria-hidden="true" className="size-4" />
        {t("label")}
      </p>

      {turns.length === 0 ? (
        <section aria-labelledby="suggested-title" className="flex flex-col gap-3">
          <h2 id="suggested-title" className="text-h3">
            {t("suggested")}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <li key={s}>
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto min-h-11 text-left whitespace-normal"
                  onClick={() => ask(s)}
                >
                  {s}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ol className="flex flex-col gap-5" aria-label={t("title")} data-testid="conversation">
        {turns.map((turn, index) =>
          turn.role === "user" ? (
            <li
              key={index}
              className="self-end rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-primary-foreground"
            >
              <span className="sr-only">{t("you")}: </span>
              {turn.text}
            </li>
          ) : (
            <li
              key={index}
              className="flex flex-col gap-3 rounded-2xl rounded-bl-sm border border-line bg-surface p-5 shadow-card"
              data-testid="answer"
            >
              <span className="sr-only">{t("assistant")}: </span>
              <div aria-live="polite" aria-busy={turn.streaming}>
                {turn.handoff ? (
                  <HandoffCard reason={turn.handoff} />
                ) : turn.text ? (
                  <AnswerText text={turn.text} sources={turn.sources} />
                ) : (
                  <p className="animate-pulse text-muted-foreground">{t("asking")}</p>
                )}
              </div>
              {!turn.handoff && !turn.streaming && turn.cited.length ? (
                <SourceChips sources={turn.sources} cited={turn.cited} />
              ) : null}
            </li>
          ),
        )}
      </ol>
      <div ref={end} />

      {error ? (
        <p role="alert" className="font-semibold text-danger">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(question);
        }}
        className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-card"
      >
        <label htmlFor="concierge-question" className="font-semibold">
          {t("question")}
        </label>
        <Textarea
          id="concierge-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void ask(question);
            }
          }}
          placeholder={t("placeholder")}
          rows={2}
          maxLength={1000}
          aria-describedby="concierge-privacy"
        />
        <p id="concierge-privacy" className="text-small text-muted-foreground">
          {t("privacy")}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-small text-muted-foreground" aria-live="polite">
            {unlimited
              ? t("unlimited")
              : remaining !== null
                ? t("remaining", { count: remaining })
                : null}
          </span>
          {busy ? (
            <Button type="button" variant="outline" onClick={() => abort.current?.abort()}>
              <SquareIcon aria-hidden="true" />
              {t("stop")}
            </Button>
          ) : (
            <Button type="submit" disabled={question.trim().length < 3}>
              <SendIcon aria-hidden="true" />
              {t("ask")}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
