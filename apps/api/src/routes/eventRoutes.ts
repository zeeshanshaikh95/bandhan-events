import { Router } from "express";
import { eventListQuerySchema } from "@bandhan/shared";
import { eventController } from "@/controllers/eventController";
import { requireAuth } from "@/middleware/authenticate";
import { requirePermission } from "@/middleware/authorize";
import { requireCsrf } from "@/middleware/csrf";
import { writeLimiter } from "@/middleware/rateLimit";
import { validate } from "@/middleware/validate";

/**
 * Event routes — all protected behind authentication + permission checks.
 */

export const eventRoutes = Router();

eventRoutes.use(requireAuth);

// ── CRUD ─────────────────────────────────────────────────────────────────────

eventRoutes.get(
  "/",
  requirePermission("events:read"),
  validate(eventListQuerySchema, "query"),
  eventController.list
);

eventRoutes.get(
  "/calendar",
  requirePermission("events:read"),
  eventController.calendar
);

eventRoutes.get(
  "/upcoming",
  requirePermission("events:read"),
  eventController.upcoming
);

eventRoutes.get(
  "/dashboard-stats",
  requirePermission("events:read"),
  eventController.dashboardStats
);

eventRoutes.get(
  "/:id",
  requirePermission("events:read"),
  eventController.get
);

eventRoutes.post(
  "/",
  requirePermission("events:write"),
  writeLimiter,
  requireCsrf,
  eventController.create
);

eventRoutes.patch(
  "/:id",
  requirePermission("events:write"),
  writeLimiter,
  requireCsrf,
  eventController.update
);

eventRoutes.delete(
  "/:id",
  requirePermission("events:write"),
  writeLimiter,
  requireCsrf,
  eventController.archive
);

// ── Status ───────────────────────────────────────────────────────────────────

eventRoutes.patch(
  "/:id/status",
  requirePermission("events:write"),
  writeLimiter,
  requireCsrf,
  eventController.updateStatus
);

// ── Financials ───────────────────────────────────────────────────────────────

eventRoutes.get(
  "/:id/financials",
  requirePermission("events:read"),
  eventController.financials
);

// ── Notes ────────────────────────────────────────────────────────────────────

eventRoutes.post(
  "/:id/notes",
  requirePermission("events:write"),
  writeLimiter,
  requireCsrf,
  eventController.addNote
);
