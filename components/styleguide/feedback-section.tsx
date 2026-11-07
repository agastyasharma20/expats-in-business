import { UsersIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/common/empty-state";
import { ExternalLink } from "@/components/common/external-link";
import { Skeleton } from "@/components/ui/skeleton";

import { DemoButton } from "./demo-button";
import { StyleguideSection } from "./section";

export function FeedbackSection() {
  const t = useTranslations("styleguide");

  return (
    <StyleguideSection id="feedback" title={t("sections.feedback")}>
      <EmptyState
        icon={UsersIcon}
        headingLevel="h3"
        title={t("feedback.emptyTitle")}
        description={t("feedback.emptyDescription")}
        action={<DemoButton>{t("feedback.emptyAction")}</DemoButton>}
      />
      <div
        aria-busy="true"
        aria-label={t("feedback.skeletonLabel")}
        role="status"
        className="grid gap-6 md:grid-cols-3"
      >
        {[0, 1, 2].map((key) => (
          <div
            key={key}
            className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-6"
          >
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="mt-2 h-10 w-32" />
          </div>
        ))}
      </div>
      <p>
        <ExternalLink href="https://example.com">{t("feedback.externalLink")}</ExternalLink>
      </p>
    </StyleguideSection>
  );
}
