import { getEnv } from "./env";

/** Developer pages such as /styleguide exist only in development and demo mode. */
export function areDevToolsEnabled(): boolean {
  const env = getEnv();
  return env.NODE_ENV === "development" || env.DEMO_MODE === true;
}
