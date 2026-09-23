import type { DocumentKind, InvoiceStatus, LineItemCategory, LineItemUnit, QuotationStatus } from "./quotationConstants";

/**
 * DTO shapes returned by the API. Every monetary value here is in **rupees**
 * with up to two decimals — the storage layer keeps integer paise, and the
 * service converts at the boundary so the UI never sees a float artefact.
 */

export interface CustomerDto {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LineItemDto {
  id: string;
  category: LineItemCategory | string;
  description: string;
  quantity: number;
  unit: LineItemUnit | string;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  lineTotal: number;
}

/** Totals block, always recomputed server-side. */
export interface PricingTotals {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  advanceRequired: number;
  balance: number;
}

export interface QuotationVersionDto {
  version: number;
  createdAt: string;
  createdByName: string;
  changeNote: string;
  totals: PricingTotals;
  lineItemCount: number;
}

export interface QuotationDto {
  id: string;
  quotationNumber: string;
  version: number;

  customer: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    address?: string | null;
  } | null;
  lead: { id: string; name: string } | null;
  event: { id: string; eventName: string; eventDate?: string } | null;

  issueDate: string;
  validUntil: string | null;

  status: QuotationStatus;
  /** Derived: a still-open quotation whose validity date has passed. */
  isExpired: boolean;

  eventType: string;
  eventDate: string | null;
  venue: string;
  venueAddress: string;
  guestCount: number | null;

  packageName: string;
  lineItems: LineItemDto[];
  totals: PricingTotals;
  paymentTerms: string;
  notes: string;
  termsAndConditions: string;

  acceptedAt: string | null;
  acceptedByName: string | null;
  acceptanceNote: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  sentAt: string | null;

  pdfDocumentId: string | null;
  versionCount: number;
  versions: QuotationVersionDto[];

  createdBy: { id: string; name: string } | null;
  updatedBy: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceDto {
  id: string;
  invoiceNumber: string;

  customer: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    address?: string | null;
  } | null;
  event: { id: string; eventName: string; eventDate?: string } | null;
  quotation: { id: string; quotationNumber: string } | null;

  issueDate: string;
  dueDate: string | null;

  lineItems: LineItemDto[];
  totals: PricingTotals;

  /** Live figures, computed from the existing Payment collection. */
  amountPaid: number;
  outstanding: number;
  /** Derived: `OVERDUE` once the due date passes with a balance outstanding. */
  isOverdue: boolean;
  /** Derived from amountPaid against grandTotal, independent of stored status. */
  derivedStatus: InvoiceStatus;

  status: InvoiceStatus;
  notes: string;
  termsAndConditions: string;

  issuedAt: string | null;
  voidedAt: string | null;
  voidReason: string | null;

  pdfDocumentId: string | null;

  createdBy: { id: string; name: string } | null;
  updatedBy: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentDto {
  id: string;
  kind: DocumentKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  /** Authenticated API path — never a raw storage URL. */
  downloadUrl: string;
  createdAt: string;
}

/** Pipeline counters for the quotations/invoices area. */
export interface CommercialSummary {
  quotations: Record<QuotationStatus, number>;
  invoices: Record<InvoiceStatus, number>;
  outstandingTotal: number;
  overdueTotal: number;
  acceptedValue: number;
}
