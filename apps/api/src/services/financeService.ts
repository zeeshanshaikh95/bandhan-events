import type {
  FinanceSummary,
  EventProfitability,
  MonthlyReport,
  CashFlowSummary,
  ExpenseBreakdown,
  PaymentDto,
  ExpenseDto,
  InvestmentDto,
  Paginated,
} from "@bandhan/shared";
import { EXPENSE_CATEGORY_LABELS, type ExpenseCategory } from "@/models/Expense";
import { paymentRepository } from "@/repositories/paymentRepository";
import { expenseRepository } from "@/repositories/expenseRepository";
import { investmentRepository } from "@/repositories/investmentRepository";
import { vendorPaymentRepository } from "@/repositories/vendorPaymentRepository";
import { buildPaginated } from "@/utils/http";

/**
 * ---------------------------------------------------------------------------
 * FINANCE SERVICE
 * ---------------------------------------------------------------------------
 * Central service for all financial calculations and business logic.
 * Heavy aggregation runs in MongoDB, not in React.
 */

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

function endOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export const financeService = {
  /**
   * Financial summary for the dashboard.
   * All values computed from real MongoDB data.
   */
  async getSummary(): Promise<FinanceSummary> {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const yearStart = startOfYear(now);
    const yearEnd = endOfYear(now);

    const [
      totalReceived,
      thisMonthReceived,
      thisYearReceived,
      totalPending,
      totalExpenses,
      thisMonthExpenses,
      thisYearExpenses,
      totalInvestments,
    ] = await Promise.all([
      paymentRepository.totalReceived(),
      paymentRepository.totalReceivedByDateRange(monthStart, monthEnd),
      paymentRepository.totalReceivedByDateRange(yearStart, yearEnd),
      paymentRepository.totalPending(),
      expenseRepository.totalExpenses(),
      expenseRepository.totalByDateRange(monthStart, monthEnd),
      expenseRepository.totalByDateRange(yearStart, yearEnd),
      investmentRepository.totalInvested(),
    ]);

    const grossProfit = totalReceived - totalExpenses;
    const netProfit = grossProfit; // No operating expenses tracked yet

    return {
      revenue: {
        total: totalReceived,
        thisMonth: thisMonthReceived,
        thisYear: thisYearReceived,
      },
      payments: {
        totalReceived,
        pending: totalPending,
        overdue: 0, // Will be calculated when due dates are added
      },
      expenses: {
        total: totalExpenses,
        thisMonth: thisMonthExpenses,
        thisYear: thisYearExpenses,
      },
      investments: {
        total: totalInvestments,
      },
      profit: {
        gross: grossProfit,
        net: netProfit,
      },
      events: {
        active: 0, // Will be driven by bookings module
        completed: 0,
        upcoming: 0,
      },
    };
  },

  /**
   * List payments with pagination and filters.
   */
  async listPayments(query: any): Promise<Paginated<PaymentDto>> {
    const { items, total } = await paymentRepository.list(query);
    const dtos: PaymentDto[] = items.map((p: any) => ({
      id: String(p._id),
      customer: p.customer ? { id: String(p.customer._id), name: p.customer.name } : null,
      booking: p.booking ? { id: String(p.booking._id), eventName: p.booking.eventName } : null,
      amount: p.amount,
      paymentDate: p.paymentDate.toISOString(),
      method: p.method,
      reference: p.reference || "",
      notes: p.notes || "",
      status: p.status,
      createdBy: p.createdBy ? { id: String(p.createdBy._id), name: p.createdBy.name } : null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
    return buildPaginated(dtos, total, query.page, query.limit);
  },

  /**
   * List expenses with pagination and filters.
   */
  async listExpenses(query: any): Promise<Paginated<ExpenseDto>> {
    const { items, total } = await expenseRepository.list(query);
    const dtos: ExpenseDto[] = items.map((e: any) => ({
      id: String(e._id),
      date: e.date.toISOString(),
      category: e.category,
      amount: e.amount,
      description: e.description || "",
      vendor: e.vendor ? { id: String(e.vendor._id), name: e.vendor.name } : null,
      vendorName: e.vendorName || "",
      booking: e.booking ? { id: String(e.booking._id), eventName: e.booking.eventName } : null,
      paymentMethod: e.paymentMethod,
      paidBy: e.paidBy || "",
      receipt: e.receipt || "",
      notes: e.notes || "",
      archivedAt: e.archivedAt?.toISOString() || null,
      createdBy: e.createdBy ? { id: String(e.createdBy._id), name: e.createdBy.name } : null,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    }));
    return buildPaginated(dtos, total, query.page, query.limit);
  },

  /**
   * List investments with pagination and filters.
   */
  async listInvestments(query: any): Promise<Paginated<InvestmentDto>> {
    const { items, total } = await investmentRepository.list(query);
    const dtos: InvestmentDto[] = items.map((i: any) => ({
      id: String(i._id),
      date: i.date.toISOString(),
      partner: i.partner,
      amount: i.amount,
      type: i.type,
      purpose: i.purpose || "",
      paymentMethod: i.paymentMethod,
      reference: i.reference || "",
      notes: i.notes || "",
      createdBy: i.createdBy ? { id: String(i.createdBy._id), name: i.createdBy.name } : null,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    }));
    return buildPaginated(dtos, total, query.page, query.limit);
  },

  /**
   * Monthly report for a given year.
   */
  async getMonthlyReport(year: number): Promise<MonthlyReport[]> {
    const [monthlyReceived, monthlyExpenses, monthlyInvestments] = await Promise.all([
      paymentRepository.monthlyReceived(year),
      expenseRepository.monthlyExpenses(year),
      investmentRepository.monthlyInvestments(year),
    ]);

    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    const receivedMap = new Map(monthlyReceived.map((r) => [r.month, r.total]));
    const expensesMap = new Map(monthlyExpenses.map((r) => [r.month, r.total]));
    const investmentsMap = new Map(monthlyInvestments.map((r) => [r.month, r.total]));

    return months.map((month, index) => {
      const monthNum = index + 1;
      const revenue = receivedMap.get(monthNum) || 0;
      const expenses = expensesMap.get(monthNum) || 0;
      const investments = investmentsMap.get(monthNum) || 0;
      const grossProfit = revenue - expenses;

      return {
        month,
        year,
        revenue,
        paymentsReceived: revenue,
        expenses,
        investments,
        grossProfit,
        outstanding: 0, // Would need booking data
        cashFlow: revenue - expenses,
      };
    });
  },

  /**
   * Expense breakdown by category.
   */
  async getExpenseBreakdown(startDate?: string, endDate?: string): Promise<ExpenseBreakdown[]> {
    let breakdown: { category: string; total: number }[];

    if (startDate && endDate) {
      breakdown = await expenseRepository.byCategoryDateRange(
        new Date(startDate),
        new Date(endDate)
      );
    } else {
      breakdown = await expenseRepository.byCategory();
    }

    const total = breakdown.reduce((sum, b) => sum + b.total, 0);

    return breakdown.map((b) => ({
      category: b.category,
      label: EXPENSE_CATEGORY_LABELS[b.category as ExpenseCategory] || b.category,
      amount: b.total,
      percentage: total > 0 ? Math.round((b.total / total) * 100) : 0,
    }));
  },

  /**
   * Cash flow summary.
   */
  async getCashFlow(): Promise<CashFlowSummary> {
    const [totalReceived, totalExpenses, totalInvestments, totalVendorPaid] = await Promise.all([
      paymentRepository.totalReceived(),
      expenseRepository.totalExpenses(),
      investmentRepository.totalInvested(),
      vendorPaymentRepository.totalPaidOut(),
    ]);

    // Vendor payments and expenses are reported side by side rather than added
    // together: a vendor cost is recognised as an expense when it is agreed, and
    // the payment that settles it is a movement of cash, not a second cost.
    // Summing them would double-count every settled vendor bill.
    return {
      moneyIn: {
        customerPayments: totalReceived,
        otherIncome: 0, // Will be tracked when other income sources exist
        total: totalReceived,
      },
      moneyOut: {
        expenses: totalExpenses,
        vendorPayments: totalVendorPaid,
        otherPayments: 0,
        total: totalExpenses,
      },
      investments: {
        total: totalInvestments,
      },
      openingBalance: 0, // Admin-configurable opening balance
      closingBalance: totalReceived - totalExpenses + totalInvestments,
    };
  },

  /**
   * Event profitability — requires booking data.
   * Returns empty array until bookings module is built.
   */
  async getEventProfitability(): Promise<EventProfitability[]> {
    // TODO: Implement when Booking model exists
    // For now, calculate from payments/expenses linked to bookings
    return [];
  },

  formatCurrency,
};
