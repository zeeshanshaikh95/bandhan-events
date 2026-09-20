import { randomBytes } from "node:crypto";
import { z } from "zod";

/**
 * ---------------------------------------------------------------------------
 * ENVIRONMENT
 * ---------------------------------------------------------------------------
 * Everything the server needs is validated here, once, at startup. A missing
 * or malformed secret stops the process instead of surfacing as a runtime bug
 * in production.
 *
 * Never import this module from the browser — these values are server-only.
 */

const booleanish = z
  .union([z.boolean(), z.string()])
  .transform((value) =>
    typeof value === "boolean" ? value : ["1", "true", "yes", "on"].includes(value.toLowerCase())
  );

/**
 * Empty environment values mean "not set": an empty PORT or COOKIE_SECURE in a
 * .env file must fall back to the documented default rather than failing
 * validation (or coercing to 0).
 *
 * The preprocessing is applied around the full object schema — wrapping a
 * partial schema here would strip every other key and silently replace real
 * configuration with defaults.
 */
const envSchema = z.preprocess(
  (raw) => {
    if (typeof raw !== "object" || raw === null) return raw;
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (value === "" || value === undefined) continue;
      cleaned[key] = value;
    }
    return cleaned;
  },
  z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // 0 means "let the OS pick a free port" (useful in tests and when the
  // hosting platform injects PORT=0). The bound port is logged at startup.
  PORT: z.coerce.number().int().min(0).max(65535).default(4000),
  HOST: z.string().default("127.0.0.1"),

  // Database
  MONGODB_URI: z.string().min(1).optional(),
  /**
   * Development/test convenience: boots a throwaway in-memory MongoDB so the
   * API can be run and tested without a local server. Refused in production.
   */
  USE_IN_MEMORY_DB: booleanish.default(false),

  // Sessions
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters.").optional(),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(12),
  SESSION_IDLE_TIMEOUT_MINUTES: z.coerce.number().int().min(5).max(1440).default(120),
  COOKIE_NAME: z.string().default("bandhan_sid"),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: booleanish.optional(),
  COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),

  // Browser access
  CORS_ORIGINS: z.string().default(""),
  TRUST_PROXY: booleanish.default(false),

  // Login protection
  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(3).max(20).default(5),
  LOGIN_LOCK_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
  LOGIN_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().min(1).max(120).default(15),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().min(3).max(100).default(10),

  // Public enquiry protection
  ENQUIRY_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(100).default(5),
  ENQUIRY_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().min(1).max(1440).default(60),

  // Mail (optional — the platform never pretends an email was sent)
  EMAIL_PROVIDER: z.enum(["console", "smtp"]).default("console"),
  EMAIL_FROM: z.string().default("Bandhan Events <no-reply@bandhanevents.in>"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),

  // Optional third-party integrations
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_ACCESS_TOKEN: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  })
);

export type Env = z.infer<typeof envSchema> & { SESSION_SECRET: string };

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  const base = parsed.data;
  const isProduction = base.NODE_ENV === "production";

  // Secret validation: production must have a real secret, always.
  if (isProduction && !base.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is required in production (min 32 characters).");
  }
  if (isProduction && !base.MONGODB_URI) {
    throw new Error("MONGODB_URI is required in production.");
  }
  if (isProduction && base.USE_IN_MEMORY_DB) {
    throw new Error("USE_IN_MEMORY_DB cannot be enabled in production.");
  }

  return {
    ...base,
    SESSION_SECRET: base.SESSION_SECRET ?? randomBytes(48).toString("base64url"),
    COOKIE_SECURE: base.COOKIE_SECURE ?? isProduction,
  };
}

export const env = loadEnv();

export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
export const isDevelopment = env.NODE_ENV === "development";

/** True when SESSION_SECRET was generated for this process (dev only). */
export const usingEphemeralSessionSecret = !process.env.SESSION_SECRET;

if (usingEphemeralSessionSecret && !isTest) {
  // eslint-disable-next-line no-console
  console.warn(
    "[config] SESSION_SECRET is not set — using an ephemeral secret. " +
      "Sessions will be invalidated on restart. Set SESSION_SECRET in .env."
  );
}

export const corsOrigins: string[] = env.CORS_ORIGINS.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
