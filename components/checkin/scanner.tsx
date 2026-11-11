"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";
import { CameraIcon, CameraOffIcon, CheckCircle2Icon, SearchIcon, XCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Attendee = { ticketId: string; name: string; checkedIn: boolean };
type Result = { status: string; name?: string };

const GOOD = new Set(["ok"]);
const SAME_CODE_PAUSE_MS = 3000;

/** Door check-in: camera QR scanning (lazy-loaded) plus manual search; every scan gives clear feedback. */
export function Scanner({
  eventId,
  attendees,
  confirmed,
}: {
  eventId: string;
  attendees: Attendee[];
  confirmed: number;
}) {
  const t = useTranslations("scanner");
  const [list, setList] = useState(attendees);
  const [result, setResult] = useState<Result | null>(null);
  const [query, setQuery] = useState("");
  const [camera, setCamera] = useState<"off" | "on" | "error">("off");
  const video = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  const lastCode = useRef<{ code: string; at: number } | null>(null);

  const checkedIn = list.filter((a) => a.checkedIn).length;
  const matches = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return q ? list.filter((a) => a.name.toLocaleLowerCase().includes(q)).slice(0, 8) : [];
  }, [list, query]);

  async function submit(payload: { token?: string; ticketId?: string }) {
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, ...payload }),
      });
      const data: Result = res.status === 429 ? { status: "rateLimited" } : await res.json();
      setResult(data);
      if ("vibrate" in navigator) navigator.vibrate(GOOD.has(data.status) ? 80 : [60, 60, 60]);
      if (data.status === "ok" || data.status === "already") {
        setList((current) =>
          current.map((a) =>
            a.ticketId === payload.ticketId || a.name === data.name ? { ...a, checkedIn: true } : a,
          ),
        );
      }
    } catch {
      setResult({ status: "error" });
    }
  }

  async function startCamera() {
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      controls.current = await reader.decodeFromVideoDevice(undefined, video.current!, (scan) => {
        if (!scan) return;
        const code = scan.getText();
        const now = Date.now();
        // The same code stays in view for a while: only submit it again after a pause.
        if (lastCode.current?.code === code && now - lastCode.current.at < SAME_CODE_PAUSE_MS)
          return;
        lastCode.current = { code, at: now };
        void submit({ token: code });
      });
      setCamera("on");
    } catch {
      setCamera("error");
    }
  }

  function stopCamera() {
    controls.current?.stop();
    controls.current = null;
    setCamera("off");
  }

  useEffect(() => () => controls.current?.stop(), []);

  const good = result && GOOD.has(result.status);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="flex flex-col gap-4">
        <p
          className="font-heading text-h3 font-bold text-brand-950"
          aria-live="polite"
          data-testid="checkin-count"
        >
          {t("count", { checkedIn, confirmed })}
        </p>
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-brand-950">
          <video
            ref={video}
            muted
            playsInline
            className={cn("size-full object-cover", camera !== "on" && "hidden")}
          />
          {camera !== "on" ? (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-on-dark">
              {camera === "error" ? (
                t("cameraError")
              ) : (
                <CameraIcon aria-hidden="true" className="size-16 opacity-60" />
              )}
            </div>
          ) : null}
        </div>
        {camera === "on" ? (
          <Button variant="outline" onClick={stopCamera}>
            <CameraOffIcon aria-hidden="true" />
            {t("stop")}
          </Button>
        ) : (
          <Button onClick={startCamera}>
            <CameraIcon aria-hidden="true" />
            {t("start")}
          </Button>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div
          role="status"
          aria-live="assertive"
          data-testid="scan-result"
          className={cn(
            "flex min-h-24 items-center gap-3 rounded-2xl border-2 p-5 font-heading text-lg font-bold",
            !result && "border-dashed border-line text-muted-foreground",
            result && good && "border-success bg-success-50 text-success",
            result && !good && "border-danger bg-danger-50 text-danger",
          )}
        >
          {result ? (
            <>
              {good ? (
                <CheckCircle2Icon aria-hidden="true" className="size-8 shrink-0" />
              ) : (
                <XCircleIcon aria-hidden="true" className="size-8 shrink-0" />
              )}
              {t(`result.${result.status}` as "result.ok", { name: result.name ?? "" })}
            </>
          ) : (
            t("lead")
          )}
        </div>
        <label className="flex flex-col gap-2">
          <span className="font-semibold">{t("search")}</span>
          <span className="relative">
            <SearchIcon
              aria-hidden="true"
              className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="pl-10"
            />
          </span>
        </label>
        {query.trim() && !matches.length ? (
          <p className="text-muted-foreground">{t("noMatch")}</p>
        ) : null}
        <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface empty:hidden">
          {matches.map((a) => (
            <li key={a.ticketId} className="flex items-center justify-between gap-3 p-3">
              <span className="font-semibold">{a.name}</span>
              {a.checkedIn ? (
                <span className="text-small font-semibold text-success">{t("done")}</span>
              ) : (
                <Button size="sm" onClick={() => submit({ ticketId: a.ticketId })}>
                  {t("checkIn")}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
