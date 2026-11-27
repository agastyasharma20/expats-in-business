import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { FullConfig } from "@playwright/test";

/**
 * `next dev` compiles each route on first request. Parallel workers hitting a cold route at the same
 * moment can race the compiler, so we request each smoke route once, serially, before tests start.
 */
const WARM_ROUTES = ["/", "/api/health", "/styleguide", "/events", "/legal/privacy"];

/** Demo personas signed in once per run (sign-in is rate-limited to 5 per minute per IP). */
export const PERSONAS = {
  admin: "admin@demo.eib.local",
  karim: "karim@demo.eib.local",
  priya: "priya@demo.eib.local",
  marta: "marta.provider@demo.eib.local",
} as const;
export const AUTH_DIR = path.join("test-results", ".auth");
export const authFile = (persona: keyof typeof PERSONAS) => path.join(AUTH_DIR, `${persona}.json`);

async function signIn(baseURL: string, email: string) {
  const response = await fetch(new URL("/api/auth/sign-in/email", baseURL), {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: baseURL },
    body: JSON.stringify({ email, password: "Demo!2026" }),
  });
  if (!response.ok) throw new Error(`sign-in failed for ${email}: ${response.status}`);
  const host = new URL(baseURL).hostname;
  const cookies = response.headers.getSetCookie().map((header) => {
    const [pair] = header.split(";");
    const index = pair!.indexOf("=");
    return {
      name: pair!.slice(0, index),
      value: pair!.slice(index + 1),
      domain: host,
      path: "/",
      expires: -1,
      httpOnly: true,
      secure: baseURL.startsWith("https:"),
      sameSite: "Lax" as const,
    };
  });
  return { cookies, origins: [] };
}

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL) return;
  if (!process.env.CI) {
    for (const route of WARM_ROUTES) {
      const response = await fetch(new URL(route, baseURL));
      await response.text();
    }
  }
  if (process.env.E2E_EXPECT_DB === "true") {
    mkdirSync(AUTH_DIR, { recursive: true });
    for (const [persona, email] of Object.entries(PERSONAS)) {
      writeFileSync(
        authFile(persona as keyof typeof PERSONAS),
        JSON.stringify(await signIn(baseURL, email)),
      );
    }
  }
}
