import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Eye, Plus, Search } from "lucide-react";
import { QUOTATION_STATUSES, QUOTATION_STATUS_LABELS, type QuotationStatus } from "@bandhan/shared";
import { quotationApi } from "@/services/api";
import { formatCurrency } from "@/utils/formatCurrency";
import { QuotationStatusPill } from "@/components/admin/DocumentStatus";
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
import { useAuth } from "@/providers/AuthProvider";

const PAGE_SIZE = 20;

/** Pipeline counters. Zero is the honest value for a new business. */
function PipelineCards() {
  const summary = useQuery({
    queryKey: ["quotations", "summary"],
    queryFn: () => quotationApi.summary(),
  });

  const cards = [
    { label: "Draft", value: summary.data?.quotations.DRAFT },
    { label: "Sent", value: summary.data?.quotations.SENT },
    { label: "Negotiation", value: summary.data?.quotations.NEGOTIATION },
    { label: "Accepted", value: summary.data?.quotations.ACCEPTED },
    { label: "Rejected", value: summary.data?.quotations.REJECTED },
    { label: "Expired", value: summary.data?.quotations.EXPIRED },
  ];

  return (
    <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <div key={card.label} className="border border-forest/10 bg-ivory-soft px-4 py-3">
          <p className="font-sans text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted">
            {card.label}
          </p>
          <p className="mt-1.5 font-serif text-2xl font-medium text-forest">
            {summary.isLoading ? <span className="inline-block h-6 w-8 animate-pulse bg-cream" /> : (card.value ?? 0)}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function AdminQuotationsPage() {
  const { can } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("-createdAt");
  const page = Number(searchParams.get("page") ?? 1);
  const customerFilter = searchParams.get("customer") ?? "";

  const quotations = useQuery({
    queryKey: ["quotations", { search, status, from, to, sort, page, customer: customerFilter }],
    queryFn: () =>
      quotationApi.list({
        search: search || undefined,
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
        customer: customerFilter || undefined,
        sort,
        page,
        limit: PAGE_SIZE,
      }),
  });

  const totalPages = quotations.data ? Math.max(1, Math.ceil(quotations.data.total / PAGE_SIZE)) : 1;

  const setPage = (next: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(next));
    setSearchParams(params);
  };

  return (
    <>
      <AdminSeo title="Quotations" />
      <PageHeading
        eyebrow="Commercial"
        title="Quotations"
        description="Every offer sent to a customer, with the version that was accepted preserved."
        actions={
          can("quotations:write") ? (
            <Link to="/admin/quotations/new" className="btn-solid">
              <Plus className="h-4 w-4" aria-hidden="true" /> New quotation
            </Link>
          ) : undefined
        }
      />

      <PipelineCards />

      <Panel className="mt-6">
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
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
                placeholder="Quotation number or customer"
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
              {QUOTATION_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {QUOTATION_STATUS_LABELS[value as QuotationStatus]}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className={adminLabelClass}>Issued from</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${adminInputClass} mt-2`} />
          </label>

          <label>
            <span className={adminLabelClass}>Issued to</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${adminInputClass} mt-2`} />
          </label>

          <label>
            <span className={adminLabelClass}>Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className={`${adminInputClass} mt-2`}>
              <option value="-createdAt">Newest first</option>
              <option value="createdAt">Oldest first</option>
              <option value="-grandTotal">Highest value</option>
              <option value="grandTotal">Lowest value</option>
              <option value="validUntil">Validity date</option>
            </select>
          </label>
        </div>

        {customerFilter && (
          <p className="border-t border-forest/10 px-5 py-3 text-xs text-charcoal-muted">
            Filtered to one customer.{" "}
            <button
              type="button"
              className="text-forest underline"
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.delete("customer");
                setSearchParams(params);
              }}
            >
              Show all
            </button>
          </p>
        )}
      </Panel>

      <div className="mt-6 border border-forest/10 bg-ivory-soft">
        {quotations.isLoading ? (
          <LoadingRows rows={8} columns={5} />
        ) : quotations.isError ? (
          <RetryState message="Quotations could not be loaded." onRetry={() => quotations.refetch()} />
        ) : !quotations.data || quotations.data.items.length === 0 ? (
          <EmptyState
            title="No quotations yet"
            description="A quotation starts with a customer. Build one here once the event details are known."
          >
            {can("quotations:write") && (
              <Link to="/admin/quotations/new" className="btn-solid">
                <Plus className="h-4 w-4" aria-hidden="true" /> New quotation
              </Link>
            )}
          </EmptyState>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[48rem] text-sm">
                <thead>
                  <tr className="border-b border-forest/10">
                    {["Quotation", "Customer", "Event", "Issued", "Valid until", "Status", "Total", ""].map(
                      (heading) => (
                        <th
                          key={heading}
                          scope="col"
                          className="whitespace-nowrap px-5 py-3 text-left font-sans text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted"
                        >
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-forest/5">
                  {quotations.data.items.map((quotation) => (
                    <tr key={quotation.id} className="transition-colors hover:bg-cream/40">
                      <td className="px-5 py-3.5">
                        <Link to={`/admin/quotations/${quotation.id}`} className="font-medium text-forest hover:underline">
                          {quotation.quotationNumber}
                        </Link>
                        {quotation.version > 1 && (
                          <span className="ml-2 text-[10px] uppercase tracking-widest2 text-charcoal-muted">
                            v{quotation.version}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-charcoal">{quotation.customer?.name ?? "—"}</td>
                      <td className="px-5 py-3.5 text-charcoal-muted">{quotation.event?.eventName || "—"}</td>
                      <td className="px-5 py-3.5 text-charcoal-muted">{formatDate(quotation.issueDate)}</td>
                      <td className="px-5 py-3.5 text-charcoal-muted">{formatDate(quotation.validUntil)}</td>
                      <td className="px-5 py-3.5">
                        <QuotationStatusPill status={quotation.status} />
                        {quotation.isExpired && quotation.status !== "EXPIRED" && (
                          <span className="ml-2 text-[10px] uppercase tracking-widest2 text-red-900">lapsed</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-forest">
                        {formatCurrency(quotation.totals.grandTotal)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          to={`/admin/quotations/${quotation.id}`}
                          aria-label={`Open ${quotation.quotationNumber}`}
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
              aria-label="Quotation pages"
              className="flex items-center justify-between border-t border-forest/10 px-5 py-3 text-xs text-charcoal-muted"
            >
              <span>
                Page {page} of {totalPages} · {quotations.data.total} quotation
                {quotations.data.total === 1 ? "" : "s"}
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
