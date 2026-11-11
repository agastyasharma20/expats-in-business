import { getLocale, getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { cardFields } from "@/lib/directory/eligibility";
import { Link } from "@/lib/i18n/navigation";

type MemberRow = {
  slug: string;
  headline: string | null;
  openToCoffee: boolean;
  isDemo: boolean;
  originCountryCode: string | null;
  languages: string[];
  skills: string[];
  showOrigin: boolean;
  showLanguages: boolean;
  showIndustry: boolean;
  showSkills: boolean;
  user: { name: string };
  industry: { name: string } | null;
  homeChapter: { name: string } | null;
};

/** Directory card: visitors see name, headline and chapter; members also see what each person shows. */
export async function MemberCard({ member, signedIn }: { member: MemberRow; signedIn: boolean }) {
  const [t, d, p, locale] = await Promise.all([
    getTranslations("members"),
    getTranslations("directory"),
    getTranslations("profile"),
    getLocale(),
  ]);
  const show = cardFields(signedIn, member);
  const regions = new Intl.DisplayNames([locale], { type: "region" });
  const languages = new Intl.DisplayNames([locale], { type: "language" });
  const facts = [
    show.industry && member.industry ? member.industry.name : null,
    show.origin && member.originCountryCode ? regions.of(member.originCountryCode) : null,
    show.languages && member.languages.length
      ? member.languages.map((l) => languages.of(l)).join(", ")
      : null,
  ].filter(Boolean);

  return (
    <article className="relative flex h-full flex-col gap-3 rounded-xl border border-line bg-surface p-5 shadow-card transition-transform duration-(--duration-micro) focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring hover:-translate-y-0.5">
      <div className="flex flex-wrap gap-2">
        {member.isDemo ? <Badge variant="demo">{d("demo")}</Badge> : null}
        {member.openToCoffee ? <Badge variant="secondary">{t("coffee")}</Badge> : null}
      </div>
      <h2 className="text-h3">
        <Link
          href={`/members/${member.slug}`}
          className="outline-none after:absolute after:inset-0 after:content-['']"
        >
          {member.user.name}
        </Link>
      </h2>
      {member.headline ? <p className="text-small text-ink">{member.headline}</p> : null}
      <p className="mt-auto text-small text-muted-foreground">
        {[member.homeChapter?.name, ...facts].filter(Boolean).join(" · ")}
      </p>
      {show.skills && member.skills.length ? (
        <ul className="flex flex-wrap gap-1.5" aria-label={p("skills")}>
          {member.skills.slice(0, 5).map((skill) => (
            <li key={skill}>
              <Badge variant="outline">{skill}</Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
