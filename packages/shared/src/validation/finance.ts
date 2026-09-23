import { z } from "zod";

/**
 * ---------------------------------------------------------------------------
 * FINANCE VALIDATION
 * ---------------------------------------------------------------------------
 * Shared between API and frontend. Financial values are validated strictly:
 * amounts cannot be negative, required references must be valid IDs, etc.
 */

// ── Payment ──────────────────────────────────────────────────────────────────

export const paymentMethodEnum = z.enum(["cash", "upi", "bank-transfer", "card", "cheque", "other"]);
export const paymentStatusEnum = z.enum(["PENDING", "RECEIVED", "REFUNDED"]);

export const createPaymentSchema = z.object({
  customer: z.string().min(1, "Customer is required").optional().nullable(),
  booking: z.string().min(1).optional().nullable(),
  quotation: z.string().min(1).optional().nullable(),
  /** Attach the receipt to the invoice it settles, so the balance follows. */
  invoice: z.string().min(1).optional().nullable(),
  amount: z.number().min(1, "Amount must be at least ₹1"),
  paymentDate: z.string().min(1, "Payment date is required"),
  method: paymentMethodEnum.default("cash"),
  reference: z.string().max(100).default(""),
  notes: z.string().max(500).default(""),
  status: paymentStatusEnum.default("RECEIVED"),
});

export const updatePaymentSchema = createPaymentSchema.partial();

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;

// ── Expense ──────────────────────────────────────────────────────────────────

export const expenseCategoryEnum = z.enum([
  "decoration",
  "flowers",
  "lighting",
  "furniture",
  "transport",
  "labour",
  "catering",
  "venue",
  "marketing",
  "printing",
  "equipment",
  "vendor",
  "miscellaneous",
]);

export const createExpenseSchema = z.object({
  date: z.string().min(1, "Date is required"),
  category: expenseCategoryEnum,
  amount: z.number().min(1, "Amount must be at least ₹1"),
  description: z.string().max(500).default(""),
  vendor: z.string().min(1).optional().nullable(),
  vendorName: z.string().max(100).default(""),
  booking: z.string().min(1).optional().nullable(),
  paymentMethod: paymentMethodEnum.default("cash"),
  paidBy: z.string().max(100).default(""),
  receipt: z.string().max(500).default(""),
  notes: z.string().max(500).default(""),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

// ── Investment ───────────────────────────────────────────────────────────────

export const investmentTypeEnum = z.enum(["capital", "additional-contribution", "withdrawal"]);

export const createInvestmentSchema = z.object({
  date: z.string().min(1, "Date is required"),
  partner: z.string().min(1, "Partner name is required").max(100),
  amount: z.number().min(1, "Amount must be at least ₹1"),
  type: investmentTypeEnum.default("capital"),
  purpose: z.string().max(300).default(""),
  paymentMethod: paymentMethodEnum.default("cash"),
  reference: z.string().max(100).default(""),
  notes: z.string().max(500).default(""),
});

export const updateInvestmentSchema = createInvestmentSchema.partial();

export type CreateInvestmentInput = z.infer<typeof createInvestmentSchema>;
export type UpdateInvestmentInput = z.infer<typeof updateInvestmentSchema>;

// ── Finance Query Params ─────────────────────────────────────────────────────

export const financeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  category: z.string().optional(),
  method: z.string().optional(),
  status: z.string().optional(),
  booking: z.string().optional(),
  customer: z.string().optional(),
  partner: z.string().optional(),
  search: z.string().optional(),
  sort: z.string().default("-createdAt"),
});

export type FinanceQuery = z.infer<typeof financeQuerySchema>;
