/**
 * Vendor & caterer vocabulary shared by the API and the dashboard.
 *
 * Three separate lifecycles live here and must never be conflated:
 *
 *   VENDOR_STATUSES            — the vendor's standing with the business
 *   VENDOR_ASSIGNMENT_STATUSES — progress of one job on one event
 *   VENDOR_PAYMENT_STATUSES    — derived from the money actually paid out
 *
 * A vendor can be ACTIVE while their assignment on next month's wedding is
 * still PLANNED and unpaid; that is normal, not a contradiction.
 */

// ── Vendor status ────────────────────────────────────────────────────────────

export const VENDOR_STATUSES = ["ACTIVE", "INACTIVE", "BLOCKED"] as const;
export type VendorStatus = (typeof VENDOR_STATUSES)[number];

export const VENDOR_STATUS_LABELS: Record<VendorStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  BLOCKED: "Blocked",
};

// ── Vendor assignment status (per event) ─────────────────────────────────────

export const VENDOR_ASSIGNMENT_STATUSES = [
  "PLANNED",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;
export type VendorAssignmentStatus = (typeof VENDOR_ASSIGNMENT_STATUSES)[number];

export const VENDOR_ASSIGNMENT_STATUS_LABELS: Record<VendorAssignmentStatus, string> = {
  PLANNED: "Planned",
  CONFIRMED: "Confirmed",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

// ── Vendor payment status (derived) ──────────────────────────────────────────

export const VENDOR_PAYMENT_STATUSES = ["UNPAID", "PARTIALLY_PAID", "PAID", "OVERDUE"] as const;
export type VendorPaymentStatus = (typeof VENDOR_PAYMENT_STATUSES)[number];

export const VENDOR_PAYMENT_STATUS_LABELS: Record<VendorPaymentStatus, string> = {
  UNPAID: "Unpaid",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
};

/** Vendor payments are money *out*; these are the states a record can be in. */
export const VENDOR_PAYMENT_RECORD_STATUSES = ["PENDING", "PAID", "REFUNDED"] as const;
export type VendorPaymentRecordStatus = (typeof VENDOR_PAYMENT_RECORD_STATUSES)[number];

export const VENDOR_PAYMENT_RECORD_STATUS_LABELS: Record<VendorPaymentRecordStatus, string> = {
  PENDING: "Scheduled",
  PAID: "Paid out",
  REFUNDED: "Refunded",
};

// ── Vendor types ─────────────────────────────────────────────────────────────

export const VENDOR_TYPES = [
  { value: "decorator", label: "Decorator" },
  { value: "caterer", label: "Caterer" },
  { value: "photographer", label: "Photographer" },
  { value: "videographer", label: "Videographer" },
  { value: "dj", label: "DJ" },
  { value: "sound", label: "Sound" },
  { value: "lighting", label: "Lighting" },
  { value: "florist", label: "Florist" },
  { value: "makeup-artist", label: "Makeup Artist" },
  { value: "mehendi-artist", label: "Mehendi Artist" },
  { value: "furniture", label: "Furniture" },
  { value: "stage", label: "Stage" },
  { value: "venue", label: "Venue" },
  { value: "transport", label: "Transport" },
  { value: "printing", label: "Invitation / Printing" },
  { value: "gifting", label: "Gift Supplier" },
  { value: "entertainment", label: "Entertainment" },
  { value: "other", label: "Other" },
] as const;

export type VendorType = (typeof VENDOR_TYPES)[number]["value"];

export const VENDOR_TYPE_VALUES = VENDOR_TYPES.map((entry) => entry.value) as [
  VendorType,
  ...VendorType[],
];

export const VENDOR_TYPE_LABELS: Record<VendorType, string> =
  Object.fromEntries(VENDOR_TYPES.map((entry) => [entry.value, entry.label])) as Record<
    VendorType,
    string
  >;

export const vendorTypeLabel = (value: string): string =>
  VENDOR_TYPE_LABELS[value as VendorType] ??
  value.replace(/-/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());

// ── Catering specifics ───────────────────────────────────────────────────────

/**
 * Dietary options are flags, not a single choice: a caterer who can do pure
 * vegetarian *and* Jain food is the common case in this market.
 */
export const DIETARY_OPTIONS = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "non-vegetarian", label: "Non-Vegetarian" },
  { value: "jain", label: "Jain" },
  { value: "halal", label: "Halal" },
  { value: "vegan", label: "Vegan" },
  { value: "eggless", label: "Eggless" },
] as const;

export type DietaryOption = (typeof DIETARY_OPTIONS)[number]["value"];

export const DIETARY_OPTION_VALUES = DIETARY_OPTIONS.map((entry) => entry.value) as [
  DietaryOption,
  ...DietaryOption[],
];

export const DIETARY_OPTION_LABELS: Record<DietaryOption, string> =
  Object.fromEntries(DIETARY_OPTIONS.map((entry) => [entry.value, entry.label])) as Record<
    DietaryOption,
    string
  >;

/**
 * How a vendor prices their work. Bandhan Events buys some services per plate,
 * some per day, and some as a single negotiated figure — assuming one model
 * would be wrong.
 */
export const RATE_BASES = [
  { value: "lump-sum", label: "Lump sum" },
  { value: "per-plate", label: "Per plate" },
  { value: "per-day", label: "Per day" },
  { value: "per-person", label: "Per person" },
  { value: "per-hour", label: "Per hour" },
  { value: "per-unit", label: "Per unit" },
] as const;

export type RateBasis = (typeof RATE_BASES)[number]["value"];

export const RATE_BASIS_VALUES = RATE_BASES.map((entry) => entry.value) as [
  RateBasis,
  ...RateBasis[],
];

export const RATE_BASIS_LABELS: Record<RateBasis, string> =
  Object.fromEntries(RATE_BASES.map((entry) => [entry.value, entry.label])) as Record<
    RateBasis,
    string
  >;
