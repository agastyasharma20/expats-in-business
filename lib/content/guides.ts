import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { getFrontmatter } from "next-mdx-remote-client/utils";
import { z } from "zod";

import { OFFICIAL_SOURCE_HOSTS } from "@/config/official-sources";

/**
 * Guides live in content/guides/<country>/<slug>.mdx. Every legal, tax or immigration statement
 * must come from an official source listed in `sources` (CLAUDE.md rule 4). The concierge may only
 * answer from these files.
 */

export { OFFICIAL_SOURCE_HOSTS } from "@/config/official-sources";

export function isOfficialSource(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && OFFICIAL_SOURCE_HOSTS.some((pattern) => pattern.test(hostname));
  } catch {
    return false;
  }
}

export const GUIDE_DISCLAIMER =
  "General information, not legal advice. Always check the official source.";

export const guideFrontmatterSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  countryCode: z.string().regex(/^[A-Z]{2}$/),
  lastVerified: z.coerce.date(),
  sources: z
    .array(
      z.object({
        title: z.string().min(3),
        url: z
          .string()
          .refine(
            isOfficialSource,
            "Sources must be official https pages (see OFFICIAL_SOURCE_HOSTS)",
          ),
      }),
    )
    .min(1),
  disclaimer: z.string().default(GUIDE_DISCLAIMER),
  /** Only verified guides are embedded for the concierge; drafts render with a banner but are never cited. */
  verificationStatus: z.enum(["verified", "draft"]).default("verified"),
  /** Slugs of related guides shown at the end of the page. */
  related: z.array(z.string().regex(/^[a-z0-9-]+$/)).default([]),
  /** Set for city-specific guides (chapter slug); omitted = applies to the whole country. */
  chapter: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
});

export type GuideFrontmatter = z.infer<typeof guideFrontmatterSchema>;
export type GuideFile = {
  slug: string;
  country: string;
  frontmatter: GuideFrontmatter;
  body: string;
};

const GUIDES_DIR = path.join(process.cwd(), "content", "guides");

export async function readGuide(country: string, slug: string): Promise<GuideFile> {
  const source = await readFile(path.join(GUIDES_DIR, country, `${slug}.mdx`), "utf8");
  const { frontmatter, strippedSource } = getFrontmatter(source);
  return {
    slug,
    country,
    frontmatter: guideFrontmatterSchema.parse(frontmatter),
    body: String(strippedSource),
  };
}

export async function listGuides(country: string): Promise<GuideFile[]> {
  const files = (await readdir(path.join(GUIDES_DIR, country))).filter((file) =>
    file.endsWith(".mdx"),
  );
  return Promise.all(files.map((file) => readGuide(country, file.replace(/\.mdx$/, ""))));
}
