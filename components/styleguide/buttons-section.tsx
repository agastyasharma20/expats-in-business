import { CalendarPlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

import { DemoButton } from "./demo-button";
import { StyleguideSection } from "./section";

const variants = [
  "default",
  "highlight",
  "secondary",
  "outline",
  "ghost",
  "destructive",
  "link",
] as const;

const labelKey = {
  default: "primary",
  highlight: "highlight",
  secondary: "secondary",
  outline: "outline",
  ghost: "ghost",
  destructive: "destructive",
  link: "link",
} as const;

export function ButtonsSection() {
  const t = useTranslations("styleguide");

  return (
    <StyleguideSection id="buttons" title={t("sections.buttons")} intro={t("buttons.states")}>
      <div className="flex flex-wrap items-center gap-4">
        {variants.map((variant) => (
          <DemoButton key={variant} variant={variant}>
            {t(`buttons.${labelKey[variant]}`)}
          </DemoButton>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <DemoButton size="sm">{t("buttons.small")}</DemoButton>
        <DemoButton>{t("buttons.primary")}</DemoButton>
        <DemoButton size="lg">{t("buttons.large")}</DemoButton>
        <DemoButton
          size="icon"
          variant="outline"
          name={t("buttons.iconLabel")}
          aria-label={t("buttons.iconLabel")}
        >
          <CalendarPlusIcon aria-hidden="true" />
        </DemoButton>
        {/* Disabled buttons are not clickable, so they need no handler. */}
        <Button disabled>{t("buttons.disabled")}</Button>
        <Button variant="outline" disabled>
          {t("buttons.disabled")}
        </Button>
      </div>
    </StyleguideSection>
  );
}
