import "server-only";

import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";

import { embed, toVectorLiteral } from "./embeddings";
import type { Passage } from "./prompt";

export const TOP_K = 5;

type Row = {
  id: string;
  heading: string;
  content: string;
  sourceUrls: string[];
  slug: string;
  title: string;
  lastVerified: Date;
  score: number;
};

export type Retrieval = { passages: Passage[]; mode: "vector" | "keyword"; best: number };

function toPassages(rows: Row[], sourceTitles: Map<string, string>): Passage[] {
  return rows.map((r) => ({
    id: r.id,
    guideSlug: r.slug,
    guideTitle: r.title,
    heading: r.heading,
    content: r.content,
    sourceUrl: r.sourceUrls[0] ?? "",
    sourceTitle: sourceTitles.get(r.sourceUrls[0] ?? "") ?? r.title,
    lastVerified: r.lastVerified.toISOString().slice(0, 10),
    score: Number(r.score),
  }));
}

/**
 * Top passages for a question from the member's country, by cosine similarity (pgvector HNSW).
 * Below AI_SIMILARITY_THRESHOLD nothing is returned, so the concierge hands off instead of answering.
 * If the embedding model cannot load, a keyword search keeps the concierge useful (stricter cut-off).
 */
export async function retrieve(
  question: string,
  countryCode: string,
  sourceTitles = new Map<string, string>(),
): Promise<Retrieval> {
  const db = getDb();
  const threshold = getEnv().AI_SIMILARITY_THRESHOLD;
  try {
    const [vector] = await embed([question]);
    const literal = toVectorLiteral(vector!);
    const rows = await db.$queryRaw<Row[]>`
      SELECT c.id, c.heading, c.content, c."sourceUrls", g.slug, g.title, g."lastVerified",
             1 - (c.embedding <=> ${literal}::vector) AS score
      FROM "GuideChunk" c JOIN "Guide" g ON g.id = c."guideId"
      WHERE g."countryCode" = ${countryCode} AND g.status = 'published' AND c.embedding IS NOT NULL
      ORDER BY c.embedding <=> ${literal}::vector
      LIMIT ${TOP_K}`;
    const relevant = rows.filter((r) => Number(r.score) >= threshold);
    return {
      passages: toPassages(relevant, sourceTitles),
      mode: "vector",
      best: Number(rows[0]?.score ?? 0),
    };
  } catch (error) {
    console.error(
      "[concierge] embedding unavailable, using keyword search:",
      (error as Error).message,
    );
    const rows = await db.$queryRaw<Row[]>`
      SELECT c.id, c.heading, c.content, c."sourceUrls", g.slug, g.title, g."lastVerified",
             ts_rank_cd(to_tsvector('english', c.heading || ' ' || c.content), websearch_to_tsquery('english', ${question})) AS score
      FROM "GuideChunk" c JOIN "Guide" g ON g.id = c."guideId"
      WHERE g."countryCode" = ${countryCode} AND g.status = 'published'
        AND to_tsvector('english', c.heading || ' ' || c.content) @@ websearch_to_tsquery('english', ${question})
        AND numnode(websearch_to_tsquery('english', ${question})) >= 3 -- at least two real search terms
      ORDER BY score DESC
      LIMIT ${TOP_K}`;
    // Stricter than the vector path: a single common word must not pull in an unrelated passage.
    const relevant = rows.filter((r) => Number(r.score) >= 0.3);
    return {
      passages: toPassages(relevant, sourceTitles),
      mode: "keyword",
      best: Number(rows[0]?.score ?? 0),
    };
  }
}
