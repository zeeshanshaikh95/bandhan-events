import { syncLogRepository, type SyncLogListQuery } from "@/repositories/syncLogRepository";
import { googleSheetsService } from "@/integrations/googleSheets";
import { Paginated } from "@bandhan/shared";
import { buildPaginated } from "@/utils/http";

/**
 * ---------------------------------------------------------------------------
 * SYNC SERVICE
 * ---------------------------------------------------------------------------
 * Central service for all Google Sheets synchronization operations.
 * Handles sync logging, retries, and status reporting.
 */

export interface SyncResult {
  success: boolean;
  action: "created" | "updated" | "skipped" | "failed";
  error?: string;
}

export const syncService = {
  /**
   * Sync a lead to Google Sheets with proper logging.
   */
  async syncLead(lead: {
    _id: { toString(): string };
    name: string;
    phone: string;
    email?: string | null;
    eventType: string;
    eventDate?: Date | null;
    guestCount?: number | null;
    serviceRequired: string;
    budget?: string | null;
    source: string;
    status: string;
    createdAt: Date;
  }): Promise<SyncResult> {
    const leadId = lead._id.toString();

    // Check if Google Sheets is configured
    if (!googleSheetsService.isConfigured()) {
      return { success: true, action: "skipped" };
    }

    try {
      const result = await googleSheetsService.syncLead(lead);

      // Log the sync operation
      await syncLogRepository.create({
        operation: result.action === "created" ? "create" : "update",
        module: "lead",
        recordId: leadId,
        sheetName: "Leads",
        status: result.synced ? "success" : "failed",
        errorMessage: result.error || null,
        metadata: {
          action: result.action,
          name: lead.name,
          phone: lead.phone,
        },
      });

      return {
        success: result.synced,
        action: result.action,
        error: result.error,
      };
    } catch (error: any) {
      const message = error?.message || "Unknown sync error";

      // Log the failure
      await syncLogRepository.create({
        operation: "create",
        module: "lead",
        recordId: leadId,
        sheetName: "Leads",
        status: "failed",
        errorMessage: message,
      });

      return { success: false, action: "failed", error: message };
    }
  },

  /**
   * Test the Google Sheets connection.
   */
  async testConnection() {
    return googleSheetsService.testConnection();
  },

  /**
   * Get sync status for the dashboard.
   */
  async getSyncStatus() {
    const lastSyncAt = await syncLogRepository.getLatestSyncTime();
    const lastSyncError = await syncLogRepository.getLatestError();

    return {
      ...googleSheetsService.getSyncStatus(),
      lastSyncAt: lastSyncAt?.toISOString() || null,
      lastSyncError,
    };
  },

  /**
   * Get sync logs with pagination and filters.
   */
  async getSyncLogs(query: SyncLogListQuery): Promise<Paginated<{
    id: string;
    operation: string;
    module: string;
    recordId: string;
    sheetName: string;
    sheetRowNumber: number | null;
    status: string;
    errorMessage: string | null;
    metadata: Record<string, unknown>;
    createdAt: string;
  }>> {
    const { items, total } = await syncLogRepository.list(query);
    return buildPaginated(
      items.map((log) => ({
        id: String(log._id),
        operation: log.operation,
        module: log.module,
        recordId: log.recordId,
        sheetName: log.sheetName,
        sheetRowNumber: log.sheetRowNumber ?? null,
        status: log.status,
        errorMessage: log.errorMessage ?? null,
        metadata: (log.metadata as Record<string, unknown>) || {},
        createdAt: (log.createdAt as Date).toISOString(),
      })),
      total,
      query.page || 1,
      query.limit || 20
    );
  },

  /**
   * Sync an event to Google Sheets with proper logging.
   */
  async syncEvent(event: {
    _id: { toString(): string };
    eventName: string;
    eventType: string;
    eventDate: Date;
    venue?: string;
    status: string;
    contractAmount: number;
    createdAt: Date;
  }): Promise<SyncResult> {
    const eventId = event._id.toString();

    if (!googleSheetsService.isConfigured()) {
      return { success: true, action: "skipped" };
    }

    try {
      const result = await googleSheetsService.syncEvent(event);

      await syncLogRepository.create({
        operation: result.action === "created" ? "create" : "update",
        module: "event",
        recordId: eventId,
        sheetName: "Events",
        status: result.synced ? "success" : "failed",
        errorMessage: result.error || null,
        metadata: { eventName: event.eventName, eventType: event.eventType },
      });

      return { success: result.synced, action: result.action, error: result.error };
    } catch (error: any) {
      const message = error?.message || "Unknown sync error";

      await syncLogRepository.create({
        operation: "create",
        module: "event",
        recordId: eventId,
        sheetName: "Events",
        status: "failed",
        errorMessage: message,
      });

      return { success: false, action: "failed", error: message };
    }
  },

  /**
   * Sync a quotation to Google Sheets.
   *
   * Names are resolved here rather than expected from the caller: sync runs
   * from several code paths, and a row with a raw ObjectId in the customer
   * column would be worse than useless to an accountant.
   */
  async syncQuotation(quotation: any): Promise<SyncResult> {
    const quotationId = String(quotation._id);

    if (!googleSheetsService.isConfigured()) {
      return { success: true, action: "skipped" };
    }

    try {
      const { Customer } = await import("@/models/Customer");
      const { Event } = await import("@/models/Event");

      const customerName =
        quotation.customer && typeof quotation.customer === "object" && quotation.customer.name
          ? quotation.customer.name
          : (
              await Customer.findById(quotation.customer).select("name").lean()
            )?.name || "";

      const eventName = quotation.event
        ? quotation.event && typeof quotation.event === "object" && quotation.event.eventName
          ? quotation.event.eventName
          : (await Event.findById(quotation.event).select("eventName").lean())?.eventName || ""
        : "";

      const result = await googleSheetsService.syncQuotation({
        _id: quotation._id,
        quotationNumber: quotation.quotationNumber,
        version: quotation.version,
        status: quotation.status,
        issueDate: quotation.issueDate,
        validUntil: quotation.validUntil,
        customerName,
        eventName,
        totals: quotation.totals,
        createdAt: quotation.createdAt,
      });

      await syncLogRepository.create({
        operation: result.action === "created" ? "create" : "update",
        module: "quotation",
        recordId: quotationId,
        sheetName: "Quotations",
        status: result.synced ? "success" : "failed",
        errorMessage: result.error || null,
        metadata: { quotationNumber: quotation.quotationNumber, version: quotation.version },
      });

      return { success: result.synced, action: result.action, error: result.error };
    } catch (error: any) {
      const message = error?.message || "Unknown sync error";

      await syncLogRepository.create({
        operation: "update",
        module: "quotation",
        recordId: quotationId,
        sheetName: "Quotations",
        status: "failed",
        errorMessage: message,
      });

      return { success: false, action: "failed", error: message };
    }
  },

  /**
   * Sync an invoice to Google Sheets, including the live paid/outstanding
   * figures derived from the Payment collection.
   */
  async syncInvoice(invoice: any, derived: { amountPaidPaise: number; outstandingPaise: number }): Promise<SyncResult> {
    const invoiceId = String(invoice._id);

    if (!googleSheetsService.isConfigured()) {
      return { success: true, action: "skipped" };
    }

    try {
      const { Customer } = await import("@/models/Customer");
      const { Event } = await import("@/models/Event");
      const { Quotation } = await import("@/models/Quotation");

      const customerName = invoice.customer
        ? (await Customer.findById(invoice.customer).select("name").lean())?.name || ""
        : "";
      const eventName = invoice.event
        ? (await Event.findById(invoice.event).select("eventName").lean())?.eventName || ""
        : "";
      const quotationNumber = invoice.quotation
        ? (await Quotation.findById(invoice.quotation).select("quotationNumber").lean())
            ?.quotationNumber || ""
        : "";

      const result = await googleSheetsService.syncInvoice({
        _id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        customerName,
        eventName,
        quotationNumber,
        totals: invoice.totals,
        amountPaidPaise: derived.amountPaidPaise,
        outstandingPaise: derived.outstandingPaise,
        createdAt: invoice.createdAt,
      });

      await syncLogRepository.create({
        operation: result.action === "created" ? "create" : "update",
        module: "invoice",
        recordId: invoiceId,
        sheetName: "Invoices",
        status: result.synced ? "success" : "failed",
        errorMessage: result.error || null,
        metadata: { invoiceNumber: invoice.invoiceNumber },
      });

      return { success: result.synced, action: result.action, error: result.error };
    } catch (error: any) {
      const message = error?.message || "Unknown sync error";

      await syncLogRepository.create({
        operation: "update",
        module: "invoice",
        recordId: invoiceId,
        sheetName: "Invoices",
        status: "failed",
        errorMessage: message,
      });

      return { success: false, action: "failed", error: message };
    }
  },

  /**
   * Sync a vendor to Google Sheets with proper logging.
   */
  async syncVendor(vendor: {
    _id: { toString(): string };
    name: string;
    type: string;
    status: string;
    createdAt: Date;
    updatedAt?: Date;
  }): Promise<SyncResult> {
    const vendorId = vendor._id.toString();

    if (!googleSheetsService.isConfigured()) {
      return { success: true, action: "skipped" };
    }

    try {
      const result = await googleSheetsService.syncVendor(vendor);

      await syncLogRepository.create({
        operation: result.action === "created" ? "create" : "update",
        module: "vendor",
        recordId: vendorId,
        sheetName: "Vendors",
        status: result.synced ? "success" : "failed",
        errorMessage: result.error || null,
        metadata: { action: result.action, name: vendor.name, type: vendor.type },
      });

      return {
        success: result.synced,
        action: result.action,
        error: result.error,
      };
    } catch (error: any) {
      const message = error?.message || "Unknown sync error";

      await syncLogRepository.create({
        operation: "update",
        module: "vendor",
        recordId: vendorId,
        sheetName: "Vendors",
        status: "failed",
        errorMessage: message,
      });

      return { success: false, action: "failed", error: message };
    }
  },

  /**
   * Sync one vendor-on-an-event assignment. Called whenever an assignment's
   * cost, status or payment position changes.
   */
  async syncVendorAssignment(assignment: {
    assignmentId: string;
    eventId: { toString(): string };
    vendorId: { toString(): string };
    vendorName: string;
    role?: string;
    service?: string;
    eventDate: Date;
    agreedCost: number;
    amountPaid: number;
    status: string;
  }): Promise<SyncResult> {
    if (!googleSheetsService.isConfigured()) {
      return { success: true, action: "skipped" };
    }

    try {
      const result = await googleSheetsService.syncVendorAssignment(assignment);

      await syncLogRepository.create({
        operation: result.action === "created" ? "create" : "update",
        module: "assignment",
        recordId: assignment.assignmentId,
        sheetName: "Vendor Assignments",
        status: result.synced ? "success" : "failed",
        errorMessage: result.error || null,
        metadata: {
          action: result.action,
          eventId: assignment.eventId.toString(),
          vendorId: assignment.vendorId.toString(),
        },
      });

      return { success: result.synced, action: result.action, error: result.error };
    } catch (error: any) {
      const message = error?.message || "Unknown sync error";

      await syncLogRepository.create({
        operation: "update",
        module: "assignment",
        recordId: assignment.assignmentId,
        sheetName: "Vendor Assignments",
        status: "failed",
        errorMessage: message,
      });

      return { success: false, action: "failed", error: message };
    }
  },

  /**
   * Ensure all required sheets exist.
   */
  async ensureSheets(): Promise<boolean> {
    if (!googleSheetsService.isConfigured()) {
      return false;
    }

    return googleSheetsService.ensureLeadsSheet();
  },

  /**
   * Manual sync: re-sync a specific record.
   */
  async reSyncRecord(
    module:
      | "lead"
      | "payment"
      | "expense"
      | "investment"
      | "event"
      | "quotation"
      | "invoice"
      | "vendor",
    recordId: string
  ): Promise<SyncResult> {
    if (!googleSheetsService.isConfigured()) {
      return { success: false, action: "failed", error: "Google Sheets not configured" };
    }

    if (module === "vendor") {
      const { Vendor } = await import("@/models/Vendor");
      const vendor = await Vendor.findById(recordId);
      if (!vendor) return { success: false, action: "failed", error: "Vendor not found" };
      return this.syncVendor(vendor);
    }

    if (module === "quotation") {
      const { Quotation } = await import("@/models/Quotation");
      const quotation = await Quotation.findById(recordId);
      if (!quotation) return { success: false, action: "failed", error: "Quotation not found" };
      return this.syncQuotation(quotation);
    }

    if (module === "invoice") {
      const { Invoice } = await import("@/models/Invoice");
      const { invoiceService } = await import("@/services/invoiceService");
      const invoice = await Invoice.findById(recordId).lean();
      if (!invoice) return { success: false, action: "failed", error: "Invoice not found" };
      const derived = await invoiceService.deriveBalances(String(invoice._id), invoice.totals?.grandTotalPaise ?? 0);
      return this.syncInvoice(invoice, derived);
    }

    if (module === "event") {
      const { Event } = await import("@/models/Event");
      const event = await Event.findById(recordId);
      if (!event) return { success: false, action: "failed", error: "Event not found" };
      return this.syncEvent(event);
    }

    if (module === "lead") {
      const { Lead } = await import("@/models/Lead");
      const lead = await Lead.findById(recordId);
      if (!lead) return { success: false, action: "failed", error: "Lead not found" };
      return this.syncLead(lead);
    }

    if (module === "payment") {
      const { Payment } = await import("@/models/Payment");
      const payment = await Payment.findById(recordId);
      if (!payment) return { success: false, action: "failed", error: "Payment not found" };
      return this.syncPayment(payment);
    }

    if (module === "expense") {
      const { Expense } = await import("@/models/Expense");
      const expense = await Expense.findById(recordId);
      if (!expense) return { success: false, action: "failed", error: "Expense not found" };
      return this.syncExpense(expense);
    }

    if (module === "investment") {
      const { Investment } = await import("@/models/Investment");
      const investment = await Investment.findById(recordId);
      if (!investment) return { success: false, action: "failed", error: "Investment not found" };
      return this.syncInvestment(investment);
    }

    return { success: false, action: "failed", error: `Module ${module} not implemented` };
  },

  /**
   * Sync a payment to Google Sheets with proper logging.
   */
  async syncPayment(payment: {
    _id: { toString(): string };
    amount: number;
    paymentDate: Date;
    method: string;
    status: string;
    reference?: string;
    createdAt: Date;
  }): Promise<SyncResult> {
    const paymentId = payment._id.toString();

    if (!googleSheetsService.isConfigured()) {
      return { success: true, action: "skipped" };
    }

    try {
      const result = await googleSheetsService.syncPayment(payment);

      await syncLogRepository.create({
        operation: result.action === "created" ? "create" : "update",
        module: "payment",
        recordId: paymentId,
        sheetName: "Payments",
        status: result.synced ? "success" : "failed",
        errorMessage: result.error || null,
        metadata: { amount: payment.amount, method: payment.method },
      });

      return { success: result.synced, action: result.action, error: result.error };
    } catch (error: any) {
      const message = error?.message || "Unknown sync error";

      await syncLogRepository.create({
        operation: "create",
        module: "payment",
        recordId: paymentId,
        sheetName: "Payments",
        status: "failed",
        errorMessage: message,
      });

      return { success: false, action: "failed", error: message };
    }
  },

  /**
   * Sync an expense to Google Sheets with proper logging.
   */
  async syncExpense(expense: {
    _id: { toString(): string };
    date: Date;
    category: string;
    amount: number;
    description?: string;
    createdAt: Date;
  }): Promise<SyncResult> {
    const expenseId = expense._id.toString();

    if (!googleSheetsService.isConfigured()) {
      return { success: true, action: "skipped" };
    }

    try {
      const result = await googleSheetsService.syncExpense(expense);

      await syncLogRepository.create({
        operation: result.action === "created" ? "create" : "update",
        module: "expense",
        recordId: expenseId,
        sheetName: "Expenses",
        status: result.synced ? "success" : "failed",
        errorMessage: result.error || null,
        metadata: { amount: expense.amount, category: expense.category },
      });

      return { success: result.synced, action: result.action, error: result.error };
    } catch (error: any) {
      const message = error?.message || "Unknown sync error";

      await syncLogRepository.create({
        operation: "create",
        module: "expense",
        recordId: expenseId,
        sheetName: "Expenses",
        status: "failed",
        errorMessage: message,
      });

      return { success: false, action: "failed", error: message };
    }
  },

  /**
   * Sync an investment to Google Sheets with proper logging.
   */
  async syncInvestment(investment: {
    _id: { toString(): string };
    date: Date;
    partner: string;
    amount: number;
    type: string;
    createdAt: Date;
  }): Promise<SyncResult> {
    const investmentId = investment._id.toString();

    if (!googleSheetsService.isConfigured()) {
      return { success: true, action: "skipped" };
    }

    try {
      const result = await googleSheetsService.syncInvestment(investment);

      await syncLogRepository.create({
        operation: result.action === "created" ? "create" : "update",
        module: "investment",
        recordId: investmentId,
        sheetName: "Investments",
        status: result.synced ? "success" : "failed",
        errorMessage: result.error || null,
        metadata: { amount: investment.amount, partner: investment.partner },
      });

      return { success: result.synced, action: result.action, error: result.error };
    } catch (error: any) {
      const message = error?.message || "Unknown sync error";

      await syncLogRepository.create({
        operation: "create",
        module: "investment",
        recordId: investmentId,
        sheetName: "Investments",
        status: "failed",
        errorMessage: message,
      });

      return { success: false, action: "failed", error: message };
    }
  },
};
