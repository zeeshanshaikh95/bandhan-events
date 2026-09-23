import { INVOICE_STATUS_LABELS, QUOTATION_STATUS_LABELS } from "@bandhan/shared";
import { cn } from "@/utils/cn";

/**
 * Status pills for sales documents. Kept apart from the lead `StatusPill`
 * because the two vocabularies overlap but the colour intent does not.
 *
 * Colour carries meaning, not decoration: green means money or agreement,
 * gold means awaiting a decision, grey is inert, red is a problem.
 */

const TONE = {
  agreed: "border-forest/40 bg-forest/10 text-forest",
  pending: "border-gold/50 bg-gold/10 text-gold-deep",
  inert: "border-charcoal/15 bg-charcoal/5 text-charcoal-muted",
  problem: "border-red-900/25 bg-red-50 text-red-900",
} as const;

const QUOTATION_TONE: Record<string, keyof typeof TONE> = {
  DRAFT: "inert",
  SENT: "pending",
  NEGOTIATION: "pending",
  ACCEPTED: "agreed",
  REJECTED: "problem",
  EXPIRED: "inert",
  CANCELLED: "inert",
};

const INVOICE_TONE: Record<string, keyof typeof TONE> = {
  DRAFT: "inert",
  ISSUED: "pending",
  PARTIALLY_PAID: "pending",
  PAID: "agreed",
  OVERDUE: "problem",
  VOID: "inert",
};

export function QuotationStatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap border px-2.5 py-1 font-sans text-[10px] font-semibold uppercase tracking-widest2",
        TONE[QUOTATION_TONE[status] ?? "inert"]
      )}
    >
      {(QUOTATION_STATUS_LABELS as Record<string, string>)[status] ?? status}
    </span>
  );
}

export function InvoiceStatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap border px-2.5 py-1 font-sans text-[10px] font-semibold uppercase tracking-widest2",
        TONE[INVOICE_TONE[status] ?? "inert"]
      )}
    >
      {(INVOICE_STATUS_LABELS as Record<string, string>)[status] ?? status}
    </span>
  );
}
