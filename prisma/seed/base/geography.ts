import type { ChapterStatus } from "../../../generated/prisma/client";

/**
 * Base geography from docs/PROJECT_BRIEF.md: Poland is the first country hub, Kraków is chapter #1
 * (live) and Warsaw is launching. Edit this file (or, from Milestone 6, the admin panel) to change it.
 */
export type CountrySeed = {
  code: string;
  name: string;
  defaultCurrency: string;
  defaultTimezone: string;
  locales: string[];
  /** Line-art panorama key (components/landmarks). */
  landmark?: string;
};

export type ChapterSeed = {
  slug: string;
  name: string;
  city: string;
  countryCode: string;
  status: ChapterStatus;
};

export const countries: CountrySeed[] = [
  {
    code: "PL",
    name: "Poland",
    defaultCurrency: "PLN",
    defaultTimezone: "Europe/Warsaw",
    locales: ["en", "pl", "uk"],
    landmark: "poland",
  },
];

export const chapters: ChapterSeed[] = [
  { slug: "krakow", name: "Kraków", city: "Kraków", countryCode: "PL", status: "live" },
  { slug: "warsaw", name: "Warsaw", city: "Warsaw", countryCode: "PL", status: "launching" },
];
