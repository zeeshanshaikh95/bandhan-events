import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, Download, FileText, Receipt, Send, TriangleAlert } from "lucide-react";
import { LINE_ITEM_CATEGORY_LABELS, LINE_ITEM_UNITS, type LineItemCategory } from "@bandhan/shared";
import { documentApi, invoiceApi } from "@/services/api";
import { formatCurrency } from "@/utils/formatCurrency";
import { InvoiceStatusPill } from "@/components/admin/DocumentStatus";
import {
  AdminSeo,
  EmptyState,
  FormError,
  LoadingRows,
  PageHeading,
  Panel,
  RetryState,
  SuccessNotice,
  formatDate,
} from "@/components/admin/AdminUI";
import { useAuth } from "@/providers/AuthProvider";

const unitLabel = (value: string) => LINE_ITEM_UNITS.find((entry) => entry.value === value)?.label ?? value;

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI",
  BANK_TRANSFER: "Bank transfer",
  CARD: "Card",
  CHEQUE: "Cheque",
  OTHER: "Other",
};

export default function AdminInvoiceDetailPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const canWrite = can("invoices:write");
  const canReadPayments = can("payments:read");

  const [notice, setNotice] = useState<string | null>(null);

  const invoice = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => invoiceApi.get(invoiceId!),
    enabled: Boolean(invoiceId),
  });

  const documents = useQuery({
    queryKey: ["invoice", invoiceId, "documents"],
    queryFn: () => invoiceApi.documents(invoiceId!),
    enabled: Boolean(invoiceId) && Boolean(invoice.data),
  });

  const payments = useQuery({
    queryKey: ["invoice", invoiceId, "payments"],
    queryFn: () => invoiceApi.payments(invoiceId!),
    enabled: Boolean(invoiceId) && Boolean(invoice.data) && canReadPayments,
  });

  const refresh = (message: string) => {
    setNotice(message);
    queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
    queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId, "documents"] });
    queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId, "payments"] });
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
  };

  const issue = useMutation({ mutationFn: () => invoiceApi.issue(invoiceId!), onSuccess: () => refresh("Invoice issued.") });

  const voidInvoice = useMutation({
    mutationFn: (reason: string) => invoiceApi.void(invoiceId!, reason),
    onSuccess: () => refresh("Invoice voided. It stays on record with its reason."),
  });

  const generatePdf = useMutation({
    mutationFn: () => invoiceApi.generatePdf(invoiceId!),
    onSuccess: (document) => refresh(`PDF generated: ${document.fileName}`),
  });

  const generateReceipt = useMutation({
    mutationFn: (paymentId: string) => invoiceApi.generateReceipt(invoiceId!, paymentId),
    onSuccess: (document) => refresh(`Receipt ${document.receiptNumber} generated.`),
  });

  if (invoice.isLoading) return <LoadingRows rows={10} columns={4} />;
  if (invoice.isError || !invoice.data) {
    return <RetryState message="That invoice could not be loaded." onRetry={() => invoice.refetch()} />;
  }

  const inv = invoice.data;
  const actionError = issue.error || voidInvoice.error || generatePdf.error || generateReceipt.error;

  return (
    <>
      <AdminSeo title={`Invoice ${inv.invoiceNumber}`} />
      <PageHeading
        eyebrow="Invoice"
        title={inv.invoiceNumber}
        description={`${inv.customer?.name ?? "No customer"} · issued ${formatDate(inv.issueDate)} · due ${formatDate(inv.dueDate)}`}
        actions={
          <Link to="/admin/invoices" className="btn-outline">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All invoices
          </Link>
        }
      />

      {notice && <div className="mt-5"><SuccessNotice message={notice} /></div>}
      {actionError && (
        <div className="mt-5">
          <FormError message={(actionError as Error).message || "That action could not be completed."} />
        </div>
      )}

      {inv.isOverdue && inv.status !== "VOID" && (
        <p className="mt-5 flex items-start gap-2 border border-red-900/20 bg-red-50/60 px-4 py-3 text-sm text-red-900">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          This invoice is past its due date with {formatCurrency(inv.outstanding)} still outstanding.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Panel title="Billed items">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
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
                  {inv.lineItems.map((item) => (
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
                <dd className="text-charcoal">{formatCurrency(inv.totals.subtotal)}</dd>
              </div>
              {inv.totals.discountAmount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-charcoal-muted">Discount</dt>
                  <dd className="text-charcoal">− {formatCurrency(inv.totals.discountAmount)}</dd>
                </div>
              )}
              {inv.totals.taxAmount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-charcoal-muted">Tax</dt>
                  <dd className="text-charcoal">{formatCurrency(inv.totals.taxAmount)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-forest/10 pt-2">
                <dt className="font-medium text-forest">Invoice total</dt>
                <dd className="font-serif text-xl font-medium text-forest">{formatCurrency(inv.totals.grandTotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-charcoal-muted">Amount paid</dt>
                <dd className="text-charcoal">{formatCurrency(inv.amountPaid)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-forest">Outstanding</dt>
                <dd className="font-medium text-forest">{formatCurrency(inv.outstanding)}</dd>
              </div>
            </dl>
          </Panel>

          {canReadPayments && (
            <Panel title="Payments received" description="Recorded in the finance module — this list only reads them back.">
              {payments.isLoading ? (
                <LoadingRows rows={3} columns={4} />
              ) : payments.isError ? (
                <RetryState message="Payments could not be loaded." onRetry={() => payments.refetch()} />
              ) : !payments.data || payments.data.length === 0 ? (
                <EmptyState
                  title="No payments recorded"
                  description="Record a payment against this invoice from Payments, then its receipt can be generated here."
                />
              ) : (
                <ul className="divide-y divide-forest/5">
                  {payments.data.map((payment) => (
                    <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-sm">
                      <div>
                        <p className="text-charcoal">
                          {formatCurrency(payment.amount)} · {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
                        </p>
                        <p className="text-[11px] text-charcoal-muted">
                          {formatDate(payment.paymentDate)}
                          {payment.reference ? ` · ref ${payment.reference}` : ""}
                          {payment.status !== "RECEIVED" ? ` · ${payment.status.toLowerCase()}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn-outline !px-4 !py-1.5 !text-[10px]"
                        disabled={payment.status !== "RECEIVED" || generateReceipt.isPending}
                        onClick={() => generateReceipt.mutate(payment.id)}
                      >
                        <Receipt className="h-3.5 w-3.5" aria-hidden="true" /> Receipt
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}

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
                <p className="text-sm text-charcoal-muted">No PDF has been generated for this invoice yet.</p>
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
              <InvoiceStatusPill status={inv.derivedStatus} />

              <dl className="space-y-2 text-sm">
                {inv.quotation && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-charcoal-muted">Quotation</dt>
                    <dd>
                      <Link to={`/admin/quotations/${inv.quotation.id}`} className="text-forest hover:underline">
                        {inv.quotation.quotationNumber}
                      </Link>
                    </dd>
                  </div>
                )}
                {inv.event && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-charcoal-muted">Event</dt>
                    <dd>
                      <Link to={`/admin/events/${inv.event.id}`} className="text-forest hover:underline">
                        {inv.event.eventName}
                      </Link>
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt className="text-charcoal-muted">Due date</dt>
                  <dd className="text-charcoal">{formatDate(inv.dueDate)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-charcoal-muted">Created by</dt>
                  <dd className="text-charcoal">{inv.createdBy?.name ?? "—"}</dd>
                </div>
                {inv.voidReason && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-charcoal-muted">Void reason</dt>
                    <dd className="text-right text-charcoal">{inv.voidReason}</dd>
                  </div>
                )}
              </dl>

              {inv.status === "DRAFT" && (
                <p className="border border-gold/40 bg-gold/5 px-3 py-2 text-[11px] text-gold-deep">
                  This invoice is still a draft. Issue it once the customer should be billed.
                </p>
              )}
            </div>
          </Panel>

          <Panel title="Customer">
            <div className="space-y-1.5 p-5 text-sm">
              <p className="text-charcoal">{inv.customer?.name ?? "—"}</p>
              <p className="text-charcoal-muted">{inv.customer?.phone ?? "—"}</p>
              {inv.customer?.email && <p className="text-charcoal-muted">{inv.customer.email}</p>}
              {inv.customer?.address && <p className="text-charcoal-muted">{inv.customer.address}</p>}
              {inv.customer && (
                <Link
                  to={`/admin/invoices?customer=${inv.customer.id}`}
                  className="mt-2 inline-block text-[11px] text-forest hover:underline"
                >
                  All invoices for this customer
                </Link>
              )}
            </div>
          </Panel>

          {canWrite && inv.status !== "VOID" && (
            <Panel title="Actions">
              <div className="flex flex-col gap-3 p-5">
                {inv.status === "DRAFT" && (
                  <button
                    type="button"
                    className="btn-solid !py-2 !text-[11px]"
                    disabled={issue.isPending}
                    onClick={() => issue.mutate()}
                  >
                    <Send className="h-3.5 w-3.5" aria-hidden="true" />
                    {issue.isPending ? "Issuing…" : "Issue invoice"}
                  </button>
                )}
                <button
                  type="button"
                  className="btn-outline !py-2 !text-[11px]"
                  onClick={() => {
                    const reason = window.prompt("Why is this invoice being voided?");
                    if (reason) voidInvoice.mutate(reason);
                  }}
                >
                  <Ban className="h-3.5 w-3.5" aria-hidden="true" /> Void invoice
                </button>
                <p className="text-[10px] text-charcoal-muted">
                  Invoices are never deleted — voiding keeps the number and the audit trail intact.
                </p>
              </div>
            </Panel>
          )}
        </div>
      </div>

      {/* Kept for symmetry with the quotation page: a voided invoice is read-only. */}
      {inv.status === "VOID" && (
        <p className="mt-6 border border-charcoal/15 bg-charcoal/5 px-4 py-3 text-sm text-charcoal-muted">
          This invoice was voided on {formatDate(inv.voidedAt)} and can no longer be changed.
        </p>
      )}

      {!canWrite && (
        <p className="mt-6 text-xs text-charcoal-muted">Your role can read invoices but not change them.</p>
      )}
    </>
  );
}
