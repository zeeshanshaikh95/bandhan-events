import { Router } from "express";
import { financeQuerySchema } from "@bandhan/shared";
import { financeController } from "@/controllers/financeController";
import { requireAuth } from "@/middleware/authenticate";
import { requirePermission } from "@/middleware/authorize";
import { requireCsrf } from "@/middleware/csrf";
import { writeLimiter } from "@/middleware/rateLimit";
import { validate } from "@/middleware/validate";

/**
 * Finance routes — all protected behind authentication + permission checks.
 * 
 * Routes:
 *   GET    /api/v1/finance/summary          — dashboard summary
 *   GET    /api/v1/finance/payments          — list payments
 *   GET    /api/v1/finance/payments/:id      — get payment
 *   POST   /api/v1/finance/payments          — create payment
 *   PATCH  /api/v1/finance/payments/:id      — update payment
 *   DELETE /api/v1/finance/payments/:id      — void payment
 *   GET    /api/v1/finance/expenses          — list expenses
 *   GET    /api/v1/finance/expenses/:id      — get expense
 *   POST   /api/v1/finance/expenses          — create expense
 *   PATCH  /api/v1/finance/expenses/:id      — update expense
 *   DELETE /api/v1/finance/expenses/:id      — archive expense
 *   GET    /api/v1/finance/investments       — list investments
 *   GET    /api/v1/finance/investments/:id   — get investment
 *   POST   /api/v1/finance/investments       — create investment
 *   PATCH  /api/v1/finance/investments/:id   — update investment
 *   DELETE /api/v1/finance/investments/:id   — delete investment
 *   GET    /api/v1/finance/monthly-report    — monthly report
 *   GET    /api/v1/finance/expense-breakdown — expense breakdown
 *   GET    /api/v1/finance/cashflow          — cash flow
 *   GET    /api/v1/finance/event-profitability — event profitability
 */

export const financeRoutes = Router();

// All routes require authentication
financeRoutes.use(requireAuth);

// ── Summary ──────────────────────────────────────────────────────────────────

financeRoutes.get(
  "/summary",
  requirePermission("finance:read"),
  financeController.summary
);

// ── Payments ─────────────────────────────────────────────────────────────────

financeRoutes.get(
  "/payments",
  requirePermission("payments:read"),
  validate(financeQuerySchema, "query"),
  financeController.listPayments
);

financeRoutes.get(
  "/payments/:id",
  requirePermission("payments:read"),
  financeController.getPayment
);

financeRoutes.post(
  "/payments",
  requirePermission("payments:write"),
  writeLimiter,
  requireCsrf,
  financeController.createPayment
);

financeRoutes.patch(
  "/payments/:id",
  requirePermission("payments:write"),
  writeLimiter,
  requireCsrf,
  financeController.updatePayment
);

financeRoutes.delete(
  "/payments/:id",
  requirePermission("payments:write"),
  writeLimiter,
  requireCsrf,
  financeController.deletePayment
);

// ── Expenses ─────────────────────────────────────────────────────────────────

financeRoutes.get(
  "/expenses",
  requirePermission("expenses:read"),
  validate(financeQuerySchema, "query"),
  financeController.listExpenses
);

financeRoutes.get(
  "/expenses/:id",
  requirePermission("expenses:read"),
  financeController.getExpense
);

financeRoutes.post(
  "/expenses",
  requirePermission("expenses:write"),
  writeLimiter,
  requireCsrf,
  financeController.createExpense
);

financeRoutes.patch(
  "/expenses/:id",
  requirePermission("expenses:write"),
  writeLimiter,
  requireCsrf,
  financeController.updateExpense
);

financeRoutes.delete(
  "/expenses/:id",
  requirePermission("expenses:write"),
  writeLimiter,
  requireCsrf,
  financeController.archiveExpense
);

// ── Investments ──────────────────────────────────────────────────────────────

financeRoutes.get(
  "/investments",
  requirePermission("partners:read"),
  validate(financeQuerySchema, "query"),
  financeController.listInvestments
);

financeRoutes.get(
  "/investments/:id",
  requirePermission("partners:read"),
  financeController.getInvestment
);

financeRoutes.post(
  "/investments",
  requirePermission("partners:write"),
  writeLimiter,
  requireCsrf,
  financeController.createInvestment
);

financeRoutes.patch(
  "/investments/:id",
  requirePermission("partners:write"),
  writeLimiter,
  requireCsrf,
  financeController.updateInvestment
);

financeRoutes.delete(
  "/investments/:id",
  requirePermission("partners:write"),
  writeLimiter,
  requireCsrf,
  financeController.deleteInvestment
);

// ── Reports ──────────────────────────────────────────────────────────────────

financeRoutes.get(
  "/monthly-report",
  requirePermission("finance:read"),
  financeController.monthlyReport
);

financeRoutes.get(
  "/expense-breakdown",
  requirePermission("expenses:read"),
  financeController.expenseBreakdown
);

financeRoutes.get(
  "/cashflow",
  requirePermission("finance:read"),
  financeController.cashFlow
);

financeRoutes.get(
  "/event-profitability",
  requirePermission("finance:read"),
  financeController.eventProfitability
);
