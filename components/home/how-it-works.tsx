import { CalendarHeartIcon, HandshakeIcon, UserPlusIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { SectionHeading } from "./section-heading";

const steps = [
  { key: "join", icon: UserPlusIcon },
  { key: "come", icon: CalendarHeartIcon },
  { key: "grow", icon: HandshakeIcon },
] as const;

export async function HowItWorks() {
  const t = await getTranslations("home.how");

  return (
    <section aria-labelledby="how-title" className="bg-surface">
      <div className="container-page flex flex-col gap-10 py-16">
        <SectionHeading id="how-title" title={t("title")} />
        <ol className="grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.key} className="flex flex-col gap-3">
              <span className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-11 items-center justify-center rounded-full bg-brand-950 font-heading font-bold text-on-dark"
                >
                  {index + 1}
                </span>
                <step.icon aria-hidden="true" className="size-6 text-brand-700" />
              </span>
              <h3 className="text-h3">{t(`${step.key}.title`)}</h3>
              <p className="text-muted-foreground">{t(`${step.key}.body`)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
