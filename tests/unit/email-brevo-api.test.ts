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
  EMAIL_FROM: "Expats in Business <hello@example.test>",
};

async function load(extra: Record<string, string>) {
  vi.resetModules();
  vi.unstubAllEnvs();
  for (const [key, value] of Object.entries({ ...baseEnv, ...extra })) vi.stubEnv(key, value);
  return import("@/lib/email");
}

describe("sending through Brevo's HTTPS API", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    sendMail.mockClear();
  });

  it("splits the sender into name and address", async () => {
    const { parseSender } = await load({});
    expect(parseSender("Expats in Business <hello@example.test>")).toEqual({
      name: "Expats in Business",
      email: "hello@example.test",
    });
    expect(parseSender("hello@example.test")).toEqual({ email: "hello@example.test" });
  });

  it("posts to the API over HTTPS and never touches SMTP when BREVO_API_KEY is set", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201 });
    vi.stubGlobal("fetch", fetchMock);
    const { sendEmail } = await load({ BREVO_API_KEY: "xkeysib-0123456789abcdef0123456789" });
    await sendEmail({ to: "a@b.test", subject: "Hi", text: "line one\nline two" });
    expect(sendMail).not.toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(init.headers["api-key"]).toBe("xkeysib-0123456789abcdef0123456789");
    const body = JSON.parse(init.body);
    expect(body.sender).toEqual({ name: "Expats in Business", email: "hello@example.test" });
    expect(body.to).toEqual([{ email: "a@b.test" }]);
    expect(body.htmlContent).toBe("line one<br>line two");
  });

  it("fails loudly, without leaking the message, when the API refuses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    const { sendEmail } = await load({ BREVO_API_KEY: "xkeysib-0123456789abcdef0123456789" });
    const failure = sendEmail({ to: "secret@b.test", subject: "S", text: "private body" });
    await expect(failure).rejects.toThrow("HTTP 401");
    await expect(failure).rejects.not.toThrow(/secret@b\.test|private body/);
  });

  it("uses SMTP when no API key is set", async () => {
    const { sendEmail } = await load({});
    await sendEmail({ to: "a@b.test", subject: "Hi", text: "t" });
    expect(sendMail).toHaveBeenCalledTimes(1);
  });
});
