/**
 * Company facts the UI may show (docs/BUILD_PLAN.md §0.1). docs/FACTS.md is the human-readable
 * record with sources; tests/unit/facts.test.ts checks every verified value here also appears there.
 * When EiB confirms or changes something, edit it here: components never hard-code these values.
 */
export type FactStatus = "verified" | "unconfirmed" | "placeholder";

export type Fact = {
  value: string;
  status: FactStatus;
  /** Required for verified facts: where the value was checked. */
  source?: string;
  /** ISO date the value was last checked. */
  lastReviewed?: string;
};

const CONNECT_PAGE = "https://expatsinbusiness.org/eib-connect/";

export const facts = {
  "org.name": {
    value: "Expats in Business",
    status: "verified",
    source: "https://expatsinbusiness.org/",
    lastReviewed: "2026-11-09",
  },
  "org.tagline": {
    value: "Your Global Business Community!",
    status: "verified",
    source: "https://expatsinbusiness.org/",
    lastReviewed: "2026-11-09",
  },
  "org.sessionsHeld": {
    value: "35+",
    status: "verified",
    source: "https://www.youtube.com/@expatsinbusiness",
    lastReviewed: "2026-11-10",
  },
  "contact.email": {
    value: "info.expatsinbusiness@gmail.com",
    status: "verified",
    source: "https://expatsinbusiness.org/eib-contributors-faqs/",
    lastReviewed: "2026-11-06",
  },
  "contact.messenger": {
    value: "https://m.me/expatsinbusiness",
    status: "verified",
    source: CONNECT_PAGE,
    lastReviewed: "2026-11-09",
  },
  "social.facebook": {
    value: "https://www.facebook.com/expatsinbusiness",
    status: "verified",
    source: CONNECT_PAGE,
    lastReviewed: "2026-11-09",
  },
  "social.instagram": {
    value: "https://www.instagram.com/expatsinbusiness",
    status: "verified",
    source: CONNECT_PAGE,
    lastReviewed: "2026-11-09",
  },
  "social.linkedin": {
    value: "https://www.linkedin.com/company/expats-in-business/",
    status: "verified",
    source: CONNECT_PAGE,
    lastReviewed: "2026-11-09",
  },
  "social.youtube": {
    value: "https://www.youtube.com/@expatsinbusiness",
    status: "verified",
    source: CONNECT_PAGE,
    lastReviewed: "2026-11-09",
  },
  "org.cofounder": {
    value: "Ziyan Sinnen",
    status: "verified",
    source:
      "https://krakow.pl/otwarty_na_swiat/aktualnosci/293141,62,komunikat,pierwszy_rok_expats_in_business.html",
    lastReviewed: "2026-11-09",
  },
  "org.firstAnniversary": {
    value: "27 Mar 2025",
    status: "verified",
    source:
      "https://krakow.pl/otwarty_na_swiat/aktualnosci/293141,62,komunikat,pierwszy_rok_expats_in_business.html",
    lastReviewed: "2026-11-09",
  },
  "org.formats": {
    value:
      "Connect & Collaborate, Guest Speaker, Cultural Exchange, Virtual Connect, Business Development events and workshops",
    status: "verified",
    source: "https://expatsinbusiness.org/eib-contributors-faqs/",
    lastReviewed: "2026-11-09",
  },
  "org.jointMeetup": {
    value: "Joint meetup with InterNations, 19 Feb 2026, BarBar Kraków",
    status: "verified",
    source: "https://www.youtube.com/@expatsinbusiness",
    lastReviewed: "2026-11-10",
  },
  "org.cultoura": {
    value: "Cultoura 2025, 24 May 2025",
    status: "verified",
    source: "https://expatsinbusiness.org/",
    lastReviewed: "2026-11-09",
  },
  "org.freeCommunity": {
    value: 'The community is free; a paid "EiB Business" module is planned',
    status: "verified",
    source: "https://expatsinbusiness.org/eib-contributors-faqs/",
    lastReviewed: "2026-11-06",
  },
  "community.whatsapp": {
    value: "https://chat.whatsapp.com/GDfMTD1KAjdByOuUbVXbai",
    status: "verified",
    source: CONNECT_PAGE,
    lastReviewed: "2026-11-09",
  },
} as const satisfies Record<string, Fact>;

export type FactKey = keyof typeof facts;

export function getFact(key: FactKey): Fact {
  return facts[key];
}
