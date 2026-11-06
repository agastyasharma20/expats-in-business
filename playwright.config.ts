import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3000);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: true,
  // The first request to `next dev` compiles the route, which can take a while on Windows.
  timeout: isCI ? 30_000 : 90_000,
  expect: { timeout: isCI ? 5_000 : 30_000 },
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 375, height: 812 } } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // CI runs `npm run build` first, then tests the production server.
        command: isCI ? "npm run start" : "npm run dev",
        url: `${baseURL}/api/health`,
        reuseExistingServer: !isCI,
        timeout: 120_000,
      },
});
