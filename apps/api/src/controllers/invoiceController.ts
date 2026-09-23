import type { Request, Response } from "express";
import type { CreateInvoiceInput, InvoiceListQuery, UpdateInvoiceInput } from "@bandhan/shared";
import { Types } from "mongoose";
import { invoiceService } from "@/services/invoiceService";
import { documentService } from "@/services/documentService";
import { renderInvoicePdf, renderReceiptPdf } from "@/services/pdfService";
import { AUDIT_ACTIONS, auditService } from "@/services/auditService";
import { validatedQuery } from "@/middleware/validate";
import type { AuthContext } from "@/types/auth";
import { ApiError } from "@/utils/ApiError";
import { clientIp, pathParam, requestId, sendSuccess } from "@/utils/http";
import { toPaise } from "@/utils/money";
import { allocateDocumentNumber } from "@/utils/numberSequence";

function requireAuthContext(req: Request): AuthContext {
  if (!req.auth) throw ApiError.unauthorized("Please sign in to continue.", "SESSION_REQUIRED");
  return req.auth;
}

function context(req: Request) {
  return { ip: clientIp(req), requestId: requestId(req) };
}

export const invoiceController = {
  /** GET /invoices */
  async list(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await invoiceService.list(validatedQuery<InvoiceListQuery>(req)));
  },

  /** GET /invoices/summary */
  async summary(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, await invoiceService.summary());
  },

  /** GET /invoices/:id */
  async get(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await invoiceService.getById(pathParam(req, "id")));
  },

  /** POST /invoices */
  async create(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    sendSuccess(res, await invoiceService.create(req.body as CreateInvoiceInput, auth, context(req)), 201);
  },

  /** POST /invoices/from-quotation */
  async fromQuotation(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const { quotationId, dueDate, notes } = req.body as {
      quotationId: string;
      dueDate?: string;
      notes?: string;
    };
    if (!quotationId) throw ApiError.badRequest("A quotation must be chosen.");

    sendSuccess(
      res,
      await invoiceService.createFromQuotation(quotationId, { dueDate, notes }, auth, context(req)),
      201
    );
  },

  /** PATCH /invoices/:id */
  async update(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    sendSuccess(
      res,
      await invoiceService.update(pathParam(req, "id"), req.body as UpdateInvoiceInput, auth, context(req))
    );
  },

  /** POST /invoices/:id/issue */
  async issue(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    sendSuccess(res, await invoiceService.issue(pathParam(req, "id"), auth, context(req)));
  },

  /** POST /invoices/:id/void */
  async void(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const { reason } = req.body as { reason: string };
    sendSuccess(res, await invoiceService.void(pathParam(req, "id"), reason, auth, context(req)));
  },

  /** GET /invoices/:id/payments */
  async payments(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await invoiceService.payments(pathParam(req, "id")));
  },

  /** POST /invoices/:id/pdf */
  async generatePdf(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const id = pathParam(req, "id");

    const invoice = await invoiceService.getById(id);
    if (!invoice.customer) {
      throw ApiError.conflict("This invoice has no customer to address.", "CUSTOMER_MISSING");
    }

    const buffer = await renderInvoicePdf({
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      issueDate: new Date(invoice.issueDate),
      dueDate: invoice.dueDate ? new Date(invoice.dueDate) : null,
      customer: {
        name: invoice.customer.name,
        phone: invoice.customer.phone,
        email: invoice.customer.email ?? null,
        address: invoice.customer.address ?? null,
      },
      eventName: invoice.event?.eventName ?? "",
      eventDate: invoice.event?.eventDate ? new Date(invoice.event.eventDate) : null,
      quotationNumber: invoice.quotation?.quotationNumber,
      lineItems: invoice.lineItems.map((item) => ({
        description: item.description,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        unitPricePaise: toPaise(item.unitPrice),
        discountAmountPaise: toPaise(item.discountAmount),
        taxAmountPaise: toPaise(item.taxAmount),
        lineTotalPaise: toPaise(item.lineTotal),
      })),
      totals: {
        subtotalPaise: toPaise(invoice.totals.subtotal),
        discountAmountPaise: toPaise(invoice.totals.discountAmount),
        taxAmountPaise: toPaise(invoice.totals.taxAmount),
        grandTotalPaise: toPaise(invoice.totals.grandTotal),
      },
      amountPaidPaise: toPaise(invoice.amountPaid),
      outstandingPaise: toPaise(invoice.outstanding),
      notes: invoice.notes,
      termsAndConditions: invoice.termsAndConditions,
    });

    const document = await documentService.store({
      kind: "invoice",
      fileName: `${invoice.invoiceNumber}.pdf`,
      data: buffer,
      entityType: "Invoice",
      entityId: id,
      actor: auth,
    });

    const { Invoice } = await import("@/models/Invoice");
    await Invoice.findByIdAndUpdate(id, { pdfDocumentId: new Types.ObjectId(document.id) });

    await auditService.record({
      action: AUDIT_ACTIONS.invoicePdfGenerated,
      entityType: "Invoice",
      entityId: id,
      actor: auth.user,
      ip: context(req).ip,
      requestId: context(req).requestId,
      metadata: { invoiceNumber: invoice.invoiceNumber },
    });

    sendSuccess(res, document, 201);
  },

  /**
   * POST /invoices/:id/receipts
   * Renders a receipt for an existing payment. No payment record is created or
   * duplicated here — the receipt is a rendering of a receipt that already
   * exists in the finance module.
   */
  async generateReceipt(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const id = pathParam(req, "id");
    const { paymentId } = req.body as { paymentId: string };
    if (!paymentId) throw ApiError.badRequest("A payment must be chosen.");

    const invoice = await invoiceService.getById(id);
    if (!invoice.customer) {
      throw ApiError.conflict("This invoice has no customer to address.", "CUSTOMER_MISSING");
    }

    const { paymentRepository } = await import("@/repositories/paymentRepository");
    const payment: any = await paymentRepository.findById(paymentId);
    if (!payment) throw ApiError.notFound("That payment could not be found.");

    if (String(payment.invoice ?? "") !== id) {
      throw ApiError.badRequest("That payment was not recorded against this invoice.");
    }
    if (payment.status !== "RECEIVED") {
      throw ApiError.conflict(
        "Only received payments get a receipt — this payment is not marked as received.",
        "PAYMENT_NOT_RECEIVED"
      );
    }

    const receiptNumber = await allocateDocumentNumber("receipt", new Date(payment.paymentDate));

    const buffer = await renderReceiptPdf({
      receiptNumber,
      paymentDate: new Date(payment.paymentDate),
      customer: {
        name: invoice.customer.name,
        phone: invoice.customer.phone,
        email: invoice.customer.email ?? null,
      },
      eventName: invoice.event?.eventName ?? "",
      invoiceNumber: invoice.invoiceNumber,
      method: payment.method,
      reference: payment.reference || "",
      amountPaise: toPaise(payment.amount),
      invoiceTotalPaise: toPaise(invoice.totals.grandTotal),
      outstandingPaise: toPaise(invoice.outstanding),
      notes: payment.notes || "",
      recordedByName: payment.createdBy?.name ?? auth.user.name,
    });

    const document = await documentService.store({
      kind: "receipt",
      fileName: `${receiptNumber}.pdf`,
      data: buffer,
      entityType: "Payment",
      entityId: paymentId,
      actor: auth,
    });

    await auditService.record({
      action: AUDIT_ACTIONS.receiptGenerated,
      entityType: "Payment",
      entityId: paymentId,
      actor: auth.user,
      ip: context(req).ip,
      requestId: context(req).requestId,
      metadata: { receiptNumber, invoiceNumber: invoice.invoiceNumber },
    });

    sendSuccess(res, { ...document, receiptNumber }, 201);
  },

  /** GET /invoices/:id/documents */
  async documents(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await documentService.listForEntity("Invoice", pathParam(req, "id")));
  },
};
