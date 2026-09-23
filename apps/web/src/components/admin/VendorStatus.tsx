import {
  VENDOR_ASSIGNMENT_STATUS_LABELS,
  VENDOR_PAYMENT_STATUS_LABELS,
  VENDOR_STATUS_LABELS,
} from "@bandhan/shared";
import { cn } from "@/utils/cn";

/**
 * Status pills for the vendor module.
 *
 * The three lifecycles are colour-coded by intent so they cannot be confused at
 * a glance: whether a supplier is *available*, whether a *job* is progressing,
 * and whether *money* has moved.
 */

const TONE = {
  available: "border-forest/40 bg-forest/10 text-forest",
  pending: "border-gold/50 bg-gold/10 text-gold-deep",
  inert: "border-charcoal/15 bg-charcoal/5 text-charcoal-muted",
  problem: "border-red-900/25 bg-red-50 text-red-900",
} as const;

const pillClass =
  "inline-block whitespace-nowrap border px-2.5 py-1 font-sans text-[10px] font-semibold uppercase tracking-widest2";

const VENDOR_TONES: Record<string, keyof typeof TONE> = {
  ACTIVE: "available",
  INACTIVE: "inert",
  BLOCKED: "problem",
};

const ASSIGNMENT_TONES: Record<string, keyof typeof TONE> = {
  PLANNED: "pending",
  CONFIRMED: "available",
  IN_PROGRESS: "available",
  COMPLETED: "inert",
  CANCELLED: "problem",
};

const PAYMENT_TONES: Record<string, keyof typeof TONE> = {
  UNPAID: "problem",
  PARTIALLY_PAID: "pending",
  PAID: "available",
  OVERDUE: "problem",
};

export function VendorStatusPill({ status }: { status: string }) {
  return (
    <span className={cn(pillClass, TONE[VENDOR_TONES[status] ?? "inert"])}>
      {(VENDOR_STATUS_LABELS as Record<string, string>)[status] ?? status}
    </span>
  );
}

export function AssignmentStatusPill({ status }: { status: string }) {
  return (
    <span className={cn(pillClass, TONE[ASSIGNMENT_TONES[status] ?? "inert"])}>
      {(VENDOR_ASSIGNMENT_STATUS_LABELS as Record<string, string>)[status] ?? status}
    </span>
  );
}

export function VendorPaymentStatusPill({ status }: { status: string }) {
  return (
    <span className={cn(pillClass, TONE[PAYMENT_TONES[status] ?? "inert"])}>
      {(VENDOR_PAYMENT_STATUS_LABELS as Record<string, string>)[status] ?? status}
    </span>
  );
}
