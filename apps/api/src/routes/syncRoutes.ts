import { Router } from "express";
import { syncLogQuerySchema } from "@bandhan/shared";
import { syncController } from "@/controllers/syncController";
import { requireAuth } from "@/middleware/authenticate";
import { requirePermission } from "@/middleware/authorize";
import { requireCsrf } from "@/middleware/csrf";
import { writeLimiter } from "@/middleware/rateLimit";
import { validate } from "@/middleware/validate";

/**
 * Sync routes — Google Sheets synchronisation.
 *
 * Reading status/logs is a settings-level view (`settings:read`), and every
 * write goes through the same gauntlet as the rest of the admin surface:
 * session → password-change gate (applied centrally in routes/index.ts) →
 * permission → CSRF. Triggering outbound syncs is a configuration action, so
 * managers cannot fire it — only owners and admins.
 *
 * Routes:
 *   GET  /api/v1/sync/status        — sync status + last sync info
 *   POST /api/v1/sync/test          — test Google Sheets connection
 *   POST /api/v1/sync/now           — manual full sync
 *   GET  /api/v1/sync/logs          — paginated sync logs
 *   POST /api/v1/sync/retry/:module/:id — retry syncing a specific record
 */

export const syncRoutes = Router();

syncRoutes.use(requireAuth);

syncRoutes.get("/status", requirePermission("settings:read"), syncController.status);

syncRoutes.post(
  "/test",
  writeLimiter,
  requirePermission("settings:write"),
  requireCsrf,
  syncController.test
);

syncRoutes.post(
  "/now",
  writeLimiter,
  requirePermission("settings:write"),
  requireCsrf,
  syncController.syncNow
);

syncRoutes.get(
  "/logs",
  requirePermission("settings:read"),
  validate(syncLogQuerySchema, "query"),
  syncController.logs
);

syncRoutes.post(
  "/retry/:module/:id",
  writeLimiter,
  requirePermission("settings:write"),
  requireCsrf,
  syncController.retry
);
