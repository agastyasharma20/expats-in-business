import type { FactKey } from "@/config/facts";

/**
 * Single source for the navbar, the mobile menu and the footer (fixes old-portal bug 11: "Home"
 * twice in the footer). Labels are message keys under `nav.*`. tests/unit/nav.test.ts rejects
 * duplicate hrefs or labels within any menu.
 *
 * `status: "comingSoon"` routes render a designed coming-soon page until their milestone ships.
 */
export type NavStatus = "live" | "comingSoon";

export type NavItem = {
  id: string;
  href: string;
  labelKey: string;
  status: NavStatus;
};

export type ExternalNavItem = {
  id: string;
  fact: FactKey;
  labelKey: string;
};

export const mainNav = [
  { id: "events", href: "/events", labelKey: "nav.events", status: "live" },
  { id: "members", href: "/members", labelKey: "nav.members", status: "comingSoon" },
  { id: "providers", href: "/providers", labelKey: "nav.providers", status: "comingSoon" },
  { id: "guides", href: "/guides", labelKey: "nav.guides", status: "comingSoon" },
  { id: "pricing", href: "/pricing", labelKey: "nav.pricing", status: "live" },
] as const satisfies readonly NavItem[];

export const accountNav = {
  signIn: { id: "signIn", href: "/sign-in", labelKey: "nav.signIn", status: "live" },
  help: { id: "help", href: "/help", labelKey: "nav.help", status: "live" },
} as const satisfies Record<string, NavItem>;

export const legalNav = [
  { id: "privacy", href: "/legal/privacy", labelKey: "nav.privacy", status: "live" },
  { id: "terms", href: "/legal/terms", labelKey: "nav.terms", status: "live" },
  { id: "cookies", href: "/legal/cookies", labelKey: "nav.cookies", status: "live" },
] as const satisfies readonly NavItem[];

export const socialNav = [
  { id: "facebook", fact: "social.facebook", labelKey: "nav.facebook" },
  { id: "instagram", fact: "social.instagram", labelKey: "nav.instagram" },
  { id: "linkedin", fact: "social.linkedin", labelKey: "nav.linkedin" },
  { id: "youtube", fact: "social.youtube", labelKey: "nav.youtube" },
] as const satisfies readonly ExternalNavItem[];

/** Footer columns, in display order. Headings are message keys under `footer.*`. */
export const footerColumns = [
  {
    id: "platform",
    headingKey: "footer.platform",
    items: [...mainNav, accountNav.signIn, accountNav.help],
  },
  { id: "legal", headingKey: "footer.legal", items: legalNav },
] as const;

/** Every internal route the nav can reach; the link crawler starts from this list. */
export function allInternalHrefs(): string[] {
  return ["/", ...new Set([...mainNav, accountNav.signIn, ...legalNav].map((item) => item.href))];
}
