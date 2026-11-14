import Image from "next/image";
import { LinkIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import type { PublicMember } from "@/lib/team/queries";

import { RevealEmail } from "./reveal-email";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/** A round photo, or the person's initials when there is none (decorative; the name sits beside it). */
export function Portrait({
  url,
  alt,
  name,
  size,
}: {
  url: string | null;
  alt: string | null;
  name: string;
  size: number;
}) {
  return url ? (
    <Image
      src={url}
      alt={alt ?? ""}
      width={size}
      height={size}
      unoptimized
      className="aspect-square rounded-full bg-brand-50 object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      aria-hidden
      className="flex aspect-square items-center justify-center rounded-full bg-brand-100 font-heading font-semibold text-brand-950"
      style={{ width: size, height: size }}
    >
      {initials(name)}
    </span>
  );
}

/** One team member: photo, role, how long with EiB, and the links they chose to share. */
export async function MemberCard({ member }: { member: PublicMember }) {
  const [t, format] = await Promise.all([getTranslations("team"), getFormatter()]);
  const month = (d: Date) =>
    format.dateTime(d, { month: "short", year: "numeric", timeZone: "UTC" });
  const duration = member.startedAt
    ? member.endedAt
      ? t("range", { from: month(member.startedAt), to: month(member.endedAt) })
      : t("since", { date: month(member.startedAt) })
    : null;
  return (
    <li
      data-testid="team-member"
      className="flex h-full flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-card"
    >
      <div className="flex items-center gap-4">
        <Portrait url={member.photoUrl} alt={member.photoAlt} name={member.name} size={72} />
        <div className="min-w-0">
          <h3 className="font-heading text-lg font-semibold text-brand-950">{member.name}</h3>
          <p className="text-small text-muted-foreground">{member.designation}</p>
          {duration ? <p className="text-small text-muted-foreground">{duration}</p> : null}
        </div>
      </div>
      {member.bio ? <p className="text-body text-ink">{member.bio}</p> : null}
      {member.linkedinUrl || member.hasEmail ? (
        <ul className="mt-auto flex flex-wrap gap-2">
          {member.linkedinUrl ? (
            <li>
              <a
                href={member.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-small font-semibold text-brand-700 hover:bg-brand-50"
              >
                <LinkIcon aria-hidden className="size-4" />
                {t("linkedin", { name: member.name })}
              </a>
            </li>
          ) : null}
          {member.hasEmail ? (
            <li>
              <RevealEmail
                memberId={member.id}
                name={member.name}
                label={t("showEmailButton")}
                error={t("emailError")}
              />
            </li>
          ) : null}
        </ul>
      ) : null}
    </li>
  );
}
