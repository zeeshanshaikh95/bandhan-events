/**
 * Quotation & invoice vocabulary shared by the API and the dashboard.
 * Values are stable slugs; labels are display-only.
 */

// ── Quotation status ─────────────────────────────────────────────────────────

export const QUOTATION_STATUSES = [
  "DRAFT",
  "SENT",
  "NEGOTIATION",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
] as const;

export type QuotationStatus = (typeof QUOTATION_STATUSES)[number];

export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  NEGOTIATION: "Negotiation",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

/** Statuses in which the quotation's contents may no longer be edited in place. */
export const QUOTATION_LOCKED_STATUSES: readonly QuotationStatus[] = [
  "SENT",
  "NEGOTIATION",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
];

// ── Invoice status ───────────────────────────────────────────────────────────

export const INVOICE_STATUSES = [
  "DRAFT",
  "ISSUED",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "VOID",
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  ISSUED: "Issued",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  VOID: "Void",
};

// ── Line items ───────────────────────────────────────────────────────────────

/**
 * Line-item categories for a quotation or invoice. The owners may add more
 * later; `custom` exists so a one-off service never blocks a quotation.
 */
export const LINE_ITEM_CATEGORIES = [
  { value: "stage-decoration", label: "Stage Decoration" },
  { value: "floral-decoration", label: "Floral Decoration" },
  { value: "lighting", label: "Lighting" },
  { value: "entrance-decoration", label: "Entrance Decoration" },
  { value: "mandap", label: "Mandap" },
  { value: "furniture", label: "Sofa / Furniture" },
  { value: "catering", label: "Catering" },
  { value: "photography", label: "Photography" },
  { value: "videography", label: "Videography" },
  { value: "dj", label: "DJ" },
  { value: "sound", label: "Sound" },
  { value: "event-management", label: "Event Management" },
  { value: "custom", label: "Custom Service" },
] as const;

export type LineItemCategory = (typeof LINE_ITEM_CATEGORIES)[number]["value"];
export const LINE_ITEM_CATEGORY_VALUES = LINE_ITEM_CATEGORIES.map((c) => c.value) as [
  LineItemCategory,
  ...LineItemCategory[],
];

/** Short display labels, used in PDFs and tables. */
export const LINE_ITEM_CATEGORY_LABELS: Record<LineItemCategory, string> =
  Object.fromEntries(LINE_ITEM_CATEGORIES.map((c) => [c.value, c.label])) as Record<
    LineItemCategory,
    string
  >;

export const LINE_ITEM_UNITS = [
  { value: "lump-sum", label: "Lump sum" },
  { value: "piece", label: "Piece" },
  { value: "set", label: "Set" },
  { value: "sqft", label: "Sq. ft." },
  { value: "running-ft", label: "Running ft." },
  { value: "person", label: "Person" },
  { value: "plate", label: "Plate" },
  { value: "day", label: "Day" },
  { value: "hour", label: "Hour" },
] as const;

export type LineItemUnit = (typeof LINE_ITEM_UNITS)[number]["value"];
export const LINE_ITEM_UNIT_VALUES = LINE_ITEM_UNITS.map((u) => u.value) as [
  LineItemUnit,
  ...LineItemUnit[],
];

// ── Document kinds ───────────────────────────────────────────────────────────

export const DOCUMENT_KINDS = ["quotation", "invoice", "receipt", "vendor"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];
