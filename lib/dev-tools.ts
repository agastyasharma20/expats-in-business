import { getEnv } from "./env";

/**
 * Developer pages such as /styleguide exist only in development and demo mode.
 * Pages calling this without a request-time API are prerendered, so the answer is fixed when
 * `next build` runs: build with the DEMO_MODE you will serve with. Never deploy a public site with
 * DEMO_MODE=true (it also shows demo accounts from Milestone 4).
 */
export function areDevToolsEnabled(): boolean {
  const env = getEnv();
  return env.NODE_ENV === "development" || env.DEMO_MODE === true;
}
