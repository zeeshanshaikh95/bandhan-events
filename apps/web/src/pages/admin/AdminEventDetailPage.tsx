import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  Loader2,
  MapPin,
} from "lucide-react";
import { eventApi } from "@/services/api";
import { formatCurrency } from "@/utils/formatCurrency";
import {
  AdminSeo,
  LoadingRows,
  PageHeading,
  Panel,
  RetryState,
} from "@/components/admin/AdminUI";
import { EventVendorsPanel } from "@/components/admin/EventVendorsPanel";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/utils/cn";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUSES,
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

export default function AdminEventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();

  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "financials" | "services" | "vendors" | "team" | "notes">("overview");
  const [noteText, setNoteText] = useState("");
  const [statusDraft, setStatusDraft] = useState<string>("");

  const event = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => eventApi.get(eventId!),
    enabled: !!eventId,
  });

  const financials = useQuery({
    queryKey: ["event-financials", eventId],
    queryFn: () => eventApi.financials(eventId!),
    enabled: !!eventId,
  });

  const addNoteMutation = useMutation({
    mutationFn: (body: string) => eventApi.addNote(eventId!, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      setNoteText("");
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => eventApi.updateStatus(eventId!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      setStatusDraft("");
    },
  });

  if (event.isLoading) {
    return (
      <>
        <AdminSeo title="Event" />
        <LoadingRows rows={6} columns={4} />
      </>
    );
  }

  if (event.isError || !event.data) {
    return (
      <>
        <AdminSeo title="Event" />
        <RetryState message="Failed to load event." onRetry={() => event.refetch()} />
      </>
    );
  }

  const e = event.data;
  const f = financials.data;

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "financials", label: "Financials" },
    { key: "services", label: "Services" },
    { key: "vendors", label: "Vendors" },
    { key: "team", label: "Team" },
    { key: "notes", label: "Notes" },
  ] as const;

  return (
    <>
      <AdminSeo title={e.eventName} />
      <PageHeading
        eyebrow="Event"
        title={e.eventName}
        description={`${e.customer?.name || "No customer"} · ${new Date(e.eventDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`}
        actions={
          <div className="flex gap-3">
            <Link to="/admin/events" className="btn-outline">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            {can("events:write") && (
              <Link to={`/admin/events/${eventId}/edit`} className="btn-solid">
                Edit Event
              </Link>
            )}
          </div>
        }
      />

      {/* Status Bar */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-sm font-medium", STATUS_COLORS[e.status] || "bg-gray-100 text-gray-800")}>
          {BOOKING_STATUS_LABELS[e.status as BookingStatus] || e.status}
        </span>
        <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-sm font-medium", e.paymentStatus === "PAID" ? "bg-green-100 text-green-800" : e.paymentStatus === "PARTIAL" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800")}>
          {PAYMENT_STATUS_LABELS[e.paymentStatus as PaymentStatusValue] || e.paymentStatus}
        </span>
        {can("events:write") && (
          <div className="flex items-center gap-2">
            <select
              value={statusDraft}
              onChange={(e) => setStatusDraft(e.target.value)}
              className="rounded border border-forest/15 bg-white px-2 py-1 text-sm"
            >
              <option value="">Change status...</option>
              {BOOKING_STATUSES.map((s) => (
                <option key={s} value={s}>{BOOKING_STATUS_LABELS[s]}</option>
              ))}
            </select>
            {statusDraft && (
              <button
                onClick={() => statusMutation.mutate(statusDraft)}
                disabled={statusMutation.isPending}
                className="btn-solid text-xs"
              >
                {statusMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Update
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-6 border-b border-forest/10">
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "border-b-2 border-forest text-forest"
                  : "text-charcoal-muted hover:text-forest"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "overview" && (
          <div className="grid gap-6 md:grid-cols-2">
            <Panel title="Event Details">
              <div className="p-5 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-charcoal-muted">Event Type</span>
                  <span className="text-sm font-medium capitalize">{e.eventType.replace("-", " ")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-charcoal-muted">Date</span>
                  <span className="text-sm font-medium">{new Date(e.eventDate).toLocaleDateString("en-IN")}</span>
                </div>
                {e.startTime && (
                  <div className="flex justify-between">
                    <span className="text-sm text-charcoal-muted">Time</span>
                    <span className="text-sm font-medium">{e.startTime}{e.endTime ? ` – ${e.endTime}` : ""}</span>
                  </div>
                )}
                {e.guestCount && (
                  <div className="flex justify-between">
                    <span className="text-sm text-charcoal-muted">Guests</span>
                    <span className="text-sm font-medium">{e.guestCount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                {e.packageName && (
                  <div className="flex justify-between">
                    <span className="text-sm text-charcoal-muted">Package</span>
                    <span className="text-sm font-medium">{e.packageName}</span>
                  </div>
                )}
              </div>
            </Panel>

            <Panel title="Venue">
              <div className="p-5 space-y-3">
                {e.venue ? (
                  <>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 text-charcoal-muted" />
                      <div>
                        <p className="text-sm font-medium">{e.venue}</p>
                        {e.venueAddress && <p className="text-xs text-charcoal-muted mt-1">{e.venueAddress}</p>}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-charcoal-muted">No venue specified</p>
                )}
              </div>
            </Panel>

            <Panel title="Customer">
              <div className="p-5">
                {e.customer ? (
                  <div>
                    <p className="text-sm font-medium">{e.customer.name}</p>
                    <p className="text-xs text-charcoal-muted mt-1">{e.customer.phone}</p>
                  </div>
                ) : (
                  <p className="text-sm text-charcoal-muted">No customer linked</p>
                )}
              </div>
            </Panel>

            <Panel title="Quick Financials">
              <div className="p-5 space-y-3">
                {f ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-charcoal-muted">Contract</span>
                      <span className="text-sm font-medium">{formatCurrency(f.contractAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-charcoal-muted">Received</span>
                      <span className="text-sm font-medium text-green-600">{formatCurrency(f.amountReceived)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-charcoal-muted">Outstanding</span>
                      <span className={cn("text-sm font-medium", f.outstanding > 0 ? "text-red-600" : "text-green-600")}>{formatCurrency(f.outstanding)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-charcoal-muted">Expenses</span>
                      <span className="text-sm font-medium text-red-600">{formatCurrency(f.directExpenses)}</span>
                    </div>
                    <div className="flex justify-between border-t border-forest/10 pt-3">
                      <span className="text-sm font-medium text-forest">Gross Profit</span>
                      <span className={cn("text-sm font-bold", f.grossProfit >= 0 ? "text-green-600" : "text-red-600")}>{formatCurrency(f.grossProfit)}</span>
                    </div>
                  </>
                ) : (
                  <LoadingRows rows={5} columns={2} />
                )}
              </div>
            </Panel>
          </div>
        )}

        {activeTab === "financials" && (
          <Panel title="Event Financials" description="All figures from the existing finance system.">
            <div className="p-5">
              {financials.isLoading ? (
                <LoadingRows rows={6} columns={2} />
              ) : financials.isError ? (
                <p className="text-sm text-red-600">Failed to load financials.</p>
              ) : financials.data ? (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <h3 className="font-medium text-forest">Revenue</h3>
                    <div className="flex justify-between">
                      <span className="text-sm text-charcoal-muted">Contract Value</span>
                      <span className="text-sm font-medium">{formatCurrency(financials.data.contractAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-charcoal-muted">Amount Received</span>
                      <span className="text-sm font-medium text-green-600">{formatCurrency(financials.data.amountReceived)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-charcoal-muted">Outstanding</span>
                      <span className={cn("text-sm font-medium", financials.data.outstanding > 0 ? "text-red-600" : "text-green-600")}>{formatCurrency(financials.data.outstanding)}</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-medium text-forest">Profitability</h3>
                    <div className="flex justify-between">
                      <span className="text-sm text-charcoal-muted">Direct Expenses</span>
                      <span className="text-sm font-medium text-red-600">{formatCurrency(financials.data.directExpenses)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-charcoal-muted">Gross Profit</span>
                      <span className={cn("text-sm font-bold", financials.data.grossProfit >= 0 ? "text-green-600" : "text-red-600")}>{formatCurrency(financials.data.grossProfit)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-charcoal-muted">Gross Margin</span>
                      <span className="text-sm font-bold">{financials.data.grossMarginPercent}%</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </Panel>
        )}

        {activeTab === "services" && (
          <Panel title="Event Services">
            <div className="p-5">
              {e.services.length === 0 ? (
                <p className="text-sm text-charcoal-muted">No services added yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-forest/10">
                        <th className="px-3 py-2 text-left font-medium text-forest">Service</th>
                        <th className="px-3 py-2 text-right font-medium text-forest">Qty</th>
                        <th className="px-3 py-2 text-right font-medium text-forest">Unit Price</th>
                        <th className="px-3 py-2 text-right font-medium text-forest">Total</th>
                        <th className="px-3 py-2 text-left font-medium text-forest">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {e.services.map((s, i) => (
                        <tr key={i} className="border-b border-forest/5">
                          <td className="px-3 py-2 font-medium">{s.name}</td>
                          <td className="px-3 py-2 text-right">{s.quantity}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(s.unitPrice)}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(s.unitPrice * (s.quantity || 1))}</td>
                          <td className="px-3 py-2 text-charcoal-muted">{s.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Panel>
        )}

        {activeTab === "vendors" && <EventVendorsPanel eventId={eventId!} />}

        {activeTab === "team" && (
          <Panel title="Team Assignment">
            <div className="p-5">
              {e.team.length === 0 ? (
                <p className="text-sm text-charcoal-muted">No team members assigned yet.</p>
              ) : (
                <div className="space-y-3">
                  {e.team.map((t, i) => (
                    <div key={i} className="flex items-center justify-between rounded border border-forest/10 p-3">
                      <div>
                        <p className="text-sm font-medium">{typeof t.user === "object" ? t.user.name : t.user}</p>
                        <p className="text-xs text-charcoal-muted capitalize">{t.role.replace("-", " ")}</p>
                      </div>
                      {t.notes && <p className="text-xs text-charcoal-muted">{t.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Panel>
        )}

        {activeTab === "notes" && (
          <Panel title="Event Notes">
            <div className="p-5">
              {/* Add Note Form */}
              {can("events:write") && (
                <div className="mb-4 flex gap-2">
                  <input
                    type="text"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add a note..."
                    className="flex-1 rounded border border-forest/15 bg-white px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => {
                      if (noteText.trim()) {
                        addNoteMutation.mutate(noteText);
                      }
                    }}
                    disabled={!noteText.trim() || addNoteMutation.isPending}
                    className="btn-solid"
                  >
                    {addNoteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Add
                  </button>
                </div>
              )}

              {/* Notes List */}
              {e.notes && (
                <div className="mb-4 rounded border border-forest/10 bg-ivory/30 p-3">
                  <p className="text-xs font-medium text-charcoal-muted mb-1">General Notes</p>
                  <p className="text-sm">{e.notes}</p>
                </div>
              )}
            </div>
          </Panel>
        )}
      </div>
    </>
  );
}
