import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, Check, Download, FileText, Pencil, Send, X } from "lucide-react";
import { LINE_ITEM_CATEGORY_LABELS, LINE_ITEM_UNITS, type LineItemCategory } from "@bandhan/shared";
import { documentApi, invoiceApi, quotationApi } from "@/services/api";
import { formatCurrency } from "@/utils/formatCurrency";
import { QuotationStatusPill } from "@/components/admin/DocumentStatus";
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
import { useAuth } from "@/providers/AuthProvider";

const unitLabel = (value: string) =>
  LINE_ITEM_UNITS.find((entry) => entry.value === value)?.label ?? value;

export default function AdminQuotationDetailPage() {
  const { quotationId } = useParams<{ quotationId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const canWrite = can("quotations:write");
  const canInvoice = can("invoices:write");

  const [notice, setNotice] = useState<string | null>(null);
  const [showAccept, setShowAccept] = useState(false);
  const [acceptedByName, setAcceptedByName] = useState("");
  const [acceptNote, setAcceptNote] = useState("");
  const [overrideExpired, setOverrideExpired] = useState(false);

  const quotation = useQuery({
    queryKey: ["quotation", quotationId],
    queryFn: () => quotationApi.get(quotationId!),
    enabled: Boolean(quotationId),
  });

  const documents = useQuery({
    queryKey: ["quotation", quotationId, "documents"],
    queryFn: () => quotationApi.documents(quotationId!),
    enabled: Boolean(quotationId) && Boolean(quotation.data),
  });

  /** Every mutation refreshes the quotation plus anything it can move. */
  const afterMutation = (message: string) => (updated: { id?: string }) => {
    setNotice(message);
    setShowAccept(false);
    queryClient.invalidateQueries({ queryKey: ["quotations"] });
    queryClient.invalidateQueries({ queryKey: ["quotation", quotationId] });
    queryClient.invalidateQueries({ queryKey: ["quotation", quotationId, "documents"] });
    queryClient.invalidateQueries({ queryKey: ["events"] });
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
    if (updated?.id) queryClient.invalidateQueries({ queryKey: ["quotation", updated.id] });
  };

  const send = useMutation({
    mutationFn: () => quotationApi.send(quotationId!),
    onSuccess: () => afterMutation("Quotation marked as sent.")({}),
  });

  const accept = useMutation({
    mutationFn: () =>
      quotationApi.accept(quotationId!, {
        acceptedByName,
        acceptanceNote: acceptNote || undefined,
        createEvent: true,
        overrideExpired,
      }),
    onSuccess: (result) => {
      afterMutation(
        result.event
          ? `Accepted — linked to event ${result.event.eventName}.`
          : "Accepted. The linked event was updated."
      )({});
    },
  });

  const reject = useMutation({
    mutationFn: (reason: string) => quotationApi.reject(quotationId!, reason),
    onSuccess: () => afterMutation("Quotation marked as rejected.")({}),
  });

  const cancel = useMutation({
    mutationFn: () => quotationApi.cancel(quotationId!),
    onSuccess: () => afterMutation("Quotation cancelled.")({}),
  });

  const convert = useMutation({
    mutationFn: () => quotationApi.convertToEvent(quotationId!, {}),
    onSuccess: (result) => afterMutation(`Event ${result.event.eventName} created.`)({}),
  });

  const generatePdf = useMutation({
    mutationFn: () => quotationApi.generatePdf(quotationId!),
    onSuccess: (document) => {
      setNotice(`PDF generated: ${document.fileName}`);
      queryClient.invalidateQueries({ queryKey: ["quotation", quotationId, "documents"] });
      queryClient.invalidateQueries({ queryKey: ["quotation", quotationId] });
    },
  });

  const raiseInvoice = useMutation({
    mutationFn: () => invoiceApi.createFromQuotation({ quotationId: quotationId! }),
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      navigate(`/admin/invoices/${invoice.id}`);
    },
  });

  if (quotation.isLoading) return <LoadingRows rows={10} columns={4} />;
  if (quotation.isError || !quotation.data) {
    return <RetryState message="That quotation could not be loaded." onRetry={() => quotation.refetch()} />;
  }

  const q = quotation.data;
  const actionError =
    send.error || accept.error || reject.error || cancel.error || convert.error || generatePdf.error || raiseInvoice.error;

  return (
    <>
      <AdminSeo title={`Quotation ${q.quotationNumber}`} />
      <PageHeading
        eyebrow={`Quotation · version ${q.version}`}
        title={q.quotationNumber}
        description={`${q.customer?.name ?? "No customer"} · issued ${formatDate(q.issueDate)}`}
        actions={
          <Link to="/admin/quotations" className="btn-outline">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All quotations
          </Link>
        }
      />

      {notice && <div className="mt-5"><SuccessNotice message={notice} /></div>}
      {actionError && (
        <div className="mt-5">
          <FormError message={(actionError as Error).message || "That action could not be completed."} />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Panel title="Pricing">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[38rem] text-sm">
                <thead>
                  <tr className="border-b border-forest/10">
                    {["Description", "Qty", "Unit price", "Disc", "Tax", "Total"].map((heading) => (
                      <th
                        key={heading}
                        className="px-5 py-3 text-left font-sans text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-forest/5">
                  {q.lineItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-3.5">
                        <p className="text-charcoal">{item.description}</p>
                        <p className="text-[11px] text-charcoal-muted">
                          {LINE_ITEM_CATEGORY_LABELS[item.category as LineItemCategory] ?? item.category}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-charcoal-muted">
                        {item.quantity} {unitLabel(item.unit)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-charcoal">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-5 py-3.5 text-right text-charcoal-muted">
                        {item.discountPercent ? `${item.discountPercent}%` : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-right text-charcoal-muted">
                        {item.taxPercent ? `${item.taxPercent}%` : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-forest">
                        {formatCurrency(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <dl className="space-y-1.5 border-t border-forest/10 px-5 py-4 text-sm lg:ml-auto lg:max-w-xs">
              <div className="flex justify-between">
                <dt className="text-charcoal-muted">Subtotal</dt>
                <dd className="text-charcoal">{formatCurrency(q.totals.subtotal)}</dd>
              </div>
              {q.totals.discountAmount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-charcoal-muted">Discount</dt>
                  <dd className="text-charcoal">− {formatCurrency(q.totals.discountAmount)}</dd>
                </div>
              )}
              {q.totals.taxAmount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-charcoal-muted">Tax</dt>
                  <dd className="text-charcoal">{formatCurrency(q.totals.taxAmount)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-forest/10 pt-2">
                <dt className="font-medium text-forest">Grand total</dt>
                <dd className="font-serif text-xl font-medium text-forest">
                  {formatCurrency(q.totals.grandTotal)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-charcoal-muted">Advance required</dt>
                <dd className="text-charcoal">{formatCurrency(q.totals.advanceRequired)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-charcoal-muted">Balance</dt>
                <dd className="text-charcoal">{formatCurrency(q.totals.balance)}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Version history" description="A sent quotation is never overwritten — each revision is kept.">
            {q.versions.length === 0 ? (
              <EmptyState title="No revisions yet" description="This is the first version of the quotation." />
            ) : (
              <ul className="divide-y divide-forest/5">
                {[...q.versions].reverse().map((version) => (
                  <li key={version.version} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 text-sm">
                    <div>
                      <p className="text-forest">
                        Version {version.version}
                        {version.version === q.version && (
                          <span className="ml-2 text-[10px] uppercase tracking-widest2 text-gold-deep">current</span>
                        )}
                      </p>
                      <p className="text-[11px] text-charcoal-muted">
                        {formatDateTime(version.createdAt)} · {version.createdByName || "Unknown"}
                      </p>
                      {version.changeNote && (
                        <p className="mt-1 text-[11px] text-charcoal">{version.changeNote}</p>
                      )}
                    </div>
                    <span className="text-charcoal-muted">{formatCurrency(version.totals.grandTotal)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Documents">
            <div className="space-y-3 p-5">
              {documents.data && documents.data.length > 0 ? (
                <ul className="divide-y divide-forest/5 border border-forest/10">
                  {documents.data.map((document) => (
                    <li key={document.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                      <span className="flex items-center gap-2 text-charcoal">
                        <FileText className="h-4 w-4 text-gold-deep" aria-hidden="true" />
                        {document.fileName}
                        <span className="text-[11px] text-charcoal-muted">
                          {Math.round(document.sizeBytes / 1024)} KB · {formatDate(document.createdAt)}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="btn-outline !px-4 !py-1.5 !text-[10px]"
                        onClick={() => documentApi.download(document.id, document.fileName)}
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" /> Download
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-charcoal-muted">
                  No PDF has been generated for this quotation yet.
                </p>
              )}

              <button
                type="button"
                className="btn-solid !px-4 !py-2 !text-[11px]"
                disabled={generatePdf.isPending}
                onClick={() => generatePdf.mutate()}
              >
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                {generatePdf.isPending ? "Generating…" : "Generate PDF"}
              </button>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Status">
            <div className="space-y-4 p-5">
              <QuotationStatusPill status={q.status} />

              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-charcoal-muted">Valid until</dt>
                  <dd className="text-charcoal">{formatDate(q.validUntil)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-charcoal-muted">Event date</dt>
                  <dd className="text-charcoal">{formatDate(q.eventDate)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-charcoal-muted">Venue</dt>
                  <dd className="text-right text-charcoal">{q.venue || "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-charcoal-muted">Guests</dt>
                  <dd className="text-charcoal">{q.guestCount ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-charcoal-muted">Created by</dt>
                  <dd className="text-charcoal">{q.createdBy?.name ?? "—"}</dd>
                </div>
              </dl>

              {q.isExpired && q.status !== "EXPIRED" && q.status !== "ACCEPTED" && (
                <p className="border border-red-900/20 bg-red-50/60 px-3 py-2 text-[11px] text-red-900">
                  This quotation is past its validity date ({formatDate(q.validUntil)}). Confirm with the customer
                  before accepting it.
                </p>
              )}
            </div>
          </Panel>

          {q.event && (
            <Panel title="Linked event">
              <div className="p-5 text-sm">
                <Link to={`/admin/events/${q.event.id}`} className="font-medium text-forest hover:underline">
                  {q.event.eventName}
                </Link>
                <p className="mt-1 text-[11px] text-charcoal-muted">
                  This quotation has already been converted — no second event will be created.
                </p>
              </div>
            </Panel>
          )}

          {canWrite && (
            <Panel title="Actions">
              <div className="flex flex-col gap-3 p-5">
                {q.status === "DRAFT" && (
                  <button
                    type="button"
                    className="btn-solid !py-2 !text-[11px]"
                    disabled={send.isPending}
                    onClick={() => send.mutate()}
                  >
                    <Send className="h-3.5 w-3.5" aria-hidden="true" />
                    {send.isPending ? "Marking…" : "Mark as sent"}
                  </button>
                )}

                <Link to={`/admin/quotations/${q.id}/edit`} className="btn-outline !py-2 !text-[11px]">
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                </Link>

                {(q.status === "SENT" || q.status === "NEGOTIATION" || q.status === "DRAFT") && (
                  <button
                    type="button"
                    className="btn-outline !py-2 !text-[11px]"
                    onClick={() => setShowAccept((open) => !open)}
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden="true" /> Record acceptance
                  </button>
                )}

                {!q.event && (q.status === "ACCEPTED" || q.status === "SENT" || q.status === "NEGOTIATION") && (
                  <button
                    type="button"
                    className="btn-outline !py-2 !text-[11px]"
                    disabled={convert.isPending}
                    onClick={() => convert.mutate()}
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    {convert.isPending ? "Creating…" : "Convert to event"}
                  </button>
                )}

                {canInvoice && (
                  <button
                    type="button"
                    className="btn-outline !py-2 !text-[11px]"
                    disabled={raiseInvoice.isPending}
                    onClick={() => raiseInvoice.mutate()}
                  >
                    <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                    {raiseInvoice.isPending ? "Raising…" : "Raise invoice"}
                  </button>
                )}

                {q.status !== "REJECTED" && q.status !== "CANCELLED" && (
                  <>
                    <button
                      type="button"
                      className="btn-outline !py-2 !text-[11px]"
                      onClick={() => {
                        const reason = window.prompt("Why was this quotation rejected?");
                        if (reason) reject.mutate(reason);
                      }}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" /> Mark rejected
                    </button>
                    <button
                      type="button"
                      className="btn-outline !py-2 !text-[11px]"
                      onClick={() => {
                        if (window.confirm(`Cancel quotation ${q.quotationNumber}? It stays on record as cancelled.`)) {
                          cancel.mutate();
                        }
                      }}
                    >
                      <Ban className="h-3.5 w-3.5" aria-hidden="true" /> Cancel quotation
                    </button>
                  </>
                )}
              </div>
            </Panel>
          )}

          {showAccept && canWrite && (
            <Panel title="Acceptance details">
              <form
                className="space-y-4 p-5"
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  accept.mutate();
                }}
              >
                <p className="text-[11px] text-charcoal-muted">
                  Recorded against the customer's word — there is no e-signature requirement in this system.
                </p>
                <label>
                  <span className={adminLabelClass}>Accepted by (customer) *</span>
                  <input
                    required
                    value={acceptedByName}
                    onChange={(event) => setAcceptedByName(event.target.value)}
                    placeholder="Name of the person who confirmed"
                    className={`${adminInputClass} mt-2`}
                  />
                </label>
                <label>
                  <span className={adminLabelClass}>Notes</span>
                  <textarea
                    rows={2}
                    value={acceptNote}
                    onChange={(event) => setAcceptNote(event.target.value)}
                    className={`${adminInputClass} mt-2`}
                  />
                </label>

                {q.isExpired && (
                  <label className="flex items-start gap-2 text-[11px] text-charcoal">
                    <input
                      type="checkbox"
                      checked={overrideExpired}
                      onChange={(event) => setOverrideExpired(event.target.checked)}
                      className="mt-0.5"
                    />
                    I have confirmed the customer still accepts this lapsed quotation.
                  </label>
                )}

                <button
                  type="submit"
                  className="btn-solid w-full !py-2 !text-[11px]"
                  disabled={accept.isPending || acceptedByName.trim().length < 2 || (q.isExpired && !overrideExpired)}
                >
                  {accept.isPending ? "Recording…" : "Confirm acceptance"}
                </button>
              </form>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
