import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Eye, Phone, Plus, Search } from "lucide-react";
import {
  VENDOR_STATUSES,
  VENDOR_STATUS_LABELS,
  VENDOR_TYPES,
  type VendorStatus,
} from "@bandhan/shared";
import { vendorApi } from "@/services/api";
import { formatCurrency } from "@/utils/formatCurrency";
import {
  AdminSeo,
  EmptyState,
  LoadingRows,
  PageHeading,
  Panel,
  RetryState,
  adminInputClass,
  adminLabelClass,
} from "@/components/admin/AdminUI";
import { useAuth } from "@/providers/AuthProvider";
import { VendorStatusPill } from "@/components/admin/VendorStatus";
import { cn } from "@/utils/cn";

const PAGE_SIZE = 20;

export default function AdminVendorsPage() {
  const { can } = useAuth();
  const canWrite = can("vendors:write");
  const canSeeMoney = can("vendors:finance");

  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [city, setCity] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [sort, setSort] = useState("name");
  const page = Number(searchParams.get("page") ?? 1);

  const vendors = useQuery({
    queryKey: ["vendors", { search, type, status, city, activeOnly, sort, page }],
    queryFn: () =>
      vendorApi.list({
        search: search || undefined,
        type: type || undefined,
        status: status || undefined,
        city: city || undefined,
        activeOnly: activeOnly ? "true" : undefined,
        sort,
        page,
        limit: PAGE_SIZE,
      }),
  });

  // Cities and status counters come from the vendors actually on record, so the
  // filter bar never offers an option that returns nothing.
  const options = useQuery({
    queryKey: ["vendors", "options"],
    queryFn: () => vendorApi.options(),
    staleTime: 60_000,
  });

  const totalPages = vendors.data ? Math.max(1, Math.ceil(vendors.data.total / PAGE_SIZE)) : 1;

  const setPage = (next: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(next));
    setSearchParams(params);
  };

  const counts = options.data?.statusCounts ?? {};

  return (
    <>
      <AdminSeo title="Vendors" />
      <PageHeading
        eyebrow="Operations"
        title="Vendors & Caterers"
        description="Everyone Bandhan Events buys from — decorators, caterers, photographers, lighting, transport. Vendor costs flow into event expenses and profit automatically."
        actions={
          canWrite ? (
            <Link to="/admin/vendors/new" className="btn-solid">
              <Plus className="h-4 w-4" aria-hidden="true" /> New vendor
            </Link>
          ) : undefined
        }
      />

      <div className="mt-6 grid grid-cols-3 gap-4 sm:max-w-lg">
        {VENDOR_STATUSES.map((value) => (
          <div key={value} className="border border-forest/10 bg-ivory-soft px-4 py-3">
            <p className="font-sans text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted">
              {VENDOR_STATUS_LABELS[value as VendorStatus]}
            </p>
            <p className="mt-1.5 font-serif text-2xl font-medium text-forest">
              {options.isLoading ? (
                <span className="inline-block h-6 w-8 animate-pulse bg-cream" />
              ) : (
                (counts[value] ?? 0)
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
                placeholder="Name, company, contact, phone or service"
                className={`${adminInputClass} pl-9`}
              />
            </span>
          </label>

          <label>
            <span className={adminLabelClass}>Vendor type</span>
            <select value={type} onChange={(e) => setType(e.target.value)} className={`${adminInputClass} mt-2`}>
              <option value="">All types</option>
              {VENDOR_TYPES.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className={adminLabelClass}>Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${adminInputClass} mt-2`}>
              <option value="">All statuses</option>
              {VENDOR_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {VENDOR_STATUS_LABELS[value as VendorStatus]}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className={adminLabelClass}>City</span>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={`${adminInputClass} mt-2`}
              disabled={!options.data?.cities.length}
            >
              <option value="">All cities</option>
              {(options.data?.cities ?? []).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className={adminLabelClass}>Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className={`${adminInputClass} mt-2`}>
              <option value="name">Name A–Z</option>
              <option value="-name">Name Z–A</option>
              <option value="type">Vendor type</option>
              <option value="city">City</option>
              <option value="-createdAt">Newest first</option>
            </select>
          </label>

          <label className="flex items-end gap-2 pb-2.5 text-sm text-charcoal">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(event) => setActiveOnly(event.target.checked)}
            />
            Only active vendors
          </label>
        </div>
      </Panel>

      <div className="mt-6 border border-forest/10 bg-ivory-soft">
        {vendors.isLoading ? (
          <LoadingRows rows={8} columns={6} />
        ) : vendors.isError ? (
          <RetryState message="Vendors could not be loaded." onRetry={() => vendors.refetch()} />
        ) : !vendors.data || vendors.data.items.length === 0 ? (
          <EmptyState
            title="No vendors yet"
            description="Add the suppliers you work with — flowers, lighting, catering, photography — then assign them to events."
          >
            {canWrite && (
              <Link to="/admin/vendors/new" className="btn-solid">
                <Plus className="h-4 w-4" aria-hidden="true" /> New vendor
              </Link>
            )}
          </EmptyState>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] text-sm">
                <thead>
                  <tr className="border-b border-forest/10">
                    {[
                      "Vendor",
                      "Category",
                      "Contact",
                      "Location",
                      "Status",
                      "Events",
                      ...(canSeeMoney ? ["Outstanding"] : []),
                      "",
                    ].map((heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="whitespace-nowrap px-4 py-3 text-left font-sans text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-forest/5">
                  {vendors.data.items.map((vendor) => (
                    <tr key={vendor.id} className="transition-colors hover:bg-cream/40">
                      <td className="px-4 py-3.5">
                        <Link to={`/admin/vendors/${vendor.id}`} className="font-medium text-forest hover:underline">
                          {vendor.name}
                        </Link>
                        {vendor.company && (
                          <p className="text-[11px] text-charcoal-muted">{vendor.company}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-charcoal-muted">
                        {vendor.category || vendor.services[0] || "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-charcoal">{vendor.contactPerson || "—"}</p>
                        {vendor.phone && (
                          <a
                            href={`tel:${vendor.phone}`}
                            className="inline-flex items-center gap-1 text-[11px] text-forest hover:underline"
                          >
                            <Phone className="h-3 w-3" aria-hidden="true" />
                            {vendor.phone}
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-charcoal-muted">
                        {[vendor.area, vendor.city].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <VendorStatusPill status={vendor.status} />
                      </td>
                      <td className="px-4 py-3.5 text-charcoal">{vendor.events}</td>
                      {canSeeMoney && (
                        <td
                          className={cn(
                            "px-4 py-3.5 text-right font-medium",
                            vendor.outstanding > 0 ? "text-red-900" : "text-forest"
                          )}
                        >
                          {formatCurrency(vendor.outstanding)}
                        </td>
                      )}
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          to={`/admin/vendors/${vendor.id}`}
                          aria-label={`Open ${vendor.name}`}
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
              aria-label="Vendor pages"
              className="flex items-center justify-between border-t border-forest/10 px-5 py-3 text-xs text-charcoal-muted"
            >
              <span>
                Page {page} of {totalPages} · {vendors.data.total} vendor
                {vendors.data.total === 1 ? "" : "s"}
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
