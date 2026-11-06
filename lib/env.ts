import { z } from "zod";

/**
 * Environment schema. Keys must match .env.example exactly (enforced by tests/unit/env.test.ts).
 * Empty strings are treated as "not set" so optional keys can stay blank in .env.
 */
const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(emptyToUndefined, schema.optional());
const flag = (fallback: boolean) =>
  z.preprocess(emptyToUndefined, z.stringbool().default(fallback));

export const aiProviders = ["groq", "gemini", "openrouter", "demo", "anthropic"] as const;

export const envSchema = z.object({
  // App
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url(),
  DEMO_MODE: flag(false),
  DEFAULT_LOCALE: z.enum(["en", "pl", "uk"]).default("en"),
  SKIP_ENV_VALIDATION: flag(false),

  // Database
  DATABASE_URL: z.url().startsWith("postgres"),

  // Auth
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters")
    .refine((value) => value !== "replace-with-a-long-random-string", {
      message: "BETTER_AUTH_SECRET still has the .env.example placeholder; run npm run setup",
    }),
  BETTER_AUTH_URL: z.url(),
  GOOGLE_CLIENT_ID: optional(z.string()),
  GOOGLE_CLIENT_SECRET: optional(z.string()),

  // Email
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  EMAIL_FROM: z.string().min(3).default("Expats in Business <no-reply@demo.eib.local>"),

  // AI
  AI_PROVIDER: z.enum(aiProviders).default("demo"),
  GROQ_API_KEY: optional(z.string()),
  GROQ_MODEL: optional(z.string()),
  GEMINI_API_KEY: optional(z.string()),
  GEMINI_MODEL: optional(z.string()),
  OPENROUTER_API_KEY: optional(z.string()),
  OPENROUTER_MODEL: optional(z.string()),
  ANTHROPIC_API_KEY: optional(z.string()),
  AI_DAILY_FREE_QUOTA: z.coerce.number().int().nonnegative().default(10),

  // Stripe: test mode only
  STRIPE_SECRET_KEY: optional(
    z.string().startsWith("sk_test_", "Only Stripe test keys are allowed"),
  ),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: optional(
    z.string().startsWith("pk_test_", "Only Stripe test keys are allowed"),
  ),
  STRIPE_WEBHOOK_SECRET: optional(z.string().startsWith("whsec_")),

  // Feature flags (see config/features.ts)
  FEATURE_COFFEE_ROULETTE: flag(true),
  FEATURE_SESSION_PULSE: flag(true),
  FEATURE_BUBBLES_MAP: flag(true),
  FEATURE_PAID_TICKETS: flag(true),
});

export type Env = z.infer<typeof envSchema>;
export type EnvSource = Record<string, string | undefined>;

export function formatEnvIssues(error: z.ZodError): string {
  return error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`).join("\n");
}

/**
 * Parses an env source. With SKIP_ENV_VALIDATION=1 (CI builds without secrets) invalid or missing
 * values are tolerated: valid keys are kept, the rest stay undefined and must not be used.
 */
export function parseEnv(source: EnvSource): Env {
  const result = envSchema.safeParse(source);
  if (result.success) return result.data;

  if (z.stringbool().safeParse(source.SKIP_ENV_VALIDATION).data === true) {
    const lenient = envSchema.partial().safeParse(source);
    return (lenient.success ? lenient.data : {}) as Env;
  }

  throw new Error(
    `Invalid environment variables:\n${formatEnvIssues(result.error)}\n` +
      "Copy .env.example to .env and fill in the values (npm run setup does this for you).",
  );
}

let cached: Env | undefined;

/** Validated server environment, parsed once on first use. */
export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
