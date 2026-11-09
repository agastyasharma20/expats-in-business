import { BadgeCheckIcon, SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { DemoButton } from "./demo-button";
import { StyleguideSection } from "./section";

const cards = [
  { title: "title", body: "body" },
  { title: "shortTitle", body: "shortBody" },
  { title: "longTitle", body: "longBody" },
] as const;

export function CardsSection() {
  const t = useTranslations("styleguide");

  return (
    <StyleguideSection id="cards" title={t("sections.cards")}>
      <ul className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {cards.map((card) => (
          <li key={card.title}>
            <Card equalHeight>
              <CardHeader>
                <Badge variant="demo" className="mb-1">
                  {t("badges.demo")}
                </Badge>
                <CardTitle>{t(`cards.${card.title}`)}</CardTitle>
                <CardDescription>{t("cards.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <p>{t(`cards.${card.body}`)}</p>
              </CardContent>
              <CardFooter>
                <DemoButton variant="secondary" size="sm">
                  {t("cards.action")}
                </DemoButton>
              </CardFooter>
            </Card>
          </li>
        ))}
      </ul>
    </StyleguideSection>
  );
}

export function BadgesSection() {
  const t = useTranslations("styleguide");

  return (
    <StyleguideSection id="badges" title={t("sections.badges")}>
      <p className="text-small text-muted-foreground">{t("badges.examples")}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="verified">
          <BadgeCheckIcon aria-hidden="true" />
          {t("badges.verified")}
        </Badge>
        <Badge variant="founding">
          <SparklesIcon aria-hidden="true" />
          {t("badges.founding")}
        </Badge>
        <Badge variant="demo">{t("badges.demo")}</Badge>
        <Badge variant="unconfirmed">{t("badges.unconfirmed")}</Badge>
        <Badge variant="bubble">
          <span aria-hidden="true" className="font-heading">
            {t("badges.bubbleCode")}
          </span>
          {t("badges.bubble")}
        </Badge>
        <Badge>{t("badges.default")}</Badge>
        <Badge variant="secondary">{t("badges.secondary")}</Badge>
        <Badge variant="outline">{t("badges.outline")}</Badge>
        <Badge variant="destructive">{t("badges.destructive")}</Badge>
      </div>
    </StyleguideSection>
  );
}
