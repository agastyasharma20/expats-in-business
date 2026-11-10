import { readFile } from "node:fs/promises";
import path from "node:path";

import { cacheLife } from "next/cache";
import { getFrontmatter } from "next-mdx-remote-client/utils";
import { z } from "zod";

/** Legal documents in content/legal/<slug>.mdx. */
export const legalSlugs = ["privacy", "terms", "cookies"] as const;
export type LegalSlug = (typeof legalSlugs)[number];

export const legalFrontmatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  lastUpdated: z.coerce.date(),
  status: z.enum(["draft", "published"]),
  order: z.number().int(),
});

export type LegalFrontmatter = z.infer<typeof legalFrontmatterSchema>;

export function isLegalSlug(value: string): value is LegalSlug {
  return (legalSlugs as readonly string[]).includes(value);
}

export async function readLegalSource(slug: LegalSlug): Promise<string> {
  return readFile(path.join(process.cwd(), "content", "legal", `${slug}.mdx`), "utf8");
}

/** Frontmatter only (for metadata); cached because file reads would otherwise block prerendering. */
export async function getLegalMeta(slug: LegalSlug): Promise<LegalFrontmatter> {
  "use cache";
  cacheLife("days");
  const { frontmatter } = getFrontmatter(await readLegalSource(slug));
  return legalFrontmatterSchema.parse(frontmatter);
}
