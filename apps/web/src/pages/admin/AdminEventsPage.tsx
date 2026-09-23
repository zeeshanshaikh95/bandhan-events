import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Calendar,
  Eye,
  Plus,
  Search,
} from "lucide-react";
import { eventApi, type EventDto } from "@/services/api";
import { formatCurrency } from "@/utils/formatCurrency";
import {
  AdminSeo,
  LoadingRows,
  PageHeading,
  RetryState,
} from "@/components/admin/AdminUI";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/utils/cn";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_EVENT_TYPES,
  PAYMENT_STATUS_LABELS,
} from "@bandhan/shared";
import type { BookingStatus, PaymentStatusValue } from "@bandhan/shared";

const STATUS_COLORS: Record<string, string> = {
  ENQUIRY: "bg-gray-100 text-gray-800",
  QUOTATION_SENT: "bg-blue-100 text-blue-800",
  NEGOTIATION: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  PLANNING: "bg-indigo-100 text-indigo-800",
  IN_PROGRESS: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const PAYMENT_COLORS: Record<string, string> = {
  UNPAID: "bg-red-100 text-red-800",
  PARTIAL: "bg-yellow-100 text-yellow-800",
  PAID: "bg-green-100 text-green-800",
  OVERDUE: "bg-red-100 text-red-800",
};

export default function AdminEventsPage() {
  const { can } = useAuth();
  const canWrite = can("events:write");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const events = useQuery({
    queryKey: ["events", search, statusFilter, typeFilter],
    queryFn: () =>
      eventApi.list({
        search: search || undefined,
        status: statusFilter || undefined,
        eventType: typeFilter || undefined,
        limit: 50,
      }),
  });

  return (
    <>
      <AdminSeo title="Events" />
      <PageHeading
        eyebrow="Operations"
        title="Events & Bookings"
        description="Manage all events from enquiry through completion."
        actions={
          canWrite ? (
            <Link to="/admin/events/new" className="btn-solid">
              <Plus className="h-4 w-4" /> New Event
            </Link>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-muted" />
          <input
            type="text"
            placeholder="Search events, venues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded border border-forest/15 bg-white py-2 pl-9 pr-3 text-sm text-charcoal outline-none focus:border-forest/40"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-forest/15 bg-white px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          {Object.entries(BOOKING_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded border border-forest/15 bg-white px-3 py-2 text-sm"
        >
          <option value="">All Types</option>
          {BOOKING_EVENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Events Table */}
      <div className="mt-6">
        {events.isLoading ? (
          <LoadingRows rows={8} columns={7} />
        ) : events.isError ? (
          <RetryState message="Failed to load events." onRetry={() => events.refetch()} />
        ) : !events.data || events.data.items.length === 0 ? (
          <div className="border border-forest/10 bg-ivory-soft p-8 text-center">
            <Calendar className="mx-auto h-8 w-8 text-charcoal-muted" />
            <p className="mt-2 text-sm text-charcoal-muted">No events found.</p>
            {canWrite && (
              <Link to="/admin/events/new" className="mt-4 inline-flex items-center gap-2 text-sm text-forest hover:underline">
                <Plus className="h-4 w-4" /> Create your first event
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto border border-forest/10 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-forest/10 bg-ivory/50">
                  <th className="px-4 py-3 text-left font-medium text-forest">Event</th>
                  <th className="px-4 py-3 text-left font-medium text-forest">Customer</th>
                  <th className="px-4 py-3 text-left font-medium text-forest">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-forest">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-forest">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-forest">Payment</th>
                  <th className="px-4 py-3 text-right font-medium text-forest">Amount</th>
                  <th className="px-4 py-3 text-center font-medium text-forest">View</th>
                </tr>
              </thead>
              <tbody>
                {events.data.items.map((e: EventDto) => (
                  <tr key={e.id} className="border-b border-forest/5 hover:bg-ivory/30">
                    <td className="px-4 py-3">
                      <Link to={`/admin/events/${e.id}`} className="font-medium text-forest hover:underline">
                        {e.eventName}
                      </Link>
                      <p className="text-xs text-charcoal-muted">{e.venue || "No venue"}</p>
                    </td>
                    <td className="px-4 py-3">{e.customer?.name || "—"}</td>
                    <td className="px-4 py-3">
                      {new Date(e.eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 capitalize">{e.eventType.replace("-", " ")}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", STATUS_COLORS[e.status] || "bg-gray-100 text-gray-800")}>
                        {BOOKING_STATUS_LABELS[e.status as BookingStatus] || e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", PAYMENT_COLORS[e.paymentStatus] || "bg-gray-100 text-gray-800")}>
                        {PAYMENT_STATUS_LABELS[e.paymentStatus as PaymentStatusValue] || e.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(e.contractAmount)}</td>
                    <td className="px-4 py-3 text-center">
                      <Link to={`/admin/events/${e.id}`} className="text-forest hover:text-forest/70">
                        <Eye className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
