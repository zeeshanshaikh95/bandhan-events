import { Router } from "express";
import {
  createVendorAssignmentSchema,
  createVendorPaymentSchema,
  updateVendorAssignmentSchema,
} from "@bandhan/shared";
import { eventVendorController } from "@/controllers/eventVendorController";
import { requireAuth, requirePasswordChanged } from "@/middleware/authenticate";
import { requirePermission } from "@/middleware/authorize";
import { requireCsrf } from "@/middleware/csrf";
import { writeLimiter } from "@/middleware/rateLimit";
import { validate } from "@/middleware/validate";
import { asyncHandler } from "@/utils/http";

/**
 * Vendor work on one event.
 *
 * Mounted with `mergeParams` so `:eventId` from the parent router is available
 * here. Assignment writes need `vendors:write`; recording what a vendor has
 * been paid needs `vendors:finance`, because it moves money.
 */
export const eventVendorRoutes = Router({ mergeParams: true });

eventVendorRoutes.use(requireAuth, requirePasswordChanged);

eventVendorRoutes.get(
  "/",
  requirePermission("vendors:read"),
  asyncHandler(eventVendorController.list)
);

/** Declared before `/:assignmentId` so the literal path wins. */
eventVendorRoutes.get(
  "/payments",
  requirePermission("vendors:finance"),
  asyncHandler(eventVendorController.payments)
);

eventVendorRoutes.post(
  "/",
  writeLimiter,
  requirePermission("vendors:write"),
  requireCsrf,
  validate(createVendorAssignmentSchema),
  asyncHandler(eventVendorController.assign)
);

eventVendorRoutes.patch(
  "/:assignmentId",
  writeLimiter,
  requirePermission("vendors:write"),
  requireCsrf,
  validate(updateVendorAssignmentSchema),
  asyncHandler(eventVendorController.update)
);

eventVendorRoutes.delete(
  "/:assignmentId",
  writeLimiter,
  requirePermission("vendors:write"),
  requireCsrf,
  asyncHandler(eventVendorController.remove)
);

eventVendorRoutes.post(
  "/:assignmentId/payments",
  writeLimiter,
  requirePermission("vendors:finance"),
  requireCsrf,
  validate(createVendorPaymentSchema),
  asyncHandler(eventVendorController.recordPayment)
);
