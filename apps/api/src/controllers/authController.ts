import type { CookieOptions, Request, Response } from "express";
import { env, isProduction } from "@/config/env";
import { authService } from "@/services/authService";
import { emailService } from "@/integrations/email";
import { ApiError } from "@/utils/ApiError";
import { clientIp, requestId, sendSuccess } from "@/utils/http";
import { clearCsrfCookie, issueCsrfCookie } from "@/middleware/csrf";
import { logger } from "@/utils/logger";

/** Shared cookie options — the session cookie is opaque and httpOnly. */
function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    domain: env.COOKIE_DOMAIN,
    path: "/",
  };
}

function contextFrom(req: Request) {
  return {
    ip: clientIp(req),
    userAgent: String(req.headers["user-agent"] ?? "unknown"),
    requestId: requestId(req),
  };
}

export const authController = {
  /** POST /auth/login */
  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body as { email: string; password: string };
    const result = await authService.login({ email, password }, contextFrom(req));

    res.cookie(
      env.COOKIE_NAME,
      result.token,
      { ...sessionCookieOptions(), maxAge: env.SESSION_TTL_HOURS * 60 * 60 * 1000 }
    );
    issueCsrfCookie(res, result.csrfToken);

    sendSuccess(res, {
      user: result.user,
      expiresAt: result.expiresAt.toISOString(),
    });
  },

  /** POST /auth/logout */
  async logout(req: Request, res: Response): Promise<void> {
    const auth = req.auth;
    const token = req.cookies?.[env.COOKIE_NAME] as string | undefined;

    if (auth && token) {
      await authService.logout(auth, contextFrom(req), token);
    }

    res.clearCookie(env.COOKIE_NAME, sessionCookieOptions());
    clearCsrfCookie(res);
    sendSuccess(res, { signedOut: true });
  },

  /** GET /auth/session — how the dashboard decides to show the login screen. */
  async session(req: Request, res: Response): Promise<void> {
    const auth = req.auth;
    if (!auth) throw ApiError.unauthorized("Please sign in to continue.", "SESSION_REQUIRED");

    sendSuccess(res, {
      user: auth.user,
      expiresAt: auth.session.expiresAt.toISOString(),
    });
  },

  /** POST /auth/change-password */
  async changePassword(req: Request, res: Response): Promise<void> {
    const auth = req.auth;
    if (!auth) throw ApiError.unauthorized("Please sign in to continue.", "SESSION_REQUIRED");

    await authService.changePassword(auth, req.body, contextFrom(req));

    // All sessions were revoked, including this one.
    res.clearCookie(env.COOKIE_NAME, sessionCookieOptions());
    clearCsrfCookie(res);

    sendSuccess(res, { passwordChanged: true, signedOut: true });
  },

  /**
   * POST /auth/forgot-password
   * Always the same response, whether or not the address exists.
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    const { email } = req.body as { email: string };
    const context = contextFrom(req);
    const { token, user } = await authService.requestPasswordReset(email, context);

    if (token && user) {
      const baseUrl = env.CORS_ORIGINS.split(",")[0]?.trim().replace(/\/$/, "") || "http://localhost:5173";
      const resetUrl = `${baseUrl}/admin/reset-password?token=${encodeURIComponent(token)}`;
      const result = await emailService.sendPasswordReset(user.email, resetUrl, user.name);

      // Development convenience: the console provider logs the link. The API
      // never returns the token in a response body.
      if (!isProduction && !result.delivered) {
        logger.info("Password reset link generated (not emailed)", { resetUrl });
      }
    }

    sendSuccess(res, {
      message: "If that email address belongs to an account, a reset link is on its way.",
    });
  },

  /** POST /auth/reset-password */
  async resetPassword(req: Request, res: Response): Promise<void> {
    const result = await authService.resetPassword(req.body, contextFrom(req));
    sendSuccess(res, { email: result.email });
  },
};
