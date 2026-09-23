import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Eye, Search } from "lucide-react";
import { INVOICE_STATUSES, INVOICE_STATUS_LABELS, type InvoiceStatus } from "@bandhan/shared";
import { invoiceApi } from "@/services/api";
import { formatCurrency } from "@/utils/formatCurrency";
import { InvoiceStatusPill } from "@/components/admin/DocumentStatus";
import {
  AdminSeo,
  EmptyState,
  LoadingRows,
  PageHeading,
  Panel,
  RetryState,
  adminInputClass,
  adminLabelClass,
  formatDate,
} from "@/components/admin/AdminUI";

const PAGE_SIZE = 20;

export default function AdminInvoicesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const page = Number(searchParams.get("page") ?? 1);
  const customerFilter = searchParams.get("customer") ?? "";
  const eventFilter = searchParams.get("event") ?? "";

  const invoices = useQuery({
    queryKey: ["invoices", { search, status, overdueOnly, page, customer: customerFilter, event: eventFilter }],
    queryFn: () =>
      invoiceApi.list({
        search: search || undefined,
        status: status || undefined,
        overdue: overdueOnly ? "true" : undefined,
        customer: customerFilter || undefined,
        event: eventFilter || undefined,
        page,
        limit: PAGE_SIZE,
      }),
  });

  const summary = useQuery({
    queryKey: ["invoices", "summary"],
    queryFn: () => invoiceApi.summary(),
  });

  const totalPages = invoices.data ? Math.max(1, Math.ceil(invoices.data.total / PAGE_SIZE)) : 1;

  const setPage = (next: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(next));
    setSearchParams(params);
  };

  const hasContextFilter = Boolean(customerFilter || eventFilter);

  return (
    <>
      <AdminSeo title="Invoices" />
      <PageHeading
        eyebrow="Commercial"
        title="Invoices"
        description="Amounts owed by customers, computed from the payments actually received — not from what was billed."
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Outstanding", value: summary.data?.outstandingTotal },
          { label: "Overdue", value: summary.data?.overdueTotal },
          { label: "Accepted quotations", value: summary.data?.acceptedValue },
          { label: "Paid invoices", value: summary.data?.invoices.PAID },
        ].map((card) => (
          <div key={card.label} className="border border-forest/10 bg-ivory-soft px-5 py-4">
            <p className="font-sans text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted">
              {card.label}
            </p>
            <p className="mt-1.5 font-serif text-2xl font-medium text-forest">
              {summary.isLoading ? (
                <span className="inline-block h-6 w-16 animate-pulse bg-cream" />
              ) : card.label === "Paid invoices" ? (
                (card.value ?? 0)
              ) : (
                formatCurrency(card.value ?? 0)
              )}
            </p>
          </div>
        ))}
      </div>

      <Panel className="mt-6">
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <label className="lg:col-span-2">
            <span className={adminLabelClass}>Search</span>
            <span className="relative mt-2 block">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-muted"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Invoice number or customer"
                className={`${adminInputClass} pl-9`}
              />
            </span>
          </label>

          <label>
            <span className={adminLabelClass}>Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className={`${adminInputClass} mt-2`}
            >
              <option value="">All</option>
              {INVOICE_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {INVOICE_STATUS_LABELS[value as InvoiceStatus]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-end gap-2 pb-2.5 text-sm text-charcoal">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(event) => setOverdueOnly(event.target.checked)}
            />
            Show only overdue
          </label>
        </div>

        {hasContextFilter && (
          <p className="border-t border-forest/10 px-5 py-3 text-xs text-charcoal-muted">
            Filtered from a customer or event.{" "}
            <button
              type="button"
              className="text-forest underline"
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.delete("customer");
                params.delete("event");
                setSearchParams(params);
              }}
            >
              Show all
            </button>
          </p>
        )}
      </Panel>

      <div className="mt-6 border border-forest/10 bg-ivory-soft">
        {invoices.isLoading ? (
          <LoadingRows rows={8} columns={6} />
        ) : invoices.isError ? (
          <RetryState message="Invoices could not be loaded." onRetry={() => invoices.refetch()} />
        ) : !invoices.data || invoices.data.items.length === 0 ? (
          <EmptyState
            title="No invoices yet"
            description="Raise an invoice from an accepted quotation, or straight from an event."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] text-sm">
                <thead>
                  <tr className="border-b border-forest/10">
                    {["Invoice", "Customer", "Event", "Issued", "Due", "Total", "Paid", "Outstanding", "Status", ""].map(
                      (heading) => (
                        <th
                          key={heading}
                          scope="col"
                          className="whitespace-nowrap px-4 py-3 text-left font-sans text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted"
                        >
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-forest/5">
                  {invoices.data.items.map((invoice) => (
                    <tr key={invoice.id} className="transition-colors hover:bg-cream/40">
                      <td className="px-4 py-3.5">
                        <Link to={`/admin/invoices/${invoice.id}`} className="font-medium text-forest hover:underline">
                          {invoice.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-charcoal">{invoice.customer?.name ?? "—"}</td>
                      <td className="px-4 py-3.5 text-charcoal-muted">{invoice.event?.eventName || "—"}</td>
                      <td className="px-4 py-3.5 text-charcoal-muted">{formatDate(invoice.issueDate)}</td>
                      <td className="px-4 py-3.5 text-charcoal-muted">
                        {formatDate(invoice.dueDate)}
                        {invoice.isOverdue && (
                          <span className="ml-2 text-[10px] uppercase tracking-widest2 text-red-900">overdue</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right text-charcoal">
                        {formatCurrency(invoice.totals.grandTotal)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-charcoal-muted">
                        {formatCurrency(invoice.amountPaid)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-forest">
                        {formatCurrency(invoice.outstanding)}
                      </td>
                      <td className="px-4 py-3.5">
                        <InvoiceStatusPill status={invoice.derivedStatus} />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          to={`/admin/invoices/${invoice.id}`}
                          aria-label={`Open ${invoice.invoiceNumber}`}
                          className="text-forest hover:text-forest/70"
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <nav
              aria-label="Invoice pages"
              className="flex items-center justify-between border-t border-forest/10 px-5 py-3 text-xs text-charcoal-muted"
            >
              <span>
                Page {page} of {totalPages} · {invoices.data.total} invoice
                {invoices.data.total === 1 ? "" : "s"}
              </span>
              <span className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="btn-outline !px-3 !py-1.5 !text-[10px]"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="btn-outline !px-3 !py-1.5 !text-[10px]"
                >
                  Next
                </button>
              </span>
            </nav>
          </>
        )}
      </div>
    </>
  );
}
