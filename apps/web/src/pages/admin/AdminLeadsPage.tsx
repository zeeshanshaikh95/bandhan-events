import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, X } from "lucide-react";
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "@bandhan/shared";
import LeadCreatePanel from "@/components/admin/LeadCreatePanel";
import {
  AdminSeo,
  EmptyState,
  LoadingRows,
  PageHeading,
  Panel,
  RetryState,
  StatusPill,
  adminInputClass,
  eventTypeLabel,
  formatDate,
  humanizeSlug,
  serviceLabel,
} from "@/components/admin/AdminUI";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { ApiClientError } from "@/lib/apiClient";
import { leadApi } from "@/services/api";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/utils/cn";

const PAGE_SIZE = 20;

const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest first" },
  { value: "createdAt", label: "Oldest first" },
  { value: "eventDate", label: "Event date" },
  { value: "nextFollowUpAt", label: "Next follow-up" },
] as const;

export default function AdminLeadsPage() {
  const { can } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [sort, setSort] = useState<string>("-createdAt");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search);
  const showCreate = searchParams.get("new") === "1";

  const leads = useQuery({
    queryKey: ["leads", { page, search: debouncedSearch, status, source, sort }],
    queryFn: () =>
      leadApi.list({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: status || undefined,
        source: source || undefined,
        sort,
      }),
  });

  const rows = leads.data?.items ?? [];
  const filtersActive = Boolean(debouncedSearch || status || source);

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setSource("");
    setPage(1);
  };

  /** Resets to page 1 whenever a filter changes, so results are never empty-by-accident. */
  const withPageReset = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  return (
    <>
      <AdminSeo title="Leads" />
      <PageHeading
        eyebrow="CRM"
        title="Leads"
        description="Every website enquiry is captured here automatically. Manually recorded leads are marked with their own source."
        actions={
          can("leads:write") ? (
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                if (showCreate) next.delete("new");
                else next.set("new", "1");
                setSearchParams(next, { replace: true });
              }}
              className="btn-outline !text-[11px]"
              aria-expanded={showCreate}
            >
              {showCreate ? (
                <>
                  <X className="h-3.5 w-3.5" aria-hidden="true" /> Close
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" /> New lead
                </>
              )}
            </button>
          ) : null
        }
      />

      {showCreate && can("leads:write") && (
        <div className="mt-6">
          <LeadCreatePanel
            onDone={() => {
              const next = new URLSearchParams(searchParams);
              next.delete("new");
              setSearchParams(next, { replace: true });
            }}
          />
        </div>
      )}

      {/* Filters */}
      <div className="mt-6 flex flex-col gap-3 border border-forest/10 bg-ivory-soft p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex-1 sm:min-w-[14rem]">
          <label htmlFor="lead-search" className="block font-sans text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted">
            Search
          </label>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-muted/60" aria-hidden="true" />
            <input
              id="lead-search"
              type="search"
              value={search}
              onChange={(event) => withPageReset(setSearch)(event.target.value)}
              placeholder="Name, phone or email"
              className={cn(adminInputClass, "pl-9")}
            />
          </div>
        </div>

        <div>
          <label htmlFor="lead-status-filter" className="block font-sans text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted">
            Status
          </label>
          <select
            id="lead-status-filter"
            value={status}
            onChange={(event) => withPageReset(setStatus)(event.target.value)}
            className={cn(adminInputClass, "mt-2 sm:w-40")}
          >
            <option value="">All statuses</option>
            {LEAD_STATUSES.map((value: LeadStatus) => (
              <option key={value} value={value}>
                {LEAD_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="lead-source-filter" className="block font-sans text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted">
            Source
          </label>
          <select
            id="lead-source-filter"
            value={source}
            onChange={(event) => withPageReset(setSource)(event.target.value)}
            className={cn(adminInputClass, "mt-2 sm:w-40")}
          >
            <option value="">All sources</option>
            {LEAD_SOURCES.map((value) => (
              <option key={value} value={value}>
                {humanizeSlug(value)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="lead-sort" className="block font-sans text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted">
            Sort
          </label>
          <select
            id="lead-sort"
            value={sort}
            onChange={(event) => withPageReset(setSort)(event.target.value)}
            className={cn(adminInputClass, "mt-2 sm:w-44")}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {filtersActive && (
          <button type="button" onClick={clearFilters} className="btn-outline !px-5 !py-2.5 !text-[10px]">
            Clear filters
          </button>
        )}
      </div>

      <Panel className="mt-4">
        {leads.isLoading ? (
          <LoadingRows rows={6} columns={5} />
        ) : leads.isError ? (
          <div className="p-5">
            <RetryState
              message={
                leads.error instanceof ApiClientError
                  ? leads.error.message
                  : "We could not load leads right now."
              }
              onRetry={() => leads.refetch()}
            />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title={filtersActive ? "No leads match those filters" : "No leads yet"}
            description={
              filtersActive
                ? "Try a different search term or clear the filters."
                : "Enquiries from the website appear here the moment they are submitted."
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] border-collapse text-sm">
                <caption className="sr-only">
                  Leads, page {leads.data?.page} of {leads.data?.totalPages}
                </caption>
                <thead>
                  <tr className="border-b border-forest/10 text-left">
                    {["Received", "Contact", "Event", "Service", "Source", "Status", ""].map((heading, index) => (
                      <th
                        key={heading || index}
                        scope="col"
                        className="px-5 py-3 font-sans text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((lead) => (
                    <tr key={lead.id} className="border-b border-forest/5 last:border-0 hover:bg-cream/30">
                      <td className="px-5 py-3 whitespace-nowrap text-charcoal-muted">
                        {formatDate(lead.createdAt)}
                      </td>
                      <td className="px-5 py-3">
                        <Link to={`/admin/leads/${lead.id}`} className="link-underline text-forest">
                          {lead.name}
                        </Link>
                        <span className="block text-[11px] text-charcoal-muted">{lead.phone}</span>
                        {lead.email && (
                          <span className="block text-[11px] text-charcoal-muted">{lead.email}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-charcoal-muted">
                        {eventTypeLabel(lead.eventType)}
                        <span className="block text-[11px]">{formatDate(lead.eventDate, "Date not set")}</span>
                      </td>
                      <td className="px-5 py-3 text-charcoal-muted">{serviceLabel(lead.serviceRequired)}</td>
                      <td className="px-5 py-3 text-charcoal-muted">{humanizeSlug(lead.source)}</td>
                      <td className="px-5 py-3">
                        <StatusPill status={lead.status} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          to={`/admin/leads/${lead.id}`}
                          className="text-[11px] uppercase tracking-widest2 text-forest transition hover:text-gold-deep"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Server-side pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-forest/10 px-5 py-4">
              <p className="text-xs text-charcoal-muted">
                Showing {(leads.data!.page - 1) * leads.data!.limit + 1}–
                {Math.min(leads.data!.page * leads.data!.limit, leads.data!.total)} of{" "}
                {leads.data!.total}
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={leads.data!.page <= 1}
                  className="btn-outline !px-4 !py-2 !text-[10px] disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-xs text-charcoal-muted">
                  Page {leads.data!.page} / {leads.data!.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((value) => value + 1)}
                  disabled={leads.data!.page >= leads.data!.totalPages}
                  className="btn-outline !px-4 !py-2 !text-[10px] disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </Panel>
    </>
  );
}
