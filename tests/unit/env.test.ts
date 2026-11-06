import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { envSchema, parseEnv, type EnvSource } from "@/lib/env";

const examplePath = path.resolve(__dirname, "../../.env.example");

function readExampleKeys(): string[] {
  return readFileSync(examplePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"))
    .map((line) => line.slice(0, line.indexOf("=")));
}

const validEnv: EnvSource = {
  NODE_ENV: "test",
  APP_URL: "http://localhost:3000",
  DEMO_MODE: "true",
  DEFAULT_LOCALE: "en",
  DATABASE_URL: "postgresql://eib:eib_local_only@localhost:5432/eib",
  BETTER_AUTH_SECRET: "test-only-secret-0123456789abcdef0123",
  BETTER_AUTH_URL: "http://localhost:3000",
  GOOGLE_CLIENT_ID: "",
  EMAIL_FROM: "Expats in Business <no-reply@demo.eib.local>",
  STRIPE_SECRET_KEY: "",
};

describe("env schema", () => {
  it("has exactly the keys listed in .env.example", () => {
    expect(Object.keys(envSchema.shape).sort()).toEqual(readExampleKeys().sort());
  });

  it("parses a valid env, applying defaults and coercion", () => {
    const env = parseEnv(validEnv);
    expect(env.DEMO_MODE).toBe(true);
    expect(env.SMTP_PORT).toBe(1025);
    expect(env.AI_PROVIDER).toBe("demo");
    expect(env.AI_DAILY_FREE_QUOTA).toBe(10);
    expect(env.FEATURE_COFFEE_ROULETTE).toBe(true);
  });

  it("treats empty optional values as not set", () => {
    const env = parseEnv(validEnv);
    expect(env.GOOGLE_CLIENT_ID).toBeUndefined();
    expect(env.STRIPE_SECRET_KEY).toBeUndefined();
  });

  it("parses feature flags from strings", () => {
    expect(parseEnv({ ...validEnv, FEATURE_SESSION_PULSE: "false" }).FEATURE_SESSION_PULSE).toBe(
      false,
    );
  });

  it("rejects live Stripe keys", () => {
    expect(() => parseEnv({ ...validEnv, STRIPE_SECRET_KEY: "sk_live_123" })).toThrow(
      /Only Stripe test keys/,
    );
  });

  it("rejects the placeholder auth secret from .env.example", () => {
    expect(() =>
      parseEnv({ ...validEnv, BETTER_AUTH_SECRET: "replace-with-a-long-random-string" }),
    ).toThrow(/placeholder/);
  });

  it("names every missing variable in the error", () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL[\s\S]*BETTER_AUTH_SECRET/);
  });

  it("tolerates missing values when SKIP_ENV_VALIDATION is set", () => {
    const env = parseEnv({ SKIP_ENV_VALIDATION: "1", APP_URL: "http://localhost:3000" });
    expect(env.APP_URL).toBe("http://localhost:3000");
    expect(env.DATABASE_URL).toBeUndefined();
  });
});
