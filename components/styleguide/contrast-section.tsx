import { CheckIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { contrastMinimum, contrastRatio, formatRatio, meetsContrast } from "@/lib/design/contrast";
import { colorTokens, contrastPairs } from "@/lib/design/tokens";

import { StyleguideSection } from "./section";

/** Every text/background pair with its computed WCAG ratio. tests/e2e checks no row fails. */
export function ContrastSection() {
  const t = useTranslations("styleguide");

  return (
    <StyleguideSection id="contrast" title={t("sections.contrast")} intro={t("contrast.intro")}>
      {/* Focusable so keyboard users can scroll the table on narrow screens. */}
      <div
        role="region"
        aria-label={t("sections.contrast")}
        tabIndex={0}
        className="relative w-full max-w-full min-w-0 overflow-x-auto rounded-xl border border-line bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <table className="w-full min-w-[44rem] border-collapse text-left text-small">
          <thead className="bg-muted text-brand-950">
            <tr>
              <th scope="col" className="p-3">
                {t("contrast.usage")}
              </th>
              <th scope="col" className="p-3">
                {t("contrast.sample")}
              </th>
              <th scope="col" className="p-3">
                {t("contrast.ratio")}
              </th>
              <th scope="col" className="p-3">
                {t("contrast.required")}
              </th>
              <th scope="col" className="p-3">
                {t("contrast.result")}
              </th>
            </tr>
          </thead>
          <tbody>
            {contrastPairs.map((pair) => {
              const ratio = contrastRatio(
                colorTokens[pair.foreground],
                colorTokens[pair.background],
              );
              const pass = meetsContrast(ratio, pair.level);
              const isText = pair.level !== "nonText";
              return (
                <tr
                  key={pair.id}
                  data-testid="contrast-row"
                  data-pass={pass}
                  className="border-t border-line"
                >
                  <th scope="row" className="p-3 font-semibold text-ink">
                    {t(`pairs.${pair.id}`)}
                    <span className="block font-normal text-muted-foreground">
                      {pair.foreground} / {pair.background}
                    </span>
                  </th>
                  <td className="p-3">
                    <span
                      className="inline-flex min-h-11 min-w-28 items-center justify-center rounded-md px-3 font-semibold"
                      style={
                        isText
                          ? {
                              color: `var(--${pair.foreground})`,
                              backgroundColor: `var(--${pair.background})`,
                            }
                          : {
                              backgroundColor: `var(--${pair.background})`,
                              border: `2px solid var(--${pair.foreground})`,
                            }
                      }
                    >
                      {isText ? t("contrast.sampleText") : null}
                    </span>
                  </td>
                  <td className="p-3 font-heading text-body font-bold text-ink tabular-nums">
                    {formatRatio(ratio)}:1
                  </td>
                  <td className="p-3 text-ink">
                    {t(`contrast.levels.${pair.level}`)}
                    <span className="sr-only"> ({contrastMinimum[pair.level]}:1)</span>
                  </td>
                  <td className="p-3">
                    <Badge variant={pass ? "verified" : "destructive"}>
                      {pass ? <CheckIcon aria-hidden="true" /> : <XIcon aria-hidden="true" />}
                      {pass ? t("contrast.pass") : t("contrast.fail")}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </StyleguideSection>
  );
}
