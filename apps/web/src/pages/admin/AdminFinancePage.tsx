import { useQuery } from "@tanstack/react-query";
import {
  CreditCard,
  DollarSign,
  IndianRupee,
  PiggyBank,
  Receipt,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { financeApi } from "@/services/api";
import { formatCurrency } from "@/utils/formatCurrency";
import { AdminSeo, LoadingRows, PageHeading, Panel, RetryState } from "@/components/admin/AdminUI";

function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
}: {
  label: string;
  value: string;
  icon: typeof TrendingUp;
  trend?: "up" | "down";
  trendLabel?: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded border border-forest/10 bg-white p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-forest/5">
        <Icon className="h-5 w-5 text-forest" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-label text-charcoal-muted">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-forest">{value}</p>
        {trendLabel && (
          <p className={`mt-1 text-xs ${trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-charcoal-muted"}`}>
            {trend === "up" && <TrendingUp className="inline h-3 w-3" />}
            {trend === "down" && <TrendingDown className="inline h-3 w-3" />}
            {" "}{trendLabel}
          </p>
        )}
      </div>
    </div>
  );
}

export default function AdminFinancePage() {
  const summary = useQuery({
    queryKey: ["finance", "summary"],
    queryFn: () => financeApi.summary(),
  });

  if (summary.isLoading) {
    return (
      <>
        <AdminSeo title="Finance" />
        <PageHeading eyebrow="Finance" title="Financial Summary" />
        <div className="mt-8 border border-forest/10 bg-ivory-soft">
          <LoadingRows rows={4} columns={4} />
        </div>
      </>
    );
  }

  if (summary.isError || !summary.data) {
    return (
      <>
        <AdminSeo title="Finance" />
        <PageHeading eyebrow="Finance" title="Financial Summary" />
        <div className="mt-8">
          <RetryState
            message="Failed to load financial data."
            onRetry={() => summary.refetch()}
          />
        </div>
      </>
    );
  }

  const data = summary.data;

  return (
    <>
      <AdminSeo title="Finance" />
      <PageHeading
        eyebrow="Finance"
        title="Financial Summary"
        description="All figures are calculated from real MongoDB data. No mock values."
      />

      {/* Revenue & Payments */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={formatCurrency(data.revenue.total)}
          icon={IndianRupee}
          trendLabel={`₹${formatCurrency(data.revenue.thisMonth)} this month`}
        />
        <StatCard
          label="Payments Received"
          value={formatCurrency(data.payments.totalReceived)}
          icon={CreditCard}
          trendLabel={`₹${formatCurrency(data.payments.pending)} pending`}
        />
        <StatCard
          label="Total Expenses"
          value={formatCurrency(data.expenses.total)}
          icon={Receipt}
          trend={data.expenses.thisMonth > 0 ? "down" : undefined}
          trendLabel={`₹${formatCurrency(data.expenses.thisMonth)} this month`}
        />
        <StatCard
          label="Total Investments"
          value={formatCurrency(data.investments.total)}
          icon={PiggyBank}
        />
      </div>

      {/* Profit */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Gross Profit"
          value={formatCurrency(data.profit.gross)}
          icon={data.profit.gross >= 0 ? TrendingUp : TrendingDown}
          trend={data.profit.gross >= 0 ? "up" : "down"}
          trendLabel={data.profit.gross >= 0 ? "Profitable" : "Loss"}
        />
        <StatCard
          label="Net Profit"
          value={formatCurrency(data.profit.net)}
          icon={DollarSign}
          trend={data.profit.net >= 0 ? "up" : "down"}
          trendLabel="After direct costs"
        />
      </div>

      {/* Quick Links */}
      <div className="mt-8">
        <Panel title="Financial Modules" description="Manage payments, expenses and investments.">
          <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
            <a
              href="/admin/payments"
              className="flex items-center gap-3 rounded border border-forest/10 bg-white p-4 transition-colors hover:border-forest/30"
            >
              <CreditCard className="h-5 w-5 text-forest" />
              <div>
                <p className="text-sm font-medium text-forest">Payments</p>
                <p className="text-xs text-charcoal-muted">Track customer payments</p>
              </div>
            </a>
            <a
              href="/admin/expenses"
              className="flex items-center gap-3 rounded border border-forest/10 bg-white p-4 transition-colors hover:border-forest/30"
            >
              <Receipt className="h-5 w-5 text-forest" />
              <div>
                <p className="text-sm font-medium text-forest">Expenses</p>
                <p className="text-xs text-charcoal-muted">Track business expenses</p>
              </div>
            </a>
            <a
              href="/admin/investments"
              className="flex items-center gap-3 rounded border border-forest/10 bg-white p-4 transition-colors hover:border-forest/30"
            >
              <PiggyBank className="h-5 w-5 text-forest" />
              <div>
                <p className="text-sm font-medium text-forest">Investments</p>
                <p className="text-xs text-charcoal-muted">Track partner contributions</p>
              </div>
            </a>
          </div>
        </Panel>
      </div>
    </>
  );
}
