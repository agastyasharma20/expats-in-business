import { describe, expect, it } from "vitest";

import { isOfficialSource, listGuides } from "@/lib/content/guides";

import { roadmapTasks } from "../../prisma/seed/base/catalogs";

const MAX_AGE_DAYS = 365;

describe("official source check", () => {
  it("accepts government pages and rejects everything else", () => {
    expect(isOfficialSource("https://www.gov.pl/web/udsc/mos-qa")).toBe(true);
    expect(isOfficialSource("https://ksef.podatki.gov.pl/x")).toBe(true);
    expect(isOfficialSource("https://kkr.krakow.pl/aktualnosci/1")).toBe(true);
    expect(isOfficialSource("http://www.gov.pl/web/gov")).toBe(false);
    expect(isOfficialSource("https://gov.pl.example.com/")).toBe(false);
    expect(isOfficialSource("https://someblog.com/pesel")).toBe(false);
    expect(isOfficialSource("not a url")).toBe(false);
  });
});

describe("Poland guides", async () => {
  const guides = await listGuides("pl");

  it("has the eight guides from the brief", () => {
    expect(guides.map((g) => g.slug).sort()).toEqual([
      "banking-basics",
      "health-insurance-basics",
      "information-point-for-foreigners",
      "ksef-e-invoicing",
      "mos-residence-application",
      "pesel",
      "trusted-profile",
      "zus-sole-traders",
    ]);
  });

  it.each(guides.map((g) => [g.slug, g] as const))(
    "%s: valid frontmatter, official sources, recent check",
    (_slug, guide) => {
      expect(guide.frontmatter.countryCode).toBe("PL");
      expect(guide.frontmatter.sources.length).toBeGreaterThan(0);
      const ageDays = (Date.now() - guide.frontmatter.lastVerified.getTime()) / 86_400_000;
      expect(ageDays).toBeGreaterThanOrEqual(-1);
      expect(ageDays, "re-verify this guide").toBeLessThan(MAX_AGE_DAYS);
      // Links inside the body must be markdown links (styled), never raw HTML anchors.
      expect(guide.body).not.toMatch(/<a\s/i);
    },
  );

  it("every guide the roadmap points to exists", () => {
    const slugs = new Set(guides.map((g) => g.slug));
    const referenced = roadmapTasks.map((t) => t.guideSlug).filter((s): s is string => Boolean(s));
    expect(referenced.filter((s) => !slugs.has(s))).toEqual([]);
  });

  it("internal guide links point to existing guides", () => {
    const slugs = new Set(guides.map((g) => g.slug));
    const links = guides.flatMap((g) =>
      [...g.body.matchAll(/\]\(\/guides\/([a-z0-9-]+)\)/g)].map((m) => m[1]!),
    );
    expect(links.filter((l) => !slugs.has(l))).toEqual([]);
  });
});
