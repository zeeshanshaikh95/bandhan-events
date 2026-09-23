import { env, isProduction, isTest } from "@/config/env";

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_WEIGHT: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/**
 * Key patterns whose values must never reach the log sink. Matched as
 * substrings, case-insensitively, so composite names the exact-match list
 * would miss — `smtp_password`, `meta_app_secret`, `cloudinary_api_secret`,
 * `google_sheets_private_key` — are all covered. A leaked credential in a log
 * file is a full compromise of whatever it opens.
 */
const REDACT_PATTERNS: RegExp[] = [
  /password/i,
  /token/i,
  /secret/i,
  /passphrase/i,
  /private_?key/i,
  /api[_-]?key/i,
  /authorization/i,
  /cookie/i,
  /credential/i,
  /mongodb_uri/i,
];

function isSensitiveKey(key: string): boolean {
  return REDACT_PATTERNS.some((pattern) => pattern.test(key));
}

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[truncated]";
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redact(item, depth + 1));

  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    output[key] = isSensitiveKey(key) ? "[redacted]" : redact(item, depth + 1);
  }
  return output;
}

function write(level: Level, message: string, context?: Record<string, unknown>): void {
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[env.LOG_LEVEL]) return;

  const entry = {
    level,
    time: new Date().toISOString(),
    message,
    ...(context ? { context: redact(context) as Record<string, unknown> } : {}),
  };

  const line = isProduction ? JSON.stringify(entry) : `[${level}] ${message}`;
  const extra = !isProduction && context ? ` ${JSON.stringify(redact(context))}` : "";

  if (level === "error") console.error(line + extra);
  else if (level === "warn") console.warn(line + extra);
  else console.log(line + extra);
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => {
    if (!isTest) write("debug", message, context);
  },
  info: (message: string, context?: Record<string, unknown>) => write("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => write("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => write("error", message, context),
};
