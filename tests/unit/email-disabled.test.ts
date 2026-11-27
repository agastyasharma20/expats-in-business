import { afterEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.fn();
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail }) },
}));

const baseEnv = {
  APP_URL: "http://localhost:3000",
  BETTER_AUTH_URL: "http://localhost:3000",
  BETTER_AUTH_SECRET: "test-only-secret-0123456789abcdef0123",
  DATABASE_URL: "postgresql://x@localhost/x",
};

async function loadSend(extra: Record<string, string>) {
  vi.resetModules();
  vi.unstubAllEnvs();
  for (const [key, value] of Object.entries({ ...baseEnv, ...extra })) vi.stubEnv(key, value);
  return (await import("@/lib/email")).sendEmail;
}

describe("sendEmail in a sandbox", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    sendMail.mockClear();
  });

  it("sends nothing and does not throw when EMAIL_DISABLED is on", async () => {
    const send = await loadSend({ EMAIL_DISABLED: "true" });
    await expect(send({ to: "a@b.test", subject: "s", text: "t" })).resolves.toBeUndefined();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("still sends when EMAIL_DISABLED is off", async () => {
    const send = await loadSend({ EMAIL_DISABLED: "false" });
    await send({ to: "a@b.test", subject: "s", text: "t" });
    expect(sendMail).toHaveBeenCalledTimes(1);
  });
});
