"use client";

import { useState } from "react";
import { RotateCcwIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Reveal } from "@/components/motion/reveal";
import { StatCounter } from "@/components/motion/stat-counter";
import { SuccessCheck } from "@/components/motion/success-check";
import { Button } from "@/components/ui/button";

import { StyleguideSection } from "./section";

function Demo({
  label,
  onReplay,
  children,
}: {
  label: string;
  onReplay: () => void;
  children: React.ReactNode;
}) {
  const t = useTranslations("styleguide.motion");
  return (
    <figure className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6">
      <figcaption className="flex items-center justify-between gap-3 font-semibold text-ink">
        {label}
        <Button variant="outline" size="sm" onClick={onReplay}>
          <RotateCcwIcon aria-hidden="true" />
          {t("replay")}
        </Button>
      </figcaption>
      <div className="flex min-h-28 items-center justify-center">{children}</div>
    </figure>
  );
}

/** Replaying remounts each demo by changing its key. */
export function MotionSection() {
  const t = useTranslations("styleguide.motion");
  const sections = useTranslations("styleguide.sections");
  const [runs, setRuns] = useState({ counter: 0, check: 0, reveal: 0 });
  const replay = (key: keyof typeof runs) =>
    setRuns((current) => ({ ...current, [key]: current[key] + 1 }));

  return (
    <StyleguideSection id="motion" title={sections("motion")} intro={t("intro")}>
      <div className="grid gap-6 md:grid-cols-3">
        <Demo label={t("counterLabel")} onReplay={() => replay("counter")}>
          <StatCounter
            key={runs.counter}
            value={35}
            suffix="+"
            className="font-heading text-display-sm font-bold text-brand-950"
          />
        </Demo>
        <Demo label={t("checkLabel")} onReplay={() => replay("check")}>
          <SuccessCheck key={runs.check} label={t("checkDone")} className="size-16" />
        </Demo>
        <Demo label={t("revealLabel")} onReplay={() => replay("reveal")}>
          <ul key={runs.reveal} className="flex w-full flex-col gap-2">
            {[1, 2, 3].map((n, index) => (
              <Reveal
                as="li"
                key={n}
                index={index}
                className="rounded-md bg-brand-50 px-3 py-2 text-brand-950"
              >
                {t("revealItem", { n })}
              </Reveal>
            ))}
          </ul>
        </Demo>
      </div>
    </StyleguideSection>
  );
}
