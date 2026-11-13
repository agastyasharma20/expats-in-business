import { UserCheckIcon, UsersIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Panel } from "@/components/dashboard/panel";
import { ProgressRing } from "@/components/roadmap/progress-ring";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";

type Completeness = { percent: number; missing: string[] };
type Person = { slug: string; headline: string | null; user: { name: string } };

/** Profile strength ring with the next missing items and a link to complete the profile. */
export async function StrengthPanel({ completeness }: { completeness: Completeness }) {
  const t = await getTranslations("dashboard");
  return (
    <Panel id="strength" title={t("strength.title")} icon={UserCheckIcon} delay={3}>
      <div className="flex items-center gap-4">
        <ProgressRing
          percent={completeness.percent}
          size={72}
          label={t("strength.label", { percent: completeness.percent })}
        />
        <p className="text-small text-ink">
          {completeness.missing.length
            ? t("strength.missing", {
                items: completeness.missing
                  .slice(0, 3)
                  .map((key) => t(`strength.items.${key}`))
                  .join(", "),
              })
            : t("strength.complete")}
        </p>
      </div>
      {completeness.missing.length ? (
        <Link
          href="/settings/profile"
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            className: "self-start",
          })}
        >
          {t("completeProfile")}
        </Link>
      ) : null}
    </Panel>
  );
}

/** Members suggested from shared goals and chapter; empty state links to the directory. */
export async function SuggestedPanel({ people }: { people: Person[] }) {
  const t = await getTranslations("dashboard");
  return (
    <Panel id="suggested" title={t("suggested")} icon={UsersIcon} delay={8}>
      {people.length ? (
        <ul className="flex flex-col gap-1">
          {people.map((person) => (
            <li key={person.slug}>
              <Link
                href={`/members/${person.slug}`}
                className="flex min-h-11 flex-col rounded-lg p-2 hover:bg-brand-50"
              >
                <span className="font-semibold text-brand-950">{person.user.name}</span>
                {person.headline ? (
                  <span className="text-small text-muted-foreground">{person.headline}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className="text-muted-foreground">{t("noSuggested")}</p>
          <Link href="/members" className={buttonVariants({ variant: "outline", size: "sm" })}>
            {t("browseMembers")}
          </Link>
        </div>
      )}
    </Panel>
  );
}
