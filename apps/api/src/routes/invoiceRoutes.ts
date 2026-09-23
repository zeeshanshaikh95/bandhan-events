import { Router } from "express";
import {
  createInvoiceSchema,
  invoiceListQuerySchema,
  updateInvoiceSchema,
  voidInvoiceSchema,
} from "@bandhan/shared";
import { invoiceController } from "@/controllers/invoiceController";
import { requireAuth, requirePasswordChanged } from "@/middleware/authenticate";
import { requirePermission } from "@/middleware/authorize";
import { requireCsrf } from "@/middleware/csrf";
import { writeLimiter } from "@/middleware/rateLimit";
import { validate } from "@/middleware/validate";
import { asyncHandler } from "@/utils/http";

/**
 * Invoices.
 *
 * Payments are *not* created here — recording money stays in the finance
 * module so there is exactly one place a payment can enter the system. This
 * router reads those payments back to compute what is still owed.
 */
export const invoiceRoutes = Router();

invoiceRoutes.use(requireAuth, requirePasswordChanged);

// ── Read ─────────────────────────────────────────────────────────────────────

invoiceRoutes.get(
  "/",
  requirePermission("invoices:read"),
  validate(invoiceListQuerySchema, "query"),
  asyncHandler(invoiceController.list)
);

invoiceRoutes.get("/summary", requirePermission("invoices:read"), asyncHandler(invoiceController.summary));

invoiceRoutes.get("/:id", requirePermission("invoices:read"), asyncHandler(invoiceController.get));

invoiceRoutes.get(
  "/:id/payments",
  requirePermission("invoices:read"),
  asyncHandler(invoiceController.payments)
);

invoiceRoutes.get(
  "/:id/documents",
  requirePermission("invoices:read"),
  asyncHandler(invoiceController.documents)
);

// ── Write ────────────────────────────────────────────────────────────────────

invoiceRoutes.post(
  "/",
  writeLimiter,
  requirePermission("invoices:write"),
  requireCsrf,
  validate(createInvoiceSchema),
  asyncHandler(invoiceController.create)
);

/** Raising an invoice straight from an accepted quotation. */
invoiceRoutes.post(
  "/from-quotation",
  writeLimiter,
  requirePermission("invoices:write"),
  requireCsrf,
  asyncHandler(invoiceController.fromQuotation)
);

invoiceRoutes.patch(
  "/:id",
  writeLimiter,
  requirePermission("invoices:write"),
  requireCsrf,
  validate(updateInvoiceSchema),
  asyncHandler(invoiceController.update)
);

// ── Lifecycle ────────────────────────────────────────────────────────────────

invoiceRoutes.post(
  "/:id/issue",
  writeLimiter,
  requirePermission("invoices:write"),
  requireCsrf,
  asyncHandler(invoiceController.issue)
);

invoiceRoutes.post(
  "/:id/void",
  writeLimiter,
  requirePermission("invoices:write"),
  requireCsrf,
  validate(voidInvoiceSchema),
  asyncHandler(invoiceController.void)
);

invoiceRoutes.post(
  "/:id/pdf",
  writeLimiter,
  requirePermission("invoices:read"),
  requireCsrf,
  asyncHandler(invoiceController.generatePdf)
);

invoiceRoutes.post(
  "/:id/receipts",
  writeLimiter,
  requirePermission("payments:read"),
  requireCsrf,
  asyncHandler(invoiceController.generateReceipt)
);
