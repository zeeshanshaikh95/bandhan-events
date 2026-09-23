import { Router, raw } from "express";
import {
  vendorCreateSchema,
  vendorListQuerySchema,
  vendorNoteSchema,
  vendorStatusSchema,
  vendorUpdateSchema,
} from "@bandhan/shared";
import { vendorController } from "@/controllers/vendorController";
import { requireAuth, requirePasswordChanged } from "@/middleware/authenticate";
import { requirePermission } from "@/middleware/authorize";
import { requireCsrf } from "@/middleware/csrf";
import { writeLimiter } from "@/middleware/rateLimit";
import { validate } from "@/middleware/validate";
import { MAX_UPLOAD_BYTES, ALLOWED_DOCUMENT_MIME_TYPES } from "@/services/documentService";
import { asyncHandler } from "@/utils/http";

/**
 * Vendors and caterers.
 *
 * Financial reads and writes sit behind `vendors:finance`, which a manager does
 * not hold: a manager can maintain the vendor directory and assign vendors to
 * events, but cannot see or move supplier money.
 */
export const vendorRoutes = Router();

vendorRoutes.use(requireAuth, requirePasswordChanged);

// ── Read ─────────────────────────────────────────────────────────────────────

vendorRoutes.get(
  "/",
  requirePermission("vendors:read"),
  validate(vendorListQuerySchema, "query"),
  asyncHandler(vendorController.list)
);

vendorRoutes.get("/options", requirePermission("vendors:read"), asyncHandler(vendorController.options));

vendorRoutes.get("/:id", requirePermission("vendors:read"), asyncHandler(vendorController.get));

vendorRoutes.get(
  "/:id/financials",
  requirePermission("vendors:finance"),
  asyncHandler(vendorController.financials)
);

vendorRoutes.get(
  "/:id/payments",
  requirePermission("vendors:finance"),
  asyncHandler(vendorController.payments)
);

vendorRoutes.get("/:id/notes", requirePermission("vendors:read"), asyncHandler(vendorController.notes));

vendorRoutes.get("/:id/documents", requirePermission("vendors:read"), asyncHandler(vendorController.documents));

// ── Write ────────────────────────────────────────────────────────────────────

vendorRoutes.post(
  "/",
  writeLimiter,
  requirePermission("vendors:write"),
  requireCsrf,
  validate(vendorCreateSchema),
  asyncHandler(vendorController.create)
);

vendorRoutes.patch(
  "/:id",
  writeLimiter,
  requirePermission("vendors:write"),
  requireCsrf,
  validate(vendorUpdateSchema),
  asyncHandler(vendorController.update)
);

vendorRoutes.patch(
  "/:id/status",
  writeLimiter,
  requirePermission("vendors:write"),
  requireCsrf,
  validate(vendorStatusSchema),
  asyncHandler(vendorController.setStatus)
);

vendorRoutes.post(
  "/:id/notes",
  writeLimiter,
  requirePermission("vendors:write"),
  requireCsrf,
  validate(vendorNoteSchema),
  asyncHandler(vendorController.addNote)
);

/**
 * Uploads are parsed here rather than globally: `express.raw` only runs for the
 * types on the allow-list and only up to the storage ceiling, so a large or
 * unexpected body is refused before it is buffered.
 */
vendorRoutes.post(
  "/:id/documents",
  writeLimiter,
  requirePermission("vendors:write"),
  requireCsrf,
  raw({ type: [...ALLOWED_DOCUMENT_MIME_TYPES], limit: MAX_UPLOAD_BYTES }),
  asyncHandler(vendorController.uploadDocument)
);

/** Retiring a vendor is destructive-ish, so it needs the stricter permission. */
vendorRoutes.delete(
  "/:id",
  requirePermission("vendors:delete"),
  requireCsrf,
  asyncHandler(vendorController.archive)
);
