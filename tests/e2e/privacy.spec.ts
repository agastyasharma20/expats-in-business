import { expect, test } from "@playwright/test";

import { authFile } from "./global-setup";

/** GDPR: a member can download everything held about them, and nobody else can. */
test.skip(process.env.E2E_EXPECT_DB !== "true", "needs the seeded database");
test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "desktop only"));

test("signed-out visitors cannot export account data", async ({ request }) => {
  const response = await request.get("/api/account/export");
  expect(response.status()).toBe(401);
});

test.describe("member", () => {
  test.use({ storageState: authFile("priya") });

  test("downloads her own data as JSON with her email, profile and roles", async ({ request }) => {
    const response = await request.get("/api/account/export");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-disposition"]).toContain("attachment");
    const body = (await response.json()) as { exportedAt: string; data: Record<string, unknown> };
    expect(body.data.email).toBe("priya@demo.eib.local");
    for (const key of ["emails", "profile", "roles", "consents", "tickets", "subscriptions"]) {
      expect(body.data, key).toHaveProperty(key);
    }
    expect(JSON.stringify(body)).not.toContain("karim@demo.eib.local");
  });
});
