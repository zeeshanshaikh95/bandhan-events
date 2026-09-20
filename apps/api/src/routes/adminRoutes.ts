import { Router } from "express";
import {
  settingsPatchSchema,
  userCreateSchema,
  userListQuerySchema,
  userPasswordResetSchema,
  userUpdateSchema,
} from "@bandhan/shared";
import {
  auditController,
  auditQuerySchema,
  dashboardController,
  settingsController,
  userController,
} from "@/controllers/adminController";
import { requireAuth, requirePasswordChanged } from "@/middleware/authenticate";
import { requireOwner, requirePermission } from "@/middleware/authorize";
import { requireCsrf } from "@/middleware/csrf";
import { writeLimiter } from "@/middleware/rateLimit";
import { validate } from "@/middleware/validate";
import { asyncHandler } from "@/utils/http";

/** Dashboard: overview counters and integration health. */
const dashboard = Router();
dashboard.use(requireAuth, requirePasswordChanged);
dashboard.get("/stats", requirePermission("dashboard:read"), asyncHandler(dashboardController.stats));
dashboard.get(
  "/integrations",
  requirePermission("settings:read"),
  asyncHandler(dashboardController.integrations)
);

/**
 * User administration. Reserved for owners: creating accounts, changing roles
 * and resetting other people's passwords is exactly the privilege that must
 * never leak to an operations admin or a manager.
 */
const users = Router();
users.use(requireAuth, requirePasswordChanged, requireOwner);
users.get("/", validate(userListQuerySchema, "query"), asyncHandler(userController.list));
users.post("/", writeLimiter, requireCsrf, validate(userCreateSchema), asyncHandler(userController.create));
users.patch("/:id", writeLimiter, requireCsrf, validate(userUpdateSchema), asyncHandler(userController.update));
users.post(
  "/:id/reset-password",
  writeLimiter,
  requireCsrf,
  validate(userPasswordResetSchema),
  asyncHandler(userController.resetPassword)
);

/** Business settings: database-backed values the website renders. */
const settings = Router();
settings.use(requireAuth, requirePasswordChanged);
settings.get("/", requirePermission("settings:read"), asyncHandler(settingsController.get));
settings.put(
  "/",
  writeLimiter,
  requirePermission("settings:write"),
  requireCsrf,
  validate(settingsPatchSchema),
  asyncHandler(settingsController.update)
);

/** Audit trail — readable by owners and admins, never by managers. */
const audit = Router();
audit.use(requireAuth, requirePasswordChanged);
audit.get(
  "/",
  requirePermission("audit:read"),
  validate(auditQuerySchema, "query"),
  asyncHandler(auditController.list)
);

export const adminRoutes = { dashboard, users, settings, audit };
