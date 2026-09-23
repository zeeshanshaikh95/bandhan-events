import { Router } from "express";
import {
  acceptQuotationSchema,
  cancelQuotationSchema,
  convertQuotationSchema,
  createQuotationSchema,
  quotationListQuerySchema,
  rejectQuotationSchema,
  updateQuotationSchema,
} from "@bandhan/shared";
import { quotationController } from "@/controllers/quotationController";
import { requireAuth, requirePasswordChanged } from "@/middleware/authenticate";
import { requirePermission } from "@/middleware/authorize";
import { requireCsrf } from "@/middleware/csrf";
import { writeLimiter } from "@/middleware/rateLimit";
import { validate } from "@/middleware/validate";
import { asyncHandler } from "@/utils/http";

/**
 * Quotations.
 *
 * Lifecycle transitions are separate routes rather than a `PATCH status` field
 * so that each one can carry its own payload and its own audit entry — sending,
 * accepting and converting all move money-adjacent state and must be traceable.
 */
export const quotationRoutes = Router();

quotationRoutes.use(requireAuth, requirePasswordChanged);

// ── Read ─────────────────────────────────────────────────────────────────────

quotationRoutes.get(
  "/",
  requirePermission("quotations:read"),
  validate(quotationListQuerySchema, "query"),
  asyncHandler(quotationController.list)
);

quotationRoutes.get("/summary", requirePermission("quotations:read"), asyncHandler(quotationController.summary));

quotationRoutes.get("/:id", requirePermission("quotations:read"), asyncHandler(quotationController.get));

quotationRoutes.get(
  "/:id/documents",
  requirePermission("quotations:read"),
  asyncHandler(quotationController.documents)
);

// ── Write ────────────────────────────────────────────────────────────────────

quotationRoutes.post(
  "/",
  writeLimiter,
  requirePermission("quotations:write"),
  requireCsrf,
  validate(createQuotationSchema),
  asyncHandler(quotationController.create)
);

quotationRoutes.patch(
  "/:id",
  writeLimiter,
  requirePermission("quotations:write"),
  requireCsrf,
  validate(updateQuotationSchema),
  asyncHandler(quotationController.update)
);

// ── Lifecycle ────────────────────────────────────────────────────────────────

quotationRoutes.post(
  "/:id/send",
  writeLimiter,
  requirePermission("quotations:write"),
  requireCsrf,
  asyncHandler(quotationController.send)
);

quotationRoutes.post(
  "/:id/accept",
  writeLimiter,
  requirePermission("quotations:write"),
  requireCsrf,
  validate(acceptQuotationSchema),
  asyncHandler(quotationController.accept)
);

quotationRoutes.post(
  "/:id/reject",
  writeLimiter,
  requirePermission("quotations:write"),
  requireCsrf,
  validate(rejectQuotationSchema),
  asyncHandler(quotationController.reject)
);

quotationRoutes.post(
  "/:id/cancel",
  writeLimiter,
  requirePermission("quotations:write"),
  requireCsrf,
  validate(cancelQuotationSchema),
  asyncHandler(quotationController.cancel)
);

quotationRoutes.post(
  "/:id/convert-to-event",
  writeLimiter,
  requirePermission("quotations:write"),
  requireCsrf,
  validate(convertQuotationSchema),
  asyncHandler(quotationController.convertToEvent)
);

quotationRoutes.post(
  "/:id/pdf",
  writeLimiter,
  requirePermission("quotations:read"),
  requireCsrf,
  asyncHandler(quotationController.generatePdf)
);
