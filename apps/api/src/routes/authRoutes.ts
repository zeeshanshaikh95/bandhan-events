import { Router } from "express";
import { changePasswordSchema, forgotPasswordSchema, loginSchema, resetPasswordSchema } from "@bandhan/shared";
import { authController } from "@/controllers/authController";
import { requireAuth } from "@/middleware/authenticate";
import { requireCsrf } from "@/middleware/csrf";
import { loginLimiter, passwordResetLimiter } from "@/middleware/rateLimit";
import { validate } from "@/middleware/validate";
import { asyncHandler } from "@/utils/http";

export const authRoutes = Router();

/**
 * Sign-in is rate limited per IP + email and additionally protected by
 * per-account lockout inside the service.
 */
authRoutes.post("/login", loginLimiter, validate(loginSchema), asyncHandler(authController.login));

/** Logout only needs a session and a CSRF token; a forced password change
 *  must not stop someone from signing out. */
authRoutes.post("/logout", requireAuth, requireCsrf, asyncHandler(authController.logout));

/** Session probe for the dashboard shell. */
authRoutes.get("/session", asyncHandler(authController.session));

/** Reachable while `mustChangePassword` is set, otherwise the account could
 *  never complete its own first-login reset. */
authRoutes.post(
  "/change-password",
  requireAuth,
  requireCsrf,
  validate(changePasswordSchema),
  asyncHandler(authController.changePassword)
);

authRoutes.post(
  "/forgot-password",
  passwordResetLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword)
);

authRoutes.post(
  "/reset-password",
  passwordResetLimiter,
  validate(resetPasswordSchema),
  asyncHandler(authController.resetPassword)
);
