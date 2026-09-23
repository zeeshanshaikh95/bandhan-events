import type { Request, Response } from "express";
import { financeService } from "@/services/financeService";
import { paymentRepository } from "@/repositories/paymentRepository";
import { expenseRepository } from "@/repositories/expenseRepository";
import { investmentRepository } from "@/repositories/investmentRepository";
import { syncService } from "@/services/syncService";
import { AUDIT_ACTIONS, auditService } from "@/services/auditService";
import { validatedQuery } from "@/middleware/validate";
import { pathParam, sendSuccess } from "@/utils/http";
import { ApiError } from "@/utils/ApiError";
import type { AuthContext } from "@/types/auth";
import {
  createPaymentSchema,
  updatePaymentSchema,
  createExpenseSchema,
  updateExpenseSchema,
  createInvestmentSchema,
  updateInvestmentSchema,
  type FinanceQuery,
} from "@bandhan/shared";

function requireAuthContext(req: Request): AuthContext {
  if (!req.auth) throw ApiError.unauthorized("Please sign in to continue.", "SESSION_REQUIRED");
  return req.auth;
}

function context(req: Request) {
  return { ip: req.ip || "unknown", requestId: (req as any).requestId || "unknown" };
}

export const financeController = {
  // ── Dashboard Summary ────────────────────────────────────────────────────

  async summary(_req: Request, res: Response): Promise<void> {
    const summary = await financeService.getSummary();
    sendSuccess(res, summary);
  },

  // ── Payments ─────────────────────────────────────────────────────────────

  async listPayments(req: Request, res: Response): Promise<void> {
    const query = validatedQuery<FinanceQuery>(req);
    const result = await financeService.listPayments(query);
    sendSuccess(res, result);
  },

  async getPayment(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, "id");
    const payment = await paymentRepository.findByIdLean(id);
    if (!payment) throw ApiError.notFound("Payment not found.");
    sendSuccess(res, payment);
  },

  async createPayment(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const input = createPaymentSchema.parse(req.body);

    // A receipt against an invoice may not push the invoice into credit. The
    // check runs only when an invoice is named, so unrelated payments keep
    // working exactly as before.
    if (input.invoice) {
      const { invoiceService } = await import("@/services/invoiceService");
      await invoiceService.assertPaymentWithinBalance(input.invoice, input.amount);
    }

    const payment = await paymentRepository.create({
      ...input,
      paymentDate: new Date(input.paymentDate),
      createdBy: auth.user.id,
    });

    await auditService.record({
      action: AUDIT_ACTIONS.leadCreated, // Reuse existing action
      entityType: "Payment",
      entityId: String(payment._id),
      actor: auth.user,
      ip: context(req).ip,
      requestId: context(req).requestId,
      metadata: { amount: input.amount, method: input.method, invoice: input.invoice ?? null },
    });

    // Non-blocking: the receipt changes the invoice's paid/outstanding figures.
    if (input.invoice) {
      import("@/services/invoiceService")
        .then(({ invoiceService }) => invoiceService.reconcile(input.invoice as string))
        .catch(() => {});
    }

    // Non-blocking Google Sheets sync
    syncService.syncPayment(payment).catch(() => {});

    sendSuccess(res, payment, 201);
  },

  async updatePayment(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const id = pathParam(req, "id");
    const input = updatePaymentSchema.parse(req.body);

    const update: Record<string, unknown> = { ...input };
    if (input.paymentDate) update.paymentDate = new Date(input.paymentDate);

    const payment = await paymentRepository.updateById(id, update);
    if (!payment) throw ApiError.notFound("Payment not found.");

    await auditService.record({
      action: AUDIT_ACTIONS.leadUpdated,
      entityType: "Payment",
      entityId: id,
      actor: auth.user,
      ip: context(req).ip,
      requestId: context(req).requestId,
      metadata: { fields: Object.keys(input) },
    });

    sendSuccess(res, payment);
  },

  async deletePayment(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const id = pathParam(req, "id");

    const payment = await paymentRepository.findById(id);
    if (!payment) throw ApiError.notFound("Payment not found.");

    // Soft-delete: set status to REFUNDED instead of deleting
    await paymentRepository.updateById(id, { status: "REFUNDED" });

    await auditService.record({
      action: AUDIT_ACTIONS.leadArchived,
      entityType: "Payment",
      entityId: id,
      actor: auth.user,
      ip: context(req).ip,
      requestId: context(req).requestId,
      metadata: { action: "voided" },
    });

    sendSuccess(res, { voided: true });
  },

  // ── Expenses ─────────────────────────────────────────────────────────────

  async listExpenses(req: Request, res: Response): Promise<void> {
    const query = validatedQuery<FinanceQuery>(req);
    const result = await financeService.listExpenses(query);
    sendSuccess(res, result);
  },

  async getExpense(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, "id");
    const expense = await expenseRepository.findByIdLean(id);
    if (!expense) throw ApiError.notFound("Expense not found.");
    sendSuccess(res, expense);
  },

  async createExpense(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const input = createExpenseSchema.parse(req.body);

    const expense = await expenseRepository.create({
      ...input,
      date: new Date(input.date),
      createdBy: auth.user.id,
    });

    await auditService.record({
      action: AUDIT_ACTIONS.leadCreated,
      entityType: "Expense",
      entityId: String(expense._id),
      actor: auth.user,
      ip: context(req).ip,
      requestId: context(req).requestId,
      metadata: { amount: input.amount, category: input.category },
    });

    // Non-blocking Google Sheets sync
    syncService.syncExpense(expense).catch(() => {});

    sendSuccess(res, expense, 201);
  },

  async updateExpense(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const id = pathParam(req, "id");
    const input = updateExpenseSchema.parse(req.body);

    const update: Record<string, unknown> = { ...input };
    if (input.date) update.date = new Date(input.date);

    const expense = await expenseRepository.updateById(id, update);
    if (!expense) throw ApiError.notFound("Expense not found.");

    await auditService.record({
      action: AUDIT_ACTIONS.leadUpdated,
      entityType: "Expense",
      entityId: id,
      actor: auth.user,
      ip: context(req).ip,
      requestId: context(req).requestId,
      metadata: { fields: Object.keys(input) },
    });

    sendSuccess(res, expense);
  },

  async archiveExpense(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const id = pathParam(req, "id");

    const expense = await expenseRepository.archiveById(id);
    if (!expense) throw ApiError.notFound("Expense not found.");

    await auditService.record({
      action: AUDIT_ACTIONS.leadArchived,
      entityType: "Expense",
      entityId: id,
      actor: auth.user,
      ip: context(req).ip,
      requestId: context(req).requestId,
    });

    sendSuccess(res, { archived: true });
  },

  // ── Investments ──────────────────────────────────────────────────────────

  async listInvestments(req: Request, res: Response): Promise<void> {
    const query = validatedQuery<FinanceQuery>(req);
    const result = await financeService.listInvestments(query);
    sendSuccess(res, result);
  },

  async getInvestment(req: Request, res: Response): Promise<void> {
    const id = pathParam(req, "id");
    const investment = await investmentRepository.findByIdLean(id);
    if (!investment) throw ApiError.notFound("Investment not found.");
    sendSuccess(res, investment);
  },

  async createInvestment(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const input = createInvestmentSchema.parse(req.body);

    const investment = await investmentRepository.create({
      ...input,
      date: new Date(input.date),
      createdBy: auth.user.id,
    });

    await auditService.record({
      action: AUDIT_ACTIONS.leadCreated,
      entityType: "Investment",
      entityId: String(investment._id),
      actor: auth.user,
      ip: context(req).ip,
      requestId: context(req).requestId,
      metadata: { amount: input.amount, partner: input.partner },
    });

    // Non-blocking Google Sheets sync
    syncService.syncInvestment(investment).catch(() => {});

    sendSuccess(res, investment, 201);
  },

  async updateInvestment(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const id = pathParam(req, "id");
    const input = updateInvestmentSchema.parse(req.body);

    const update: Record<string, unknown> = { ...input };
    if (input.date) update.date = new Date(input.date);

    const investment = await investmentRepository.updateById(id, update);
    if (!investment) throw ApiError.notFound("Investment not found.");

    await auditService.record({
      action: AUDIT_ACTIONS.leadUpdated,
      entityType: "Investment",
      entityId: id,
      actor: auth.user,
      ip: context(req).ip,
      requestId: context(req).requestId,
      metadata: { fields: Object.keys(input) },
    });

    sendSuccess(res, investment);
  },

  async deleteInvestment(req: Request, res: Response): Promise<void> {
    const auth = requireAuthContext(req);
    const id = pathParam(req, "id");

    const investment = await investmentRepository.findById(id);
    if (!investment) throw ApiError.notFound("Investment not found.");

    // Hard delete for investments (audit logged)
    await investmentRepository.updateById(id, { notes: `[DELETED] ${investment.notes || ""}` });

    await auditService.record({
      action: AUDIT_ACTIONS.leadArchived,
      entityType: "Investment",
      entityId: id,
      actor: auth.user,
      ip: context(req).ip,
      requestId: context(req).requestId,
      metadata: { action: "deleted" },
    });

    sendSuccess(res, { deleted: true });
  },

  // ── Reports ──────────────────────────────────────────────────────────────

  async monthlyReport(req: Request, res: Response): Promise<void> {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const report = await financeService.getMonthlyReport(year);
    sendSuccess(res, report);
  },

  async expenseBreakdown(req: Request, res: Response): Promise<void> {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const breakdown = await financeService.getExpenseBreakdown(startDate, endDate);
    sendSuccess(res, breakdown);
  },

  async cashFlow(_req: Request, res: Response): Promise<void> {
    const cashFlow = await financeService.getCashFlow();
    sendSuccess(res, cashFlow);
  },

  async eventProfitability(_req: Request, res: Response): Promise<void> {
    const profitability = await financeService.getEventProfitability();
    sendSuccess(res, profitability);
  },
};
