import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { getFeatureFlags, mergeFlags, type FeatureFlags } from "@/config/features";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";

export const FLAG_SETTING_KEY = "featureFlags";
export const FLAGS_TAG = "flags";

async function readOverrides(): Promise<unknown> {
  "use cache";
  cacheLife("hours");
  cacheTag(FLAGS_TAG);
  // Throws on failure: a caught error inside the cache would be cached (docs/DECISIONS.md).
  const row = await getDb().siteSetting.findUnique({ where: { key: FLAG_SETTING_KEY } });
  return row?.value ?? null;
}

/**
 * Current flags: env defaults plus admin overrides from /admin/settings. Cached (the header reads
 * them on every page); saving a flag calls updateTag(FLAGS_TAG), so a change applies immediately.
 */
export async function getFlags(): Promise<FeatureFlags> {
  const defaults = getFeatureFlags(getEnv());
  try {
    return mergeFlags(defaults, await readOverrides());
  } catch {
    return defaults;
  }
}
