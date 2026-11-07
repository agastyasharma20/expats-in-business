import type { FullConfig } from "@playwright/test";

/**
 * `next dev` compiles each route on first request. Parallel workers hitting a cold route at the same
 * moment can race the compiler, so we request each smoke route once, serially, before tests start.
 */
const WARM_ROUTES = ["/", "/api/health", "/styleguide"];

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL || process.env.CI) return;
  for (const route of WARM_ROUTES) {
    const response = await fetch(new URL(route, baseURL));
    await response.text();
  }
}
