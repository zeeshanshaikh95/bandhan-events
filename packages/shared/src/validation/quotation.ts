import { z } from "zod";
import {
  INVOICE_STATUSES,
  LINE_ITEM_CATEGORY_VALUES,
  LINE_ITEM_UNIT_VALUES,
  QUOTATION_STATUSES,
} from "../quotationConstants";
import { BOOKING_EVENT_TYPE_VALUES } from "../eventConstants";
import {
  choiceSchema,
  dateOnlySchema,
  objectIdSchema,
  optionalText,
  paginationSchema,
  trimmedString,
} from "./primitives";

/**
 * ---------------------------------------------------------------------------
 * MONEY INPUT RULES
 * ---------------------------------------------------------------------------
 * The dashboard sends **rupees**; the service converts to integer paise for
 * storage and arithmetic. Percentages are 0–100 with at most two decimals.
 *
 * `MAX_RUPEES` is a sanity ceiling (₹10 crore) rather than a business rule —
 * it exists so a fat-fingered extra zero is rejected instead of stored.
 */

export const MAX_RUPEES = 100_000_000;

const rupees = (message = "Enter a valid amount.") =>
  z
    .number({ invalid_type_error: message, required_error: message })
    .finite(message)
    .min(0, "Amount cannot be negative.")
    .max(MAX_RUPEES, "That amount looks too large — please check it.");

const percent = () =>
  z.number({ invalid_type_error: "Enter a percentage." }).finite().min(0, "Cannot be negative.").max(100, "Cannot exceed 100%.");

export const lineItemInputSchema = z.object({
  category: choiceSchema(LINE_ITEM_CATEGORY_VALUES, "Choose a category."),
  description: trimmedString(300, 1),
  quantity: z
    .number({ invalid_type_error: "Enter a quantity." })
    .finite()
    .positive("Quantity must be greater than zero.")
    .max(100_000, "That quantity looks too large."),
  unit: choiceSchema(LINE_ITEM_UNIT_VALUES, "Choose a unit.").default("lump-sum"),
  unitPrice: rupees(),
  discountPercent: percent().default(0),
  taxPercent: percent().default(0),
});

export type LineItemInput = z.infer<typeof lineItemInputSchema>;

// ── Quotation ────────────────────────────────────────────────────────────────

export const createQuotationSchema = z
  .object({
    customer: objectIdSchema,
    lead: objectIdSchema.nullish(),
    event: objectIdSchema.nullish(),

    issueDate: dateOnlySchema,
    validUntil: dateOnlySchema,

    /** Denormalised event context — a quotation exists before a booking does. */
    eventType: choiceSchema(BOOKING_EVENT_TYPE_VALUES, "Choose an event type.").optional(),
    eventDate: dateOnlySchema,
    venue: optionalText(200),
    venueAddress: optionalText(500),
    guestCount: z.coerce.number().int().min(1).max(10_000).nullish(),

    packageName: optionalText(200),
    lineItems: z.array(lineItemInputSchema).min(1, "Add at least one line item."),
    advanceRequired: rupees().default(0),
    paymentTerms: optionalText(500),
    notes: optionalText(2000),
    termsAndConditions: optionalText(2000),
  })
  .strict();

export const updateQuotationSchema = z
  .object({
    customer: objectIdSchema.optional(),
    lead: objectIdSchema.nullish(),
    event: objectIdSchema.nullish(),

    issueDate: dateOnlySchema,
    validUntil: dateOnlySchema,

    eventType: choiceSchema(BOOKING_EVENT_TYPE_VALUES, "Choose an event type.").optional(),
    eventDate: dateOnlySchema,
    venue: optionalText(200),
    venueAddress: optionalText(500),
    guestCount: z.coerce.number().int().min(1).max(10_000).nullish(),

    packageName: optionalText(200),
    lineItems: z.array(lineItemInputSchema).min(1, "Add at least one line item.").optional(),
    advanceRequired: rupees().optional(),
    paymentTerms: optionalText(500),
    notes: optionalText(2000),
    termsAndConditions: optionalText(2000),

    /** Required when rewriting a quotation that has already been sent. */
    changeNote: optionalText(300),
  })
  .strict();

export const quotationListQuerySchema = paginationSchema.extend({
  search: trimmedString(80).optional(),
  status: z.enum(QUOTATION_STATUSES).optional(),
  customer: objectIdSchema.optional(),
  event: objectIdSchema.optional(),
  from: dateOnlySchema,
  to: dateOnlySchema,
  sort: z
    .enum(["-createdAt", "createdAt", "-grandTotal", "grandTotal", "validUntil", "issueDate"])
    .default("-createdAt"),
});

export const acceptQuotationSchema = z.object({
  acceptedByName: trimmedString(120, 2),
  acceptanceNote: optionalText(1000),
  /** Create the linked event as part of acceptance. Defaults to true. */
  createEvent: z.boolean().default(true),
  /**
   * A quotation past its validity date is not accepted by accident — the
   * dashboard must state that it knows the offer lapsed.
   */
  overrideExpired: z.boolean().default(false),
});

export const rejectQuotationSchema = z.object({
  reason: trimmedString(500, 1),
});

export const cancelQuotationSchema = z.object({
  reason: optionalText(500),
});

export const convertQuotationSchema = z.object({
  eventName: optionalText(200),
  eventDate: dateOnlySchema,
});

export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;
export type UpdateQuotationInput = z.infer<typeof updateQuotationSchema>;
export type QuotationListQuery = z.infer<typeof quotationListQuerySchema>;
export type AcceptQuotationInput = z.infer<typeof acceptQuotationSchema>;
export type RejectQuotationInput = z.infer<typeof rejectQuotationSchema>;

// ── Invoice ──────────────────────────────────────────────────────────────────

export const createInvoiceSchema = z
  .object({
    customer: objectIdSchema,
    event: objectIdSchema.nullish(),
    quotation: objectIdSchema.nullish(),

    issueDate: dateOnlySchema,
    dueDate: dateOnlySchema,

    lineItems: z.array(lineItemInputSchema).min(1, "Add at least one line item."),
    notes: optionalText(2000),
    termsAndConditions: optionalText(2000),
  })
  .strict();

export const updateInvoiceSchema = z
  .object({
    customer: objectIdSchema.optional(),
    event: objectIdSchema.nullish(),
    quotation: objectIdSchema.nullish(),
    issueDate: dateOnlySchema,
    dueDate: dateOnlySchema,
    lineItems: z.array(lineItemInputSchema).min(1, "Add at least one line item.").optional(),
    notes: optionalText(2000),
    termsAndConditions: optionalText(2000),
  })
  .strict();

export const invoiceListQuerySchema = paginationSchema.extend({
  search: trimmedString(80).optional(),
  status: z.enum(INVOICE_STATUSES).optional(),
  /** `true` narrows to invoices past their due date with a balance. */
  overdue: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  customer: objectIdSchema.optional(),
  event: objectIdSchema.optional(),
  from: dateOnlySchema,
  to: dateOnlySchema,
  sort: z.enum(["-createdAt", "createdAt", "-grandTotal", "grandTotal", "dueDate"]).default("-createdAt"),
});

export const voidInvoiceSchema = z.object({
  reason: trimmedString(500, 1),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type InvoiceListQuery = z.infer<typeof invoiceListQuerySchema>;
