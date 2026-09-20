import { env, isProduction, isTest } from "@/config/env";

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_WEIGHT: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/**
 * Keys whose values must never reach the log sink. Kept deliberately broad —
 * a leaked reset token in a log file is a full account takeover.
 */
const REDACTED_KEYS = [
  "password",
  "passwordhash",
  "currentpassword",
  "newpassword",
  "temporarypassword",
  "confirmpassword",
  "token",
  "tokenhash",
  "resettoken",
  "resettokenhash",
  "csrftoken",
  "csrftokenhash",
  "authorization",
  "cookie",
  "set-cookie",
  "sessionsecret",
  "secret",
  "apikey",
  "access_token",
  "mongodb_uri",
];

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[truncated]";
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redact(item, depth + 1));

  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    output[key] = REDACTED_KEYS.includes(key.toLowerCase()) ? "[redacted]" : redact(item, depth + 1);
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
