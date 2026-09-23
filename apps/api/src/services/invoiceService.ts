import { Types } from "mongoose";
import type {
  CreateInvoiceInput,
  InvoiceDto,
  InvoiceListQuery,
  InvoiceStatus,
  LineItemDto,
  Paginated,
  UpdateInvoiceInput,
} from "@bandhan/shared";
import { invoiceRepository } from "@/repositories/invoiceRepository";
import { paymentRepository } from "@/repositories/paymentRepository";
import { customerRepository } from "@/repositories/customerRepository";
import { AUDIT_ACTIONS, auditService } from "@/services/auditService";
import { calculateLineItems, calculateTotals, toLineItemDto, toPricingTotals } from "@/services/pricingService";
import { syncService } from "@/services/syncService";
import type { AuthContext } from "@/types/auth";
import { ApiError } from "@/utils/ApiError";
import { buildPaginated } from "@/utils/http";
import { toPaise, toRupees } from "@/utils/money";
import { allocateDocumentNumber } from "@/utils/numberSequence";

/**
 * ---------------------------------------------------------------------------
 * INVOICE SERVICE
 * ---------------------------------------------------------------------------
 * An invoice states what is owed. What has actually been received is *not*
 * stored here — it is summed from the Payment collection every time, because a
 * second copy of "amount paid" is how two screens end up disagreeing about a
 * customer's balance.
 *
 * `status` is the only stored field that depends on payments, and it is kept in
 * step by `reconcile()`, which the payment endpoints call after a receipt.
 */

/** Rupee amounts from the Payment collection → integer paise. */
function paymentsToPaise(payments: any[]): number {
  return payments.reduce((total: number, payment) => total + toPaise(payment.amount), 0);
}

function isOverdue(dueDate: Date | null | undefined, paidPaise: number, totalPaise: number, status: string) {
  if (!dueDate || status === "VOID" || status === "DRAFT") return false;
  if (paidPaise >= totalPaise && totalPaise > 0) return false;
  return dueDate.getTime() < Date.now();
}

/**
 * The status an invoice *should* have given what has been paid. Draft and void
 * are deliberate human states and are never overwritten by this calculation.
 */
function deriveStatus(
  current: InvoiceStatus,
  paidPaise: number,
  totalPaise: number,
  dueDate: Date | null | undefined
): InvoiceStatus {
  if (current === "VOID" || current === "DRAFT") return current;
  if (totalPaise > 0 && paidPaise >= totalPaise) return "PAID";
  if (paidPaise > 0) return "PARTIALLY_PAID";
  if (dueDate && dueDate.getTime() < Date.now()) return "OVERDUE";
  return "ISSUED";
}

export const invoiceService = {
  /** Paid + outstanding for one invoice, straight from the Payment collection. */
  async deriveBalances(
    invoiceId: string,
    grandTotalPaise: number
  ): Promise<{ amountPaidPaise: number; outstandingPaise: number }> {
    const payments = await paymentRepository.listByInvoice(invoiceId);
    const amountPaidPaise = paymentsToPaise(payments.filter((payment) => payment.status === "RECEIVED"));
    return {
      amountPaidPaise,
      outstandingPaise: Math.max(0, grandTotalPaise - amountPaidPaise),
    };
  },

  /** Batched variant for lists — one query for every invoice on the page. */
  async deriveBalancesForInvoices(
    invoices: { id: string; grandTotalPaise: number }[]
  ): Promise<Map<string, { amountPaidPaise: number; outstandingPaise: number }>> {
    const paidByInvoice = await paymentRepository.receivedTotalsByInvoice(
      invoices.map((invoice) => invoice.id)
    );

    const map = new Map<string, { amountPaidPaise: number; outstandingPaise: number }>();
    for (const invoice of invoices) {
      const amountPaidPaise = toPaise(paidByInvoice.get(invoice.id) ?? 0);
      map.set(invoice.id, {
        amountPaidPaise,
        outstandingPaise: Math.max(0, invoice.grandTotalPaise - amountPaidPaise),
      });
    }
    return map;
  },

  /** Rejects a receipt that would overpay the invoice. */
  async assertPaymentWithinBalance(invoiceId: string, amountRupees: number): Promise<void> {
    const invoice = await invoiceRepository.findByIdRaw(invoiceId);
    if (!invoice) throw ApiError.notFound("That invoice could not be found.");

    if (invoice.status === "VOID") {
      throw ApiError.conflict("This invoice is void and cannot receive payments.", "INVOICE_VOID");
    }

    const { outstandingPaise } = await this.deriveBalances(invoiceId, invoice.totals.grandTotalPaise);
    const requestedPaise = toPaise(amountRupees);

    if (requestedPaise > outstandingPaise) {
      throw ApiError.conflict(
        `This receipt is larger than the outstanding balance (₹${toRupees(outstandingPaise).toLocaleString("en-IN")}).`,
        "PAYMENT_EXCEEDS_OUTSTANDING"
      );
    }
  },

  /**
   * Recomputes and, when it has moved, persists the invoice status.
   * Best-effort by design: a failure here must never fail the payment that
   * triggered it — the balance is derived on every read anyway.
   */
  async reconcile(invoiceId: string): Promise<void> {
    try {
      const invoice = await invoiceRepository.findByIdRaw(invoiceId);
      if (!invoice) return;

      const { amountPaidPaise } = await this.deriveBalances(invoiceId, invoice.totals.grandTotalPaise);
      const next = deriveStatus(
        invoice.status as InvoiceStatus,
        amountPaidPaise,
        invoice.totals.grandTotalPaise,
        invoice.dueDate
      );

      if (next !== invoice.status) {
        await invoiceRepository.updateById(invoiceId, { status: next });
      }
    } catch {
      // Never propagate — the caller's write already succeeded.
    }
  },

  async create(
    input: CreateInvoiceInput,
    actor: AuthContext,
    context: { ip: string; requestId: string }
  ): Promise<InvoiceDto> {
    const customer = await customerRepository.findById(input.customer);
    if (!customer) throw ApiError.notFound("That customer could not be found.");

    const issueDate = input.issueDate ? new Date(`${input.issueDate}T00:00:00.000Z`) : new Date();
    if (input.dueDate && new Date(`${input.dueDate}T00:00:00.000Z`) < issueDate) {
      throw ApiError.validation({ dueDate: ["Due date must be on or after the issue date."] });
    }

    const lineItems = calculateLineItems(input.lineItems);
    const totals = calculateTotals(lineItems, 0);
    const invoiceNumber = await allocateDocumentNumber("invoice", issueDate);

    const invoice = await invoiceRepository.create({
      invoiceNumber,
      customer: new Types.ObjectId(input.customer),
      event: input.event ? new Types.ObjectId(input.event) : null,
      quotation: input.quotation ? new Types.ObjectId(input.quotation) : null,
      issueDate,
      dueDate: input.dueDate ? new Date(`${input.dueDate}T00:00:00.000Z`) : null,
      lineItems,
      totals,
      status: "DRAFT",
      notes: input.notes ?? "",
      termsAndConditions: input.termsAndConditions ?? "",
      createdBy: new Types.ObjectId(actor.user.id),
      updatedBy: new Types.ObjectId(actor.user.id),
    });

    await auditService.record({
      action: AUDIT_ACTIONS.invoiceCreated,
      entityType: "Invoice",
      entityId: String(invoice._id),
      actor: actor.user,
      ip: context.ip,
      requestId: context.requestId,
      metadata: { invoiceNumber, grandTotalPaise: totals.grandTotalPaise },
    });

    return this.getById(String(invoice._id));
  },

  async getById(id: string): Promise<InvoiceDto> {
    const invoice = await invoiceRepository.findByIdLean(id);
    if (!invoice) throw ApiError.notFound("That invoice could not be found.");

    const derived = await this.deriveBalances(id, invoice.totals?.grandTotalPaise ?? 0);
    return this.toDto(invoice, derived);
  },

  async list(query: InvoiceListQuery): Promise<Paginated<InvoiceDto>> {
    const { items, total } = await invoiceRepository.list(query);

    const balances = await this.deriveBalancesForInvoices(
      items.map((invoice: any) => ({
        id: String(invoice._id),
        grandTotalPaise: invoice.totals?.grandTotalPaise ?? 0,
      }))
    );

    const dtos = items
      .map((invoice: any) =>
        this.toDto(invoice, balances.get(String(invoice._id)) ?? { amountPaidPaise: 0, outstandingPaise: 0 })
      )
      .filter((invoice) => !query.overdue || invoice.isOverdue);

    return buildPaginated(dtos, total, query.page, query.limit);
  },

  toDto(invoice: any, derived: { amountPaidPaise: number; outstandingPaise: number }): InvoiceDto {
    const grandTotalPaise = invoice.totals?.grandTotalPaise ?? 0;
    const status = invoice.status as InvoiceStatus;

    return {
      id: String(invoice._id),
      invoiceNumber: invoice.invoiceNumber,

      customer: invoice.customer
        ? {
            id: String(invoice.customer._id ?? invoice.customer),
            name: invoice.customer.name ?? "",
            phone: invoice.customer.phone ?? "",
            email: invoice.customer.email ?? null,
            address: invoice.customer.address ?? null,
          }
        : null,
      event: invoice.event
        ? {
            id: String(invoice.event._id ?? invoice.event),
            eventName: invoice.event.eventName ?? "",
            eventDate: invoice.event.eventDate?.toISOString?.(),
          }
        : null,
      quotation: invoice.quotation
        ? {
            id: String(invoice.quotation._id ?? invoice.quotation),
            quotationNumber: invoice.quotation.quotationNumber ?? "",
          }
        : null,

      issueDate: (invoice.issueDate as Date)?.toISOString() || "",
      dueDate: invoice.dueDate ? (invoice.dueDate as Date).toISOString() : null,

      lineItems: (invoice.lineItems ?? []).map(toLineItemDto) as LineItemDto[],
      totals: toPricingTotals(invoice.totals),

      amountPaid: toRupees(derived.amountPaidPaise),
      outstanding: toRupees(derived.outstandingPaise),
      isOverdue: isOverdue(invoice.dueDate, derived.amountPaidPaise, grandTotalPaise, status),
      derivedStatus: deriveStatus(status, derived.amountPaidPaise, grandTotalPaise, invoice.dueDate),

      status,
      notes: invoice.notes || "",
      termsAndConditions: invoice.termsAndConditions || "",

      issuedAt: invoice.issuedAt ? (invoice.issuedAt as Date).toISOString() : null,
      voidedAt: invoice.voidedAt ? (invoice.voidedAt as Date).toISOString() : null,
      voidReason: invoice.voidReason ?? null,

      pdfDocumentId: invoice.pdfDocumentId ? String(invoice.pdfDocumentId) : null,

      createdBy: invoice.createdBy
        ? { id: String(invoice.createdBy._id ?? invoice.createdBy), name: invoice.createdBy.name ?? "" }
        : null,
      updatedBy: invoice.updatedBy
        ? { id: String(invoice.updatedBy._id ?? invoice.updatedBy), name: invoice.updatedBy.name ?? "" }
        : null,
      createdAt: (invoice.createdAt as Date)?.toISOString() || "",
      updatedAt: (invoice.updatedAt as Date)?.toISOString() || "",
    };
  },

  async update(
    id: string,
    patch: UpdateInvoiceInput,
    actor: AuthContext,
    context: { ip: string; requestId: string }
  ): Promise<InvoiceDto> {
    const current = await invoiceRepository.findByIdRaw(id);
    if (!current) throw ApiError.notFound("That invoice could not be found.");

    if (current.status === "VOID") {
      throw ApiError.conflict("A void invoice cannot be edited.", "INVOICE_VOID");
    }

    const paid = await this.deriveBalances(id, current.totals.grandTotalPaise);
    if (paid.amountPaidPaise > 0 && patch.lineItems) {
      throw ApiError.conflict(
        "This invoice has payments recorded against it, so its lines can no longer be rewritten. Void it and raise a corrected invoice instead.",
        "INVOICE_HAS_PAYMENTS"
      );
    }

    const update: Record<string, unknown> = { updatedBy: new Types.ObjectId(actor.user.id) };

    if (patch.customer) {
      const customer = await customerRepository.findById(patch.customer);
      if (!customer) throw ApiError.notFound("That customer could not be found.");
      update.customer = new Types.ObjectId(patch.customer);
    }
    if (patch.event !== undefined) update.event = patch.event ? new Types.ObjectId(patch.event) : null;
    if (patch.quotation !== undefined) {
      update.quotation = patch.quotation ? new Types.ObjectId(patch.quotation) : null;
    }
    if (patch.issueDate) update.issueDate = new Date(`${patch.issueDate}T00:00:00.000Z`);
    if (patch.dueDate !== undefined) {
      update.dueDate = patch.dueDate ? new Date(`${patch.dueDate}T00:00:00.000Z`) : null;
    }
    if (patch.notes !== undefined) update.notes = patch.notes ?? "";
    if (patch.termsAndConditions !== undefined) update.termsAndConditions = patch.termsAndConditions ?? "";

    if (patch.lineItems) {
      const lineItems = calculateLineItems(patch.lineItems);
      update.lineItems = lineItems;
      update.totals = calculateTotals(lineItems, 0);
    }

    const invoice = await invoiceRepository.updateById(id, update);
    if (!invoice) throw ApiError.notFound("That invoice could not be found.");

    await auditService.record({
      action: AUDIT_ACTIONS.invoiceUpdated,
      entityType: "Invoice",
      entityId: id,
      actor: actor.user,
      ip: context.ip,
      requestId: context.requestId,
      metadata: { invoiceNumber: invoice.invoiceNumber, fields: Object.keys(patch) },
    });

    return this.getById(id);
  },

  /** Moves a draft into circulation. Only issued invoices may take payments. */
  async issue(id: string, actor: AuthContext, context: { ip: string; requestId: string }): Promise<InvoiceDto> {
    const invoice = await invoiceRepository.findByIdRaw(id);
    if (!invoice) throw ApiError.notFound("That invoice could not be found.");

    if (invoice.status === "VOID") {
      throw ApiError.conflict("A void invoice cannot be issued.", "INVOICE_VOID");
    }
    if (invoice.status !== "DRAFT") {
      throw ApiError.conflict("This invoice has already been issued.", "INVOICE_ALREADY_ISSUED");
    }

    await invoiceRepository.updateById(id, {
      status: "ISSUED",
      issuedAt: new Date(),
      updatedBy: new Types.ObjectId(actor.user.id),
    });

    await auditService.record({
      action: AUDIT_ACTIONS.invoiceIssued,
      entityType: "Invoice",
      entityId: id,
      actor: actor.user,
      ip: context.ip,
      requestId: context.requestId,
      metadata: { invoiceNumber: invoice.invoiceNumber },
    });

    const dto = await this.getById(id);
    const raw = await invoiceRepository.findByIdRaw(id);
    if (raw) {
      syncService
        .syncInvoice(raw, {
          amountPaidPaise: toPaise(dto.amountPaid),
          outstandingPaise: toPaise(dto.outstanding),
        })
        .catch(() => {});
    }

    return dto;
  },

  /**
   * Voids an invoice. A void invoice keeps its number and its history; it is
   * never deleted, because the number has already been shown to a customer.
   */
  async void(
    id: string,
    reason: string,
    actor: AuthContext,
    context: { ip: string; requestId: string }
  ): Promise<InvoiceDto> {
    const invoice = await invoiceRepository.findByIdRaw(id);
    if (!invoice) throw ApiError.notFound("That invoice could not be found.");

    if (invoice.status === "VOID") {
      throw ApiError.conflict("This invoice is already void.", "INVOICE_VOID");
    }

    const { amountPaidPaise } = await this.deriveBalances(id, invoice.totals.grandTotalPaise);
    if (amountPaidPaise > 0) {
      throw ApiError.conflict(
        "This invoice has received payments. Reverse those receipts before voiding it.",
        "INVOICE_HAS_PAYMENTS"
      );
    }

    await invoiceRepository.updateById(id, {
      status: "VOID",
      voidedAt: new Date(),
      voidReason: reason,
      updatedBy: new Types.ObjectId(actor.user.id),
    });

    await auditService.record({
      action: AUDIT_ACTIONS.invoiceVoided,
      entityType: "Invoice",
      entityId: id,
      actor: actor.user,
      ip: context.ip,
      requestId: context.requestId,
      metadata: { invoiceNumber: invoice.invoiceNumber, reason },
    });

    return this.getById(id);
  },

  /** Every receipt recorded against an invoice, for the detail page. */
  async payments(id: string) {
    const invoice = await invoiceRepository.findByIdRaw(id);
    if (!invoice) throw ApiError.notFound("That invoice could not be found.");

    const payments = await paymentRepository.listByInvoice(id);
    return payments.map((payment: any) => ({
      id: String(payment._id),
      amount: payment.amount,
      paymentDate: (payment.paymentDate as Date).toISOString(),
      method: payment.method,
      reference: payment.reference || "",
      notes: payment.notes || "",
      status: payment.status,
      recordedBy: payment.createdBy?.name ?? null,
    }));
  },

  /** Raised from an accepted quotation, carrying its lines across unchanged. */
  async createFromQuotation(
    quotationId: string,
    overrides: { dueDate?: string; notes?: string },
    actor: AuthContext,
    context: { ip: string; requestId: string }
  ): Promise<InvoiceDto> {
    const { Quotation } = await import("@/models/Quotation");
    const quotation = await Quotation.findById(quotationId);
    if (!quotation) throw ApiError.notFound("That quotation could not be found.");

    if (quotation.lineItems.length === 0) {
      throw ApiError.conflict("This quotation has no line items to invoice.", "QUOTATION_EMPTY");
    }

    const issueDate = new Date();
    const totals = calculateTotals(
      quotation.lineItems.map((item) => ({
        category: item.category,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit || "lump-sum",
        unitPricePaise: item.unitPricePaise,
        discountPercent: item.discountPercent ?? 0,
        taxPercent: item.taxPercent ?? 0,
        discountAmountPaise: item.discountAmountPaise ?? 0,
        taxAmountPaise: item.taxAmountPaise ?? 0,
        lineTotalPaise: item.lineTotalPaise ?? 0,
      })),
      0
    );

    const invoiceNumber = await allocateDocumentNumber("invoice", issueDate);

    const invoice = await invoiceRepository.create({
      invoiceNumber,
      customer: quotation.customer,
      event: quotation.event ?? null,
      quotation: quotation._id,
      issueDate,
      dueDate: overrides.dueDate ? new Date(`${overrides.dueDate}T00:00:00.000Z`) : null,
      lineItems: quotation.lineItems.map((item) => item.toObject()),
      totals,
      status: "DRAFT",
      notes: overrides.notes ?? quotation.notes ?? "",
      termsAndConditions: quotation.termsAndConditions ?? "",
      createdBy: new Types.ObjectId(actor.user.id),
      updatedBy: new Types.ObjectId(actor.user.id),
    });

    await auditService.record({
      action: AUDIT_ACTIONS.invoiceCreated,
      entityType: "Invoice",
      entityId: String(invoice._id),
      actor: actor.user,
      ip: context.ip,
      requestId: context.requestId,
      metadata: {
        invoiceNumber,
        fromQuotation: quotation.quotationNumber,
        grandTotalPaise: totals.grandTotalPaise,
      },
    });

    return this.getById(String(invoice._id));
  },

  /** Pipeline counters for the commercial dashboard cards. */
  async summary() {
    const [counts, open] = await Promise.all([
      invoiceRepository.countByStatus(),
      invoiceRepository.openTotals(),
    ]);

    const paidByInvoice = await paymentRepository.receivedTotalsByInvoice(open.ids);
    const paidPaise = open.ids.reduce((total, id) => total + toPaise(paidByInvoice.get(id) ?? 0), 0);

    return {
      counts,
      issuedValue: toRupees(open.totalPaise),
      collectedValue: toRupees(paidPaise),
      outstandingValue: toRupees(Math.max(0, open.totalPaise - paidPaise)),
    };
  },
};
