import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Archive,
  FileText,
  Mail,
  MessageCircle,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  Upload,
} from "lucide-react";
import {
  VENDOR_STATUSES,
  VENDOR_STATUS_LABELS,
  vendorTypeLabel,
  type VendorStatus,
} from "@bandhan/shared";
import { documentApi, vendorApi } from "@/services/api";
import { ApiClientError } from "@/lib/apiClient";
import { formatCurrency } from "@/utils/formatCurrency";
import {
  AdminSeo,
  EmptyState,
  FormError,
  LoadingRows,
  PageHeading,
  Panel,
  RetryState,
  SuccessNotice,
  adminInputClass,
  adminLabelClass,
  formatDate,
  formatDateTime,
} from "@/components/admin/AdminUI";
import { AssignmentStatusPill, VendorStatusPill } from "@/components/admin/VendorStatus";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/utils/cn";

type TabKey = "overview" | "events" | "financials" | "payments" | "documents" | "notes";

/**
 * Vendor and caterer workspace.
 *
 * Every monetary figure on this page is derived by the API from the shared
 * Expense and VendorPayment records — nothing here is stored twice, so the
 * vendor's outstanding balance can never drift from the finance module.
 */

/** `wa.me` needs bare digits; a 10-digit local number is assumed to be Indian. */
function waNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

export default function AdminVendorDetailPage() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const canWrite = can("vendors:write");
  const canSeeMoney = can("vendors:finance");
  const canArchive = can("vendors:delete");

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [noteText, setNoteText] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const vendor = useQuery({
    queryKey: ["vendor", vendorId],
    queryFn: () => vendorApi.get(vendorId!),
    enabled: Boolean(vendorId),
  });

  const financials = useQuery({
    queryKey: ["vendor-financials", vendorId],
    queryFn: () => vendorApi.financials(vendorId!),
    enabled: Boolean(vendorId) && canSeeMoney,
  });

  const payments = useQuery({
    queryKey: ["vendor-payments", vendorId],
    queryFn: () => vendorApi.payments(vendorId!),
    enabled: Boolean(vendorId) && canSeeMoney && activeTab === "payments",
  });

  const documents = useQuery({
    queryKey: ["vendor-documents", vendorId],
    queryFn: () => vendorApi.documents(vendorId!),
    enabled: Boolean(vendorId) && activeTab === "documents",
  });

  const invalidateVendor = () => {
    queryClient.invalidateQueries({ queryKey: ["vendor", vendorId] });
    queryClient.invalidateQueries({ queryKey: ["vendor-financials", vendorId] });
    queryClient.invalidateQueries({ queryKey: ["vendors"] });
  };

  const setStatus = useMutation({
    mutationFn: (status: VendorStatus) => vendorApi.setStatus(vendorId!, status),
    onSuccess: () => {
      invalidateVendor();
      setNotice("Status updated.");
    },
  });

  const archive = useMutation({
    mutationFn: () => vendorApi.archive(vendorId!),
    onSuccess: () => {
      invalidateVendor();
      setNotice("Vendor archived. Past events and payments are untouched.");
    },
  });

  const addNote = useMutation({
    mutationFn: (body: string) => vendorApi.addNote(vendorId!, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor", vendorId] });
      setNoteText("");
    },
  });

  const upload = useMutation({
    mutationFn: (file: File) => vendorApi.uploadDocument(vendorId!, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-documents", vendorId] });
      setNotice("Document attached.");
      if (fileInput.current) fileInput.current.value = "";
    },
  });

  if (vendor.isPending) {
    return (
      <>
        <AdminSeo title="Vendor" />
        <Panel>
          <LoadingRows rows={6} columns={2} />
        </Panel>
      </>
    );
  }

  if (vendor.isError || !vendor.data) {
    return (
      <>
        <AdminSeo title="Vendor" />
        <RetryState
          message="We could not load that vendor. It may have been removed."
          onRetry={() => vendor.refetch()}
        />
      </>
    );
  }

  const v = vendor.data;
  const contactNumber = v.whatsapp || v.phone;
  const totals = financials.data?.totals;

  const tabs: { key: TabKey; label: string; show: boolean }[] = [
    { key: "overview", label: "Overview", show: true },
    { key: "events", label: "Events", show: true },
    { key: "financials", label: "Financials", show: canSeeMoney },
    { key: "payments", label: "Payments", show: canSeeMoney },
    { key: "documents", label: "Documents", show: true },
    { key: "notes", label: "Notes", show: true },
  ];

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex items-start justify-between gap-4 border-b border-forest/5 py-2.5 last:border-0">
      <span className="text-xs uppercase tracking-wide text-charcoal-muted">{label}</span>
      <span className="text-right text-sm text-charcoal">{value}</span>
    </div>
  );

  return (
    <>
      <AdminSeo title={v.name} />

      <Link
        to="/admin/vendors"
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest2 text-charcoal-muted hover:text-forest"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to vendors
      </Link>

      <div className="mt-4">
        <PageHeading
          eyebrow={vendorTypeLabel(v.type)}
          title={v.name}
          description={v.company || v.description || undefined}
          actions={
            <>
              {contactNumber && (
                <a href={`tel:${contactNumber}`} className="btn-outline">
                  <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                  Call
                </a>
              )}
              {contactNumber && (
                <a
                  href={`https://wa.me/${waNumber(contactNumber)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline"
                >
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  WhatsApp
                </a>
              )}
              {v.email && (
                <a href={`mailto:${v.email}`} className="btn-outline">
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                  Email
                </a>
              )}
              {canWrite && (
                <Link to={`/admin/vendors/${v.id}/edit`} className="btn-solid">
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  Edit
                </Link>
              )}
            </>
          }
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <VendorStatusPill status={v.status} />
        {canWrite && (
          <label className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-charcoal-muted">Change to</span>
            <select
              value=""
              onChange={(event) => {
                if (event.target.value) setStatus.mutate(event.target.value as VendorStatus);
              }}
              className={`${adminInputClass} !w-auto !py-1.5 !text-xs`}
            >
              <option value="">Select…</option>
              {VENDOR_STATUSES.filter((status) => status !== v.status).map((status) => (
                <option key={status} value={status}>
                  {VENDOR_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
        )}
        {canArchive && !v.archivedAt && (
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "Archive this vendor? Past event assignments, expenses and payments stay on record."
                )
              ) {
                archive.mutate();
              }
            }}
            className="inline-flex items-center gap-1.5 border border-red-900/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest2 text-red-900 hover:bg-red-50"
          >
            <Archive className="h-3.5 w-3.5" aria-hidden="true" />
            Archive
          </button>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <SuccessNotice message={notice} />
        <FormError
          message={
            setStatus.error instanceof ApiClientError
              ? setStatus.error.message
              : archive.error instanceof ApiClientError
                ? archive.error.message
                : upload.error instanceof ApiClientError
                  ? upload.error.message
                  : addNote.error instanceof ApiClientError
                    ? addNote.error.message
                    : null
          }
        />
      </div>

      <div className="mt-6 border-b border-forest/10">
        <nav className="flex flex-wrap gap-1">
          {tabs
            .filter((tab) => tab.show)
            .map((tab) => (
              <button
                key={tab.key}
                type="button"
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

      <div className="mt-6 space-y-6">
        {activeTab === "overview" && (
          <div className="grid gap-6 md:grid-cols-2">
            <Panel title="Contact">
              <div className="px-5 py-3">
                {row("Contact person", v.contactPerson || "—")}
                {row("Phone", v.phone || "—")}
                {row("WhatsApp", v.whatsapp || "—")}
                {row("Email", v.email || "—")}
                {row("Address", v.address || "—")}
                {row("Area / city", [v.area, v.city].filter(Boolean).join(", ") || "—")}
              </div>
            </Panel>

            <Panel title="Services and rates">
              <div className="px-5 py-3">
                {row(
                  "Rate basis",
                  v.rateInfo.basis.replace(/-/g, " ")
                )}
                {row("Indicative rate", formatCurrency(v.rateInfo.amount))}
                {v.rateInfo.notes && row("Rate notes", v.rateInfo.notes)}
                {row("Category", v.category || "—")}
                {row("Added", `${formatDate(v.createdAt)} by ${v.createdBy?.name ?? "—"}`)}
                {row("Last updated", formatDateTime(v.updatedAt))}
                <div className="pt-3">
                  {v.services.length === 0 ? (
                    <p className="text-sm text-charcoal-muted">No services recorded.</p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {v.services.map((service) => (
                        <li
                          key={service}
                          className="border border-forest/15 bg-cream/50 px-2.5 py-1 text-xs text-charcoal"
                        >
                          {service}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </Panel>

            {v.type === "caterer" && (
              <>
                <Panel title="Catering">
                  <div className="px-5 py-3">
                    {row("Default per plate", formatCurrency(v.caterer.perPlatePrice))}
                    {row(
                      "Guest range",
                      v.caterer.minimumGuestCount || v.caterer.maximumGuestCount
                        ? `${v.caterer.minimumGuestCount ?? "—"} – ${v.caterer.maximumGuestCount ?? "—"}`
                        : "—"
                    )}
                    {row("Serving staff", v.caterer.servingStaff || "—")}
                    {row("Staff included", v.caterer.staffIncluded ? "Yes" : "No")}
                    {row("Equipment included", v.caterer.equipmentIncluded ? "Yes" : "No")}
                    {row("Setup charges", formatCurrency(v.caterer.setupCharges))}
                    {row("Delivery charges", formatCurrency(v.caterer.deliveryCharges))}
                    {row("Other charges", formatCurrency(v.caterer.additionalCharges))}
                    {v.caterer.notes && row("Notes", v.caterer.notes)}
                  </div>
                </Panel>

                <Panel title="Packages and cuisines">
                  <div className="px-5 py-4 space-y-4">
                    {v.caterer.cuisines.length > 0 && (
                      <div>
                        <span className={adminLabelClass}>Cuisines</span>
                        <p className="mt-1.5 text-sm text-charcoal">{v.caterer.cuisines.join(" · ")}</p>
                      </div>
                    )}
                    {v.caterer.dietaryOptions.length > 0 && (
                      <div>
                        <span className={adminLabelClass}>Dietary options</span>
                        <ul className="mt-1.5 flex flex-wrap gap-2">
                          {v.caterer.dietaryOptions.map((option) => (
                            <li
                              key={String(option)}
                              className="border border-forest/15 bg-cream/50 px-2.5 py-1 text-xs capitalize"
                            >
                              {String(option).replace(/-/g, " ")}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {v.packages.length === 0 ? (
                      <p className="text-sm text-charcoal-muted">No packages defined yet.</p>
                    ) : (
                      <ul className="space-y-3">
                        {v.packages.map((pkg) => (
                          <li key={pkg.id} className="border border-forest/10 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm font-medium text-forest">{pkg.name}</span>
                              <span className="text-sm text-charcoal">
                                {formatCurrency(pkg.pricePerPlate)} / plate
                                {!pkg.active && (
                                  <span className="ml-2 text-[11px] uppercase text-charcoal-muted">
                                    inactive
                                  </span>
                                )}
                              </span>
                            </div>
                            {pkg.minimumGuests ? (
                              <p className="mt-1 text-[11px] text-charcoal-muted">
                                Minimum {pkg.minimumGuests} guests
                              </p>
                            ) : null}
                            {pkg.menuItems.length > 0 && (
                              <p className="mt-1.5 text-xs text-charcoal-muted">
                                {pkg.menuItems.join(" · ")}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Panel>
              </>
            )}
          </div>
        )}

        {activeTab === "events" && (
          <Panel title="Events" description="Where this vendor has been assigned.">
            {financials.isPending ? (
              <LoadingRows rows={4} columns={3} />
            ) : financials.isError ? (
              <RetryState
                message="We could not load this vendor's event history."
                onRetry={() => financials.refetch()}
              />
            ) : (financials.data?.events.length ?? 0) === 0 ? (
              <EmptyState
                title="Not assigned to any event yet"
                description="Assign this vendor from an event's Vendors tab and it will appear here."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[46rem] text-sm">
                  <thead>
                    <tr className="border-b border-forest/10 text-left">
                      <th className="px-5 py-3 font-sans text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted">
                        Event
                      </th>
                      <th className="px-5 py-3 font-sans text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted">
                        Service
                      </th>
                      <th className="px-5 py-3 font-sans text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted">
                        Status
                      </th>
                      <th className="px-5 py-3 text-right font-sans text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted">
                        Agreed
                      </th>
                      <th className="px-5 py-3 text-right font-sans text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted">
                        Paid
                      </th>
                      {canSeeMoney && (
                        <th className="px-5 py-3 text-right font-sans text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted">
                          Outstanding
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-forest/5">
                    {financials.data?.events.map((item) => (
                      <tr key={item.assignmentId}>
                        <td className="px-5 py-3">
                          <Link
                            to={`/admin/events/${item.eventId}`}
                            className="font-medium text-forest hover:underline"
                          >
                            {item.eventName}
                          </Link>
                          <p className="text-[11px] text-charcoal-muted">
                            {formatDate(item.eventDate)}
                          </p>
                        </td>
                        <td className="px-5 py-3 text-charcoal-muted">{item.service || "—"}</td>
                        <td className="px-5 py-3">
                          <AssignmentStatusPill status={item.assignmentStatus} />
                        </td>
                        <td className="px-5 py-3 text-right">{formatCurrency(item.agreedCost)}</td>
                        <td className="px-5 py-3 text-right">{formatCurrency(item.amountPaid)}</td>
                        {canSeeMoney && (
                          <td className="px-5 py-3 text-right">
                            <span
                              className={cn(
                                item.outstanding > 0 ? "text-red-900" : "text-charcoal-muted"
                              )}
                            >
                              {formatCurrency(item.outstanding)}
                            </span>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}

        {activeTab === "financials" && canSeeMoney && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Total contracted", value: totals?.contracted ?? 0 },
                { label: "Total paid", value: totals?.paid ?? 0 },
                { label: "Outstanding", value: totals?.outstanding ?? 0 },
                { label: "Average per event", value: totals?.averageEventCost ?? 0 },
              ].map((card) => (
                <div key={card.label} className="border border-forest/10 bg-ivory-soft px-5 py-4">
                  <p className="font-sans text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted">
                    {card.label}
                  </p>
                  <p className="mt-2 font-serif text-2xl font-medium text-forest">
                    {financials.isPending ? "…" : formatCurrency(card.value)}
                  </p>
                </div>
              ))}
            </div>

            <Panel title="Performance">
              <div className="px-5 py-3">
                {row("Events worked", totals?.events ?? 0)}
                {row("Completed", totals?.completedEvents ?? 0)}
                {row("Cancelled", totals?.cancelledEvents ?? 0)}
              </div>
              <p className="border-t border-forest/10 px-5 py-3 text-[11px] text-charcoal-muted">
                Derived from event assignments, expenses and recorded payments. This is operational
                tracking, not audited accounting.
              </p>
            </Panel>
          </div>
        )}

        {activeTab === "payments" && canSeeMoney && (
          <Panel title="Payments made" description="Money paid out to this vendor.">
            {payments.isPending ? (
              <LoadingRows rows={4} columns={4} />
            ) : payments.isError ? (
              <RetryState
                message="We could not load this vendor's payments."
                onRetry={() => payments.refetch()}
              />
            ) : (payments.data?.length ?? 0) === 0 ? (
              <EmptyState
                title="No payments recorded"
                description="Record a vendor payment from the event's Vendors tab."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[42rem] text-sm">
                  <thead>
                    <tr className="border-b border-forest/10 text-left">
                      <th className="px-5 py-3 font-sans text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted">
                        Date
                      </th>
                      <th className="px-5 py-3 font-sans text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted">
                        Event
                      </th>
                      <th className="px-5 py-3 font-sans text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted">
                        Method
                      </th>
                      <th className="px-5 py-3 text-right font-sans text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-forest/5">
                    {payments.data?.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-5 py-3">{formatDate(payment.paymentDate)}</td>
                        <td className="px-5 py-3">
                          {payment.event ? (
                            <Link
                              to={`/admin/events/${payment.event.id}`}
                              className="text-forest hover:underline"
                            >
                              {payment.event.eventName}
                            </Link>
                          ) : (
                            <span className="text-charcoal-muted">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 capitalize text-charcoal-muted">
                          {payment.method.replace(/-/g, " ")}
                          {payment.reference && (
                            <span className="block text-[11px]">Ref {payment.reference}</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">{formatCurrency(payment.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}

        {activeTab === "documents" && (
          <Panel
            title="Documents"
            description="Quotations, agreements, rate cards and menus."
            actions={
              canWrite ? (
                <>
                  <input
                    ref={fileInput}
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.avif"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) upload.mutate(file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    disabled={upload.isPending}
                    className="btn-outline !px-4 !py-1.5 !text-[11px]"
                  >
                    <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                    {upload.isPending ? "Uploading…" : "Upload"}
                  </button>
                </>
              ) : undefined
            }
          >
            {documents.isPending ? (
              <LoadingRows rows={3} columns={3} />
            ) : documents.isError ? (
              <RetryState
                message="We could not load this vendor's documents."
                onRetry={() => documents.refetch()}
              />
            ) : (documents.data?.length ?? 0) === 0 ? (
              <EmptyState
                title="No documents yet"
                description="PDF, JPEG, PNG, WebP or AVIF up to 15 MB."
              />
            ) : (
              <ul className="divide-y divide-forest/5">
                {documents.data?.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-4 px-5 py-3">
                    <span className="flex min-w-0 items-center gap-3">
                      <FileText className="h-4 w-4 shrink-0 text-charcoal-muted" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-charcoal">{doc.fileName}</span>
                        <span className="text-[11px] text-charcoal-muted">
                          {formatDate(doc.createdAt)} · {(doc.sizeBytes / 1024).toFixed(0)} KB
                        </span>
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => documentApi.download(doc.id, doc.fileName)}
                      className="btn-outline !px-4 !py-1.5 !text-[11px]"
                    >
                      <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                      Download
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {activeTab === "notes" && (
          <Panel title="Notes" description="Operational notes the team needs to know.">
            {canWrite && (
              <div className="border-b border-forest/10 p-5">
                <label className="block">
                  <span className={adminLabelClass}>Add a note</span>
                  <textarea
                    rows={3}
                    value={noteText}
                    onChange={(event) => setNoteText(event.target.value)}
                    placeholder="Requires 3 days notice for large orders."
                    className={`${adminInputClass} mt-2`}
                  />
                </label>
                <button
                  type="button"
                  disabled={noteText.trim().length < 2 || addNote.isPending}
                  onClick={() => addNote.mutate(noteText.trim())}
                  className="btn-solid mt-3 !px-5 !py-2 !text-[11px]"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  {addNote.isPending ? "Saving…" : "Add note"}
                </button>
              </div>
            )}

            {v.noteLog.length === 0 ? (
              <EmptyState title="No notes yet" />
            ) : (
              <ul className="divide-y divide-forest/5">
                {v.noteLog.map((note) => (
                  <li key={note.id} className="px-5 py-4">
                    <p className="text-sm text-charcoal">{note.body}</p>
                    <p className="mt-1 text-[11px] text-charcoal-muted">
                      {note.authorName} · {formatDateTime(note.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {v.notes && activeTab === "notes" && (
          <Panel title="Summary notes">
            <p className="whitespace-pre-line px-5 py-4 text-sm text-charcoal">{v.notes}</p>
          </Panel>
        )}

        {abandonedStatusHint(v.status, canWrite)}
      </div>
    </>
  );
}

/** Blocked vendors are a deliberate choice — surface it rather than let it read as a glitch. */
function abandonedStatusHint(status: VendorStatus, canWrite: boolean) {
  if (status !== "BLOCKED") return null;
  return (
    <p className="flex items-start gap-2 border border-red-900/20 bg-red-50/60 px-4 py-3 text-sm text-red-900">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        This vendor is blocked and is hidden from the event vendor picker.
        {canWrite ? " Change the status above to make them selectable again." : ""}
      </span>
    </p>
  );
}
