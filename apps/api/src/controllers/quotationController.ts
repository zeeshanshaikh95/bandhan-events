import type { Request, Response } from "express";
import type {
  AcceptQuotationInput,
  CreateQuotationInput,
  QuotationListQuery,
  UpdateQuotationInput,
} from "@bandhan/shared";
import { quotationService } from "@/services/quotationService";
import { documentService } from "@/services/documentService";
import { renderQuotationPdf } from "@/services/pdfService";
import { AUDIT_ACTIONS, auditService } from "@/services/auditService";
import { validatedQuery } from "@/middleware/validate";
import type { AuthContext } from "@/types/auth";
import { ApiError } from "@/utils/ApiError";
import { clientIp, pathParam, requestId, sendSuccess } from "@/utils/http";

function requireAuthContext(req: Request): AuthContext {
  if (!req.auth) throw ApiError.unauthorized("Please sign in to continue.", "SESSION_REQUIRED");
  return req.auth;
}

function context(req: Request) {
  return { ip: clientIp(req), requestId: requestId(req) };
}

export const quotationController = {
  /** GET /quotations */
  async list(req: Request, res: Response): Promise<void> {
    await quotationService.markLapsedAsExpired();
    sendSuccess(res, await quotationService.list(validatedQuery<QuotationListQuery>(req)));
  },

  /** GET /quotations/summary */
  async summary(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, await quotationService.summary());
  },

  /** GET /quotations/:id */
  async get(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, "id");
    await quotationService.markLapsedAsExpired();
    sendSuccess(res, await quotationService.getById(id));
  },

  /** POST /quotations */
  async create(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const quotation = await quotationService.create(
      req.body as CreateQuotationInput,
      auth,
      context(req)
    );
    sendSuccess(res, quotation, 201);
  },

  /** PATCH /quotations/:id */
  async update(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const quotation = await quotationService.update(
      pathParam(req, "id"),
      req.body as UpdateQuotationInput,
      auth,
      context(req)
    );
    sendSuccess(res, quotation);
  },

  /** POST /quotations/:id/send */
  async send(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    sendSuccess(res, await quotationService.send(pathParam(req, "id"), auth, context(req)));
  },

  /**
   * POST /quotations/:id/accept
   *
   * Returns the quotation together with the booking it is now tied to (or
   * `null` when acceptance was recorded without creating one), so the
   * dashboard can say truthfully whether an event was created.
   */
  async accept(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const result = await quotationService.accept(
      pathParam(req, "id"),
      req.body as AcceptQuotationInput,
      auth,
      context(req)
    );
    sendSuccess(res, result);
  },

  /** POST /quotations/:id/reject */
  async reject(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const { reason } = req.body as { reason: string };
    sendSuccess(res, await quotationService.reject(pathParam(req, "id"), { reason }, auth, context(req)));
  },

  /** POST /quotations/:id/cancel */
  async cancel(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const { reason } = (req.body ?? {}) as { reason?: string };
    sendSuccess(res, await quotationService.cancel(pathParam(req, "id"), reason, auth, context(req)));
  },

  /** POST /quotations/:id/convert-to-event */
  async convertToEvent(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const override = (req.body ?? {}) as { eventName?: string; eventDate?: string };
    sendSuccess(res, await quotationService.convertToEvent(pathParam(req, "id"), override, auth, context(req)));
  },

  /**
   * POST /quotations/:id/pdf
   * Renders the current version, stores it, and points the quotation at it.
   * Regenerating replaces the reference rather than the number, so the PDF a
   * customer already holds stays identifiable by quotation number + version.
   */
  async generatePdf(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const id = pathParam(req, "id");

    const quotation: any = await quotationService.getById(id);
    if (!quotation.customer) {
      throw ApiError.conflict("This quotation has no customer to address.", "CUSTOMER_MISSING");
    }

    const buffer = await renderQuotationPdf({
      quotationNumber: quotation.quotationNumber,
      version: quotation.version,
      status: quotation.status,
      issueDate: new Date(quotation.issueDate),
      validUntil: quotation.validUntil ? new Date(quotation.validUntil) : null,
      customer: {
        name: quotation.customer.name,
        phone: quotation.customer.phone,
        email: (quotation.customer as any).email ?? null,
        address: (quotation.customer as any).address ?? null,
      },
      eventType: quotation.eventType,
      eventDate: quotation.eventDate ? new Date(quotation.eventDate) : null,
      venue: quotation.venue,
      guestCount: quotation.guestCount,
      packageName: quotation.packageName,
      lineItems: quotation.lineItems.map((item: any) => ({
        description: item.description,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        unitPricePaise: Math.round(item.unitPrice * 100),
        discountAmountPaise: Math.round(item.discountAmount * 100),
        taxAmountPaise: Math.round(item.taxAmount * 100),
        lineTotalPaise: Math.round(item.lineTotal * 100),
      })),
      totals: {
        subtotalPaise: Math.round(quotation.totals.subtotal * 100),
        discountAmountPaise: Math.round(quotation.totals.discountAmount * 100),
        taxAmountPaise: Math.round(quotation.totals.taxAmount * 100),
        grandTotalPaise: Math.round(quotation.totals.grandTotal * 100),
        advanceRequiredPaise: Math.round(quotation.totals.advanceRequired * 100),
        balancePaise: Math.round(quotation.totals.balance * 100),
      },
      paymentTerms: quotation.paymentTerms,
      notes: quotation.notes,
      termsAndConditions: quotation.termsAndConditions,
    });

    const document = await documentService.store({
      kind: "quotation",
      fileName: `${quotation.quotationNumber}-v${quotation.version}.pdf`,
      data: buffer,
      entityType: "Quotation",
      entityId: id,
      actor: auth,
    });

    const { Quotation } = await import("@/models/Quotation");
    await Quotation.findByIdAndUpdate(id, { pdfDocumentId: document.id });

    await auditService.record({
      action: AUDIT_ACTIONS.quotationPdfGenerated,
      entityType: "Quotation",
      entityId: id,
      actor: auth.user,
      ip: context(req).ip,
      requestId: context(req).requestId,
      metadata: { quotationNumber: quotation.quotationNumber, version: quotation.version },
    });

    sendSuccess(res, document, 201);
  },

  /** GET /quotations/:id/documents */
  async documents(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await documentService.listForEntity("Quotation", pathParam(req, "id")));
  },
};
