import { getTranslations } from "next-intl/server";

import type { PublicFounder } from "@/lib/team/queries";

import { Portrait } from "./member-card";

/** The founder's message: photo and name beside the text, paragraphs kept as the admin wrote them. */
export async function FounderMessage({ founder }: { founder: PublicFounder }) {
  const t = await getTranslations("team");
  const paragraphs = founder.body.split(/\n{2,}/).filter(Boolean);
  return (
    <section
      aria-labelledby="founder-heading"
      data-testid="founder-message"
      className="grid gap-8 rounded-3xl bg-brand-50 p-6 md:grid-cols-[auto_1fr] md:p-10"
    >
      <div className="flex flex-col items-center gap-3 text-center md:items-start md:text-left">
        <Portrait
          url={founder.photoUrl}
          alt={founder.photoAlt}
          name={founder.founderName}
          size={160}
        />
        <p className="font-heading text-lg font-semibold text-brand-950">{founder.founderName}</p>
        <p className="text-small text-muted-foreground">{founder.designation}</p>
      </div>
      <div className="flex flex-col gap-4">
        <p className="eyebrow">{t("founderEyebrow")}</p>
        <h2 id="founder-heading" className="font-heading text-2xl font-semibold text-brand-950">
          {founder.title}
        </h2>
        {paragraphs.map((text, index) => (
          <p key={index} className="max-w-prose text-body text-ink">
            {text}
          </p>
        ))}
      </div>
    </section>
  );
}
