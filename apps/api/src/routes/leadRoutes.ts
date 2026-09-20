import { Router } from "express";
import {
  leadCreateSchema,
  leadListQuerySchema,
  leadNoteSchema,
  leadUpdateSchema,
} from "@bandhan/shared";
import { leadController } from "@/controllers/leadController";
import { requireAuth, requirePasswordChanged } from "@/middleware/authenticate";
import { requirePermission } from "@/middleware/authorize";
import { requireCsrf } from "@/middleware/csrf";
import { writeLimiter } from "@/middleware/rateLimit";
import { validate } from "@/middleware/validate";
import { asyncHandler } from "@/utils/http";

/**
 * CRM endpoints.
 *
 * Every route runs the same gauntlet, in this order:
 *   session → password-change gate → permission → CSRF (writes)
 * so authorization is decided server-side on each request rather than inferred
 * from whatever the dashboard chose to render.
 */
export const leadRoutes = Router();

leadRoutes.use(requireAuth, requirePasswordChanged);

leadRoutes.get(
  "/",
  requirePermission("leads:read"),
  validate(leadListQuerySchema, "query"),
  asyncHandler(leadController.list)
);

leadRoutes.get("/:id", requirePermission("leads:read"), asyncHandler(leadController.get));

leadRoutes.post(
  "/",
  writeLimiter,
  requirePermission("leads:write"),
  requireCsrf,
  validate(leadCreateSchema),
  asyncHandler(leadController.create)
);

leadRoutes.patch(
  "/:id",
  writeLimiter,
  requirePermission("leads:write"),
  requireCsrf,
  validate(leadUpdateSchema),
  asyncHandler(leadController.update)
);

leadRoutes.post(
  "/:id/notes",
  writeLimiter,
  requirePermission("leads:write"),
  requireCsrf,
  validate(leadNoteSchema),
  asyncHandler(leadController.addNote)
);

/** Archiving is destructive-ish, so it needs the stricter permission. */
leadRoutes.delete(
  "/:id",
  requirePermission("leads:delete"),
  requireCsrf,
  asyncHandler(leadController.archive)
);
