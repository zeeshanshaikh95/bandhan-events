import rateLimit, { ipKeyGenerator, type RateLimitRequestHandler } from "express-rate-limit";
import type { Request, Response } from "express";
import { env } from "@/config/env";
import { logger } from "@/utils/logger";

/**
 * ---------------------------------------------------------------------------
 * RATE LIMITING
 * ---------------------------------------------------------------------------
 * Layered: a general ceiling for the whole API, plus tighter budgets for the
 * endpoints an attacker would actually hammer (login, password reset, public
 * enquiry writes).
 *
 * Counters live in memory, which protects a single instance. When the API is
 * scaled horizontally or Redis is added, swap the store here and nothing else
 * changes.
 *
 * The rate limits layer on top of per-account lockout — one protects the
 * account, the other protects the process.
 */

function jsonLimiter(message: string, code = "RATE_LIMITED") {
  return (req: Request, res: Response) => {
    logger.warn("Rate limit exceeded", {
      requestId: req.requestId ?? null,
      path: req.path,
      ip: req.ip,
    });
    res.status(429).json({
      success: false,
      error: { code, message },
    });
  };
}

const commonOptions = {
  standardHeaders: true as const,
  legacyHeaders: false as const,
  // Trust X-Forwarded-For only when the deployment says the proxy is ours.
  validate: { trustProxy: false, xForwardedForHeader: false },
};

/** Baseline ceiling for every /api/v1 request. */
export const apiLimiter: RateLimitRequestHandler = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  limit: 600,
  handler: jsonLimiter("Too many requests. Please slow down and try again shortly."),
});

/**
 * Login limiter. Keyed on IP + email so one office address cannot lock out an
 * owner, while an attacker still hits the wall quickly.
 */
export const loginLimiter: RateLimitRequestHandler = rateLimit({
  ...commonOptions,
  windowMs: env.LOGIN_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  limit: env.LOGIN_RATE_LIMIT_MAX,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase().trim() : "unknown";
    return `${ipKeyGenerator(req.ip ?? "")}:${email}`;
  },
  skipSuccessfulRequests: true,
  handler: jsonLimiter(
    "Too many sign-in attempts. Please wait a few minutes before trying again.",
    "LOGIN_RATE_LIMITED"
  ),
});

/** Password reset requests — also protects the email provider from abuse. */
export const passwordResetLimiter: RateLimitRequestHandler = rateLimit({
  ...commonOptions,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  handler: jsonLimiter("Too many reset requests. Please try again later."),
});

/** Public enquiry writes — a person will never submit five forms an hour. */
export const enquiryLimiter: RateLimitRequestHandler = rateLimit({
  ...commonOptions,
  windowMs: env.ENQUIRY_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  limit: env.ENQUIRY_RATE_LIMIT_MAX,
  handler: jsonLimiter(
    "We have received several enquiries from this connection. Please contact us directly on WhatsApp.",
    "ENQUIRY_RATE_LIMITED"
  ),
});

/** Authenticated write operations (used where a burst would be suspicious). */
export const writeLimiter: RateLimitRequestHandler = rateLimit({
  ...commonOptions,
  windowMs: 60 * 1000,
  limit: 60,
  handler: jsonLimiter("Too many changes at once. Please slow down."),
});
