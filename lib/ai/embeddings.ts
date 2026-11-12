import path from "node:path";

/**
 * Local sentence embeddings (all-MiniLM-L6-v2, 384 dimensions) with @huggingface/transformers.
 * The model downloads once into MODEL_CACHE_DIR (npm run embed does it during setup) and then runs
 * offline. Shared by the embed script and the concierge; no text leaves the machine.
 */
export const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
export const EMBEDDING_DIMENSIONS = 384;

type Extractor = (
  texts: string[],
  options: { pooling: "mean"; normalize: boolean },
) => Promise<{ tolist(): number[][] }>;

let extractor: Promise<Extractor> | null = null;

async function load(cacheDir: string): Promise<Extractor> {
  const transformers = await import("@huggingface/transformers");
  transformers.env.cacheDir = path.resolve(cacheDir);
  // Cached files first; the network is only needed for the very first download.
  transformers.env.allowLocalModels = true;
  const pipe = await transformers.pipeline("feature-extraction", EMBEDDING_MODEL, { dtype: "q8" });
  return pipe as unknown as Extractor;
}

export async function embed(
  texts: string[],
  cacheDir = process.env.MODEL_CACHE_DIR ?? ".cache/models",
): Promise<number[][]> {
  extractor ??= load(cacheDir).catch((error) => {
    extractor = null; // allow a retry after a failed (e.g. offline first) load
    throw error;
  });
  const run = await extractor;
  const output = await run(texts, { pooling: "mean", normalize: true });
  return output.tolist();
}

/** pgvector literal: '[0.1,0.2,…]'. Only numbers ever reach SQL. */
export function toVectorLiteral(vector: number[]): string {
  if (vector.length !== EMBEDDING_DIMENSIONS || vector.some((v) => !Number.isFinite(v)))
    throw new Error("bad-embedding");
  return `[${vector.map((v) => v.toFixed(6)).join(",")}]`;
}
