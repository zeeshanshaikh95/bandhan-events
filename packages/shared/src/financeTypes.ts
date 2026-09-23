/**
 * Finance DTO types shared between API and frontend.
 * These match the MongoDB document shapes after transformation.
 */

export interface PaymentDto {
  id: string;
  customer?: { id: string; name: string } | null;
  booking?: { id: string; eventName?: string } | null;
  amount: number;
  paymentDate: string;
  method: string;
  reference: string;
  notes: string;
  status: string;
  createdBy?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseDto {
  id: string;
  date: string;
  category: string;
  amount: number;
  description: string;
  vendor?: { id: string; name: string } | null;
  vendorName: string;
  booking?: { id: string; eventName?: string } | null;
  paymentMethod: string;
  paidBy: string;
  receipt: string;
  notes: string;
  archivedAt?: string | null;
  createdBy?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentDto {
  id: string;
  date: string;
  partner: string;
  amount: number;
  type: string;
  purpose: string;
  paymentMethod: string;
  reference: string;
  notes: string;
  createdBy?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

/** Financial summary for the dashboard. */
export interface FinanceSummary {
  revenue: {
    total: number;
    thisMonth: number;
    thisYear: number;
  };
  payments: {
    totalReceived: number;
    pending: number;
    overdue: number;
  };
  expenses: {
    total: number;
    thisMonth: number;
    thisYear: number;
  };
  investments: {
    total: number;
  };
  profit: {
    gross: number;
    net: number;
  };
  events: {
    active: number;
    completed: number;
    upcoming: number;
  };
}

/** Event profitability row. */
export interface EventProfitability {
  bookingId: string;
  customerName: string;
  eventType: string;
  eventDate: string | null;
  revenue: number;
  amountReceived: number;
  outstanding: number;
  directExpenses: number;
  grossProfit: number;
  grossMarginPercent: number;
}

/** Monthly report row. */
export interface MonthlyReport {
  month: string;
  year: number;
  revenue: number;
  paymentsReceived: number;
  expenses: number;
  investments: number;
  grossProfit: number;
  outstanding: number;
  cashFlow: number;
}

/** Cash flow summary. */
export interface CashFlowSummary {
  moneyIn: {
    customerPayments: number;
    otherIncome: number;
    total: number;
  };
  moneyOut: {
    expenses: number;
    vendorPayments: number;
    otherPayments: number;
    total: number;
  };
  investments: {
    total: number;
  };
  openingBalance: number;
  closingBalance: number;
}

/** Expense breakdown by category. */
export interface ExpenseBreakdown {
  category: string;
  label: string;
  amount: number;
  percentage: number;
}
