import type { NextFunction, Request, Response } from "express";
import { env } from "@/config/env";
import { sessionService } from "@/services/sessionService";
import { ApiError } from "@/utils/ApiError";

/**
 * Reads the httpOnly session cookie and resolves it server-side. Tokens are
 * never trusted from a body, header or localStorage — the cookie is the only
 * credential, and it is opaque.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.cookies?.[env.COOKIE_NAME] as string | undefined;
    if (!token) return next();

    const context = await sessionService.resolve(token);
    if (context) req.auth = context;
    return next();
  } catch (error) {
    return next(error);
  }
}

/** Rejects the request when the session cookie is missing or invalid. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth) {
    return next(ApiError.unauthorized("Please sign in to continue.", "SESSION_REQUIRED"));
  }
  next();
}

/**
 * Blocks every admin API until a first-login password change has happened.
 * The login itself and the change-password endpoint stay reachable, otherwise
 * the account would be locked out of its own reset.
 */
export function requirePasswordChanged(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth) return next(ApiError.unauthorized("Please sign in to continue.", "SESSION_REQUIRED"));
  if (req.auth.user.mustChangePassword) {
    return next(
      ApiError.forbidden(
        "Set a new password to continue.",
        "PASSWORD_CHANGE_REQUIRED"
      )
    );
  }
  next();
}
