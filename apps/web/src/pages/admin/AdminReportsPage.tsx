import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Calendar } from "lucide-react";
import { financeApi, type MonthlyReport, type ExpenseBreakdown } from "@/services/api";
import { formatCurrency } from "@/utils/formatCurrency";
import {
  AdminSeo,
  LoadingRows,
  PageHeading,
  Panel,
  RetryState,
} from "@/components/admin/AdminUI";

function MonthlyReportTable({ data }: { data: MonthlyReport[] }) {
  return (
    <div className="overflow-x-auto border border-forest/10 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-forest/10 bg-ivory/50">
            <th className="px-4 py-3 text-left font-medium text-forest">Month</th>
            <th className="px-4 py-3 text-right font-medium text-forest">Revenue</th>
            <th className="px-4 py-3 text-right font-medium text-forest">Payments</th>
            <th className="px-4 py-3 text-right font-medium text-forest">Expenses</th>
            <th className="px-4 py-3 text-right font-medium text-forest">Investments</th>
            <th className="px-4 py-3 text-right font-medium text-forest">Gross Profit</th>
            <th className="px-4 py-3 text-right font-medium text-forest">Cash Flow</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.month} className="border-b border-forest/5 hover:bg-ivory/30">
              <td className="px-4 py-3 font-medium">{row.month}</td>
              <td className="px-4 py-3 text-right">{formatCurrency(row.revenue)}</td>
              <td className="px-4 py-3 text-right">{formatCurrency(row.paymentsReceived)}</td>
              <td className="px-4 py-3 text-right text-red-600">{formatCurrency(row.expenses)}</td>
              <td className="px-4 py-3 text-right text-charcoal-muted">{formatCurrency(row.investments)}</td>
              <td className={`px-4 py-3 text-right font-medium ${row.grossProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(row.grossProfit)}
              </td>
              <td className={`px-4 py-3 text-right ${row.cashFlow >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(row.cashFlow)}
              </td>
            </tr>
          ))}
          {/* Totals row */}
          <tr className="border-t-2 border-forest/20 bg-ivory/30 font-semibold">
            <td className="px-4 py-3">Total</td>
            <td className="px-4 py-3 text-right">{formatCurrency(data.reduce((s, r) => s + r.revenue, 0))}</td>
            <td className="px-4 py-3 text-right">{formatCurrency(data.reduce((s, r) => s + r.paymentsReceived, 0))}</td>
            <td className="px-4 py-3 text-right text-red-600">{formatCurrency(data.reduce((s, r) => s + r.expenses, 0))}</td>
            <td className="px-4 py-3 text-right text-charcoal-muted">{formatCurrency(data.reduce((s, r) => s + r.investments, 0))}</td>
            <td className="px-4 py-3 text-right">{formatCurrency(data.reduce((s, r) => s + r.grossProfit, 0))}</td>
            <td className="px-4 py-3 text-right">{formatCurrency(data.reduce((s, r) => s + r.cashFlow, 0))}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ExpenseBreakdownChart({ data }: { data: ExpenseBreakdown[] }) {
  const maxAmount = Math.max(...data.map((d) => d.amount), 1);

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.category} className="flex items-center gap-3">
          <span className="w-32 shrink-0 text-sm text-charcoal-muted">{item.label}</span>
          <div className="flex-1 h-6 bg-ivory rounded overflow-hidden">
            <div
              className="h-full bg-forest/70 rounded transition-all"
              style={{ width: `${(item.amount / maxAmount) * 100}%` }}
            />
          </div>
          <span className="w-24 text-right text-sm font-medium">{formatCurrency(item.amount)}</span>
          <span className="w-12 text-right text-xs text-charcoal-muted">{item.percentage}%</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminReportsPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const monthlyReport = useQuery({
    queryKey: ["finance", "monthly-report", year],
    queryFn: () => financeApi.monthlyReport(year),
  });

  const expenseBreakdown = useQuery({
    queryKey: ["finance", "expense-breakdown"],
    queryFn: () => financeApi.expenseBreakdown(),
  });

  return (
    <>
      <AdminSeo title="Reports" />
      <PageHeading
        eyebrow="Finance"
        title="Financial Reports"
        description="Monthly reports and expense breakdown. All data from MongoDB."
      />

      {/* Year Selector */}
      <div className="mt-6 flex items-center gap-3">
        <Calendar className="h-4 w-4 text-charcoal-muted" />
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="rounded border border-forest/15 bg-white px-3 py-2 text-sm"
        >
          {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Monthly Report */}
      <div className="mt-6">
        <Panel title={`${year} Monthly Report`} description="Revenue, expenses, and profit by month.">
          <div className="p-5 sm:p-6">
            {monthlyReport.isLoading ? (
              <LoadingRows rows={12} columns={7} />
            ) : monthlyReport.isError ? (
              <RetryState
                message="Failed to load report."
                onRetry={() => monthlyReport.refetch()}
              />
            ) : monthlyReport.data ? (
              <MonthlyReportTable data={monthlyReport.data} />
            ) : null}
          </div>
        </Panel>
      </div>

      {/* Expense Breakdown */}
      <div className="mt-6">
        <Panel title="Expense Breakdown" description="Expenses by category.">
          <div className="p-5 sm:p-6">
            {expenseBreakdown.isLoading ? (
              <LoadingRows rows={8} columns={4} />
            ) : expenseBreakdown.isError ? (
              <RetryState
                message="Failed to load breakdown."
                onRetry={() => expenseBreakdown.refetch()}
              />
            ) : !expenseBreakdown.data || expenseBreakdown.data.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="mx-auto h-8 w-8 text-charcoal-muted" />
                <p className="mt-2 text-sm text-charcoal-muted">No expenses recorded yet.</p>
              </div>
            ) : expenseBreakdown.data ? (
              <ExpenseBreakdownChart data={expenseBreakdown.data} />
            ) : null}
          </div>
        </Panel>
      </div>
    </>
  );
}
