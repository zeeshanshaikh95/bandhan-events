import type { NextFunction, Request, Response } from "express";
import { env } from "@/config/env";
import { ApiError } from "@/utils/ApiError";
import { hashToken, safeEqual } from "@/utils/crypto";

/**
 * ---------------------------------------------------------------------------
 * CSRF PROTECTION
 * ---------------------------------------------------------------------------
 * Double-submit token bound to the session:
 *
 *   - sign-in issues a random CSRF token, stored hashed on the session row and
 *     delivered to the browser in a readable (non-httpOnly) cookie;
 *   - every state-changing authenticated request must echo it in the
 *     X-CSRF-Token header;
 *   - the server compares the digest of the presented token with the session's
 *     stored hash, so a token planted by another origin is useless on its own.
 *
 * Together with SameSite cookies and a strict CORS allow-list this closes the
 * CSRF path even in production, where the dashboard and API may sit on
 * different domains and SameSite has to be "none".
 */

export const CSRF_COOKIE = "bandhan_csrf";
export const CSRF_HEADER = "x-csrf-token";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function issueCsrfCookie(res: Response, token: string): void {
  res.cookie(CSRF_COOKIE, token, {
    // Must be readable by the dashboard so it can echo the value back.
    httpOnly: false,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    domain: env.COOKIE_DOMAIN,
    path: "/",
    maxAge: env.SESSION_TTL_HOURS * 60 * 60 * 1000,
  });
}

export function clearCsrfCookie(res: Response): void {
  res.clearCookie(CSRF_COOKIE, {
    httpOnly: false,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    domain: env.COOKIE_DOMAIN,
    path: "/",
  });
}

/** Rejects unsafe methods whose CSRF token does not match the session. */
export function requireCsrf(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) return next();

  const auth = req.auth;
  if (!auth) return next(ApiError.unauthorized("Please sign in to continue.", "SESSION_REQUIRED"));

  const headerToken = req.headers[CSRF_HEADER];
  if (typeof headerToken !== "string" || headerToken.length === 0) {
    return next(ApiError.forbidden("Missing CSRF token.", "CSRF_MISSING"));
  }

  if (!safeEqual(hashToken(headerToken), auth.session.csrfTokenHash)) {
    return next(ApiError.forbidden("Invalid CSRF token.", "CSRF_INVALID"));
  }

  return next();
}
