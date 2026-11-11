/**
 * npm run embed: content/guides/<country>/*.mdx → Guide rows + heading-aware chunks with local
 * 384-d embeddings (all-MiniLM-L6-v2). Only verified guides are embedded; drafts are skipped and
 * their old chunks removed. Idempotent: each guide's chunks are replaced in one transaction.
 * Runs in `npm run setup`; the model downloads once into MODEL_CACHE_DIR and is reused offline.
 */
import { readdir } from "node:fs/promises";
import path from "node:path";

import { createId } from "@paralleldrive/cuid2";

import { chunkGuide } from "../lib/ai/chunking";
import { embed, toVectorLiteral } from "../lib/ai/embeddings";
import { listGuides } from "../lib/content/guides";
import { createSeedClient } from "../prisma/seed/index";

const BATCH = 16;

async function main() {
  const started = Date.now();
  const db = createSeedClient();
  const countries = (
    await readdir(path.join(process.cwd(), "content", "guides"), { withFileTypes: true })
  )
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  let guides = 0;
  let chunks = 0;

  for (const country of countries) {
    const countryCode = country.toUpperCase();
    for (const guide of await listGuides(country)) {
      const fm = guide.frontmatter;
      const row = await db.guide.upsert({
        where: { countryCode_slug: { countryCode, slug: guide.slug } },
        update: {
          title: fm.title,
          lastVerified: fm.lastVerified,
          status: fm.verificationStatus === "verified" ? "published" : "draft",
        },
        create: {
          slug: guide.slug,
          countryCode,
          title: fm.title,
          lastVerified: fm.lastVerified,
          status: fm.verificationStatus === "verified" ? "published" : "draft",
        },
      });
      if (fm.verificationStatus !== "verified") {
        await db.guideChunk.deleteMany({ where: { guideId: row.id } });
        console.info(`· skipped draft ${country}/${guide.slug}`);
        continue;
      }
      const parts = chunkGuide(fm.title, guide.body);
      const vectors: number[][] = [];
      for (let i = 0; i < parts.length; i += BATCH) {
        // The heading travels with the text so short sections still match their topic.
        vectors.push(
          ...(await embed(
            parts.slice(i, i + BATCH).map((p) => `${fm.title}. ${p.heading}. ${p.content}`),
          )),
        );
      }
      const sourceUrls = fm.sources.map((s) => s.url);
      await db.$transaction(async (tx) => {
        await tx.guideChunk.deleteMany({ where: { guideId: row.id } });
        for (const [index, part] of parts.entries()) {
          await tx.$executeRaw`
            INSERT INTO "GuideChunk" (id, "guideId", ordinal, heading, content, "sourceUrls", embedding)
            VALUES (${createId()}, ${row.id}, ${part.ordinal}, ${part.heading}, ${part.content}, ${sourceUrls}, ${toVectorLiteral(vectors[index]!)}::vector)`;
        }
      });
      guides += 1;
      chunks += parts.length;
      console.info(`✓ ${country}/${guide.slug}: ${parts.length} chunks`);
    }
  }
  await db.$disconnect();
  console.info(
    `embed finished: ${guides} guides, ${chunks} chunks in ${((Date.now() - started) / 1000).toFixed(1)} s`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
