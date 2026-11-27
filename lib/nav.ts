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
  { id: "members", href: "/members", labelKey: "nav.members", status: "live" },
  { id: "providers", href: "/providers", labelKey: "nav.providers", status: "live" },
  { id: "guides", href: "/guides", labelKey: "nav.guides", status: "live" },
  { id: "pricing", href: "/pricing", labelKey: "nav.pricing", status: "live" },
  { id: "team", href: "/team", labelKey: "nav.team", status: "live" },
] as const satisfies readonly NavItem[];

export const accountNav = {
  signIn: { id: "signIn", href: "/sign-in", labelKey: "nav.signIn", status: "live" },
  help: { id: "help", href: "/help", labelKey: "nav.help", status: "live" },
} as const satisfies Record<string, NavItem>;

/** Directory pages linked from the footer (the header keeps the five main sections). */
export const directoryNav = [
  { id: "businesses", href: "/businesses", labelKey: "nav.businesses", status: "live" },
  { id: "bubbles", href: "/bubbles", labelKey: "nav.bubbles", status: "live" },
  { id: "festivals", href: "/festivals", labelKey: "nav.festivals", status: "live" },
  { id: "involved", href: "/get-involved", labelKey: "nav.involved", status: "live" },
] as const satisfies readonly NavItem[];

/** Ways to grow EiB: chapters, the ambassador programme, volunteering and roles (footer column). */
export const growNav = [
  { id: "chapters", href: "/chapters", labelKey: "nav.chapters", status: "live" },
  { id: "ambassadors", href: "/ambassadors", labelKey: "nav.ambassadors", status: "live" },
  { id: "volunteer", href: "/volunteer", labelKey: "nav.volunteer", status: "live" },
  { id: "careers", href: "/careers", labelKey: "nav.careers", status: "live" },
] as const satisfies readonly NavItem[];

export const aboutNav = {
  about: { id: "about", href: "/about", labelKey: "nav.about", status: "live" },
  stories: { id: "stories", href: "/stories", labelKey: "nav.stories", status: "live" },
  partners: { id: "partners", href: "/partners", labelKey: "nav.partners", status: "live" },
  install: { id: "install", href: "/install", labelKey: "nav.install", status: "live" },
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
  { id: "explore", headingKey: "footer.explore", items: [...mainNav, aboutNav.about] },
  {
    id: "community",
    headingKey: "footer.community",
    items: [
      ...directoryNav,
      aboutNav.stories,
      aboutNav.install,
      accountNav.signIn,
      accountNav.help,
    ],
  },
  { id: "grow", headingKey: "footer.grow", items: [...growNav, aboutNav.partners] },
  { id: "legal", headingKey: "footer.legal", items: legalNav },
] as const;

/** Every internal route the nav can reach; the link crawler starts from this list. */
export function allInternalHrefs(): string[] {
  return [
    "/",
    ...new Set(
      [...mainNav, ...growNav, ...Object.values(aboutNav), accountNav.signIn, ...legalNav].map(
        (item) => item.href,
      ),
    ),
  ];
}
