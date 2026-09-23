import { z } from "zod";
import {
  DIETARY_OPTION_VALUES,
  RATE_BASIS_VALUES,
  VENDOR_ASSIGNMENT_STATUSES,
  VENDOR_PAYMENT_RECORD_STATUSES,
  VENDOR_STATUSES,
  VENDOR_TYPE_VALUES,
} from "../vendorConstants";
import {
  choiceSchema,
  emailSchema,
  objectIdSchema,
  optionalText,
  paginationSchema,
  phoneSchema,
  trimmedString,
} from "./primitives";

/**
 * ---------------------------------------------------------------------------
 * VENDOR INPUT RULES
 * ---------------------------------------------------------------------------
 * Money ceilings mirror the quotation module: `MAX_RUPEES` exists so a
 * misplaced zero is rejected rather than stored, not as a business rule.
 */

export const MAX_VENDOR_RUPEES = 100_000_000;

const rupees = (message = "Enter a valid amount.") =>
  z
    .number({ invalid_type_error: message, required_error: message })
    .finite(message)
    .min(0, "Amount cannot be negative.")
    .max(MAX_VENDOR_RUPEES, "That amount looks too large — please check it.");

const guestCount = () => z.coerce.number().int().min(1).max(100_000).nullish();

/** Phone numbers are optional for a vendor — some are walk-in only. */
const optionalPhone = z
  .union([phoneSchema, z.literal("")])
  .optional()
  .transform((value) => value ?? "");

const optionalEmail = z
  .union([emailSchema, z.literal("")])
  .optional()
  .transform((value) => value ?? "");

const stringList = (max: number, itemMax: number) =>
  z
    .array(z.string().trim().max(itemMax))
    .max(max, `Please keep this to ${max} entries.`)
    .default([]);

// ── Catering sub-documents ───────────────────────────────────────────────────

export const vendorPackageSchema = z.object({
  name: trimmedString(120, 1),
  pricePerPlate: rupees().default(0),
  minimumGuests: guestCount(),
  description: optionalText(600),
  menuItems: stringList(80, 120),
  active: z.boolean().default(true),
});

export type VendorPackageInput = z.infer<typeof vendorPackageSchema>;

export const vendorCatererSchema = z.object({
  cuisines: stringList(20, 60),
  dietaryOptions: z.array(choiceSchema(DIETARY_OPTION_VALUES, "Choose a valid dietary option.")).default([]),
  perPlatePrice: rupees().default(0),
  minimumGuestCount: guestCount(),
  maximumGuestCount: guestCount(),
  staffIncluded: z.boolean().default(true),
  equipmentIncluded: z.boolean().default(false),
  servingStaff: z.coerce.number().int().min(0).max(1000).default(0),
  setupCharges: rupees().default(0),
  deliveryCharges: rupees().default(0),
  additionalCharges: rupees().default(0),
  notes: optionalText(1000),
});

export type VendorCatererInput = z.infer<typeof vendorCatererSchema>;

export const vendorRateInfoSchema = z.object({
  basis: choiceSchema(RATE_BASIS_VALUES, "Choose a rate basis.").default("lump-sum"),
  amount: rupees().default(0),
  notes: optionalText(400),
});

// ── Vendor ───────────────────────────────────────────────────────────────────

export const vendorCreateSchema = z
  .object({
    name: trimmedString(120, 2),
    company: optionalText(160),
    type: choiceSchema(VENDOR_TYPE_VALUES, "Choose a vendor type."),
    category: optionalText(80),
    status: z.enum(VENDOR_STATUSES).default("ACTIVE"),

    contactPerson: optionalText(120),
    phone: optionalPhone,
    whatsapp: optionalPhone,
    email: optionalEmail,

    address: optionalText(400),
    area: optionalText(120),
    city: optionalText(80),

    description: optionalText(1000),
    services: stringList(40, 120),
    rateInfo: vendorRateInfoSchema.default({}),
    notes: optionalText(2000),

    caterer: vendorCatererSchema.default({}),
    packages: z.array(vendorPackageSchema).max(50).default([]),

    /**
     * Duplicate protection: a vendor whose name *and* phone already exist is
     * reported back so the team links the existing record instead of creating
     * a second one.
     */
    confirmDuplicate: z.boolean().default(false),
  })
  .strict();

export const vendorUpdateSchema = vendorCreateSchema.partial();

export const vendorStatusSchema = z.object({
  status: z.enum(VENDOR_STATUSES),
  reason: optionalText(300),
});

export const vendorListQuerySchema = paginationSchema.extend({
  search: trimmedString(80).optional(),
  type: choiceSchema(VENDOR_TYPE_VALUES, "Choose a vendor type.").optional(),
  status: z.enum(VENDOR_STATUSES).optional(),
  city: trimmedString(80).optional(),
  area: trimmedString(120).optional(),
  category: trimmedString(80).optional(),
  /** `true` narrows the picker to vendors who can actually be booked. */
  activeOnly: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  sort: z.enum(["-createdAt", "createdAt", "name", "-name", "type", "city"]).default("name"),
});

export const vendorNoteSchema = z.object({
  body: trimmedString(1000, 2),
});

export const vendorDocumentSchema = z.object({
  fileName: trimmedString(200, 1),
});

// ── Event vendor assignment ──────────────────────────────────────────────────

/**
 * Catering detail for one assignment.
 *
 * No `.default()` here on purpose: this block is patched as well as created, and
 * a default would make an omitted field indistinguishable from a field the
 * operator cleared — turning a one-field edit into a wipe of the rest. The
 * model supplies the defaults on write instead.
 */
export const assignmentCatererSchema = z.object({
  guestCount: guestCount(),
  packageName: optionalText(120),
  pricePerPlate: rupees().optional(),
  cuisine: optionalText(200),
  dietaryNotes: optionalText(600),
  setupTime: z.string().trim().max(5).optional().or(z.literal("")),
  servingTime: z.string().trim().max(5).optional().or(z.literal("")),
  cleanupTime: z.string().trim().max(5).optional().or(z.literal("")),
  specialInstructions: optionalText(1000),
});

export const createVendorAssignmentSchema = z
  .object({
    vendor: objectIdSchema,
    role: optionalText(80),
    service: optionalText(160),

    estimatedCost: rupees().default(0),
    negotiatedCost: rupees().default(0),
    /** Defaults to the negotiated figure when omitted. */
    agreedCost: rupees().optional(),
    quantity: z.coerce.number().finite().min(0).max(100_000).default(1),

    status: z.enum(VENDOR_ASSIGNMENT_STATUSES).default("PLANNED"),
    startTime: z.string().trim().max(5).optional().or(z.literal("")),
    endTime: z.string().trim().max(5).optional().or(z.literal("")),
    notes: optionalText(1000),
    contactPerson: optionalText(120),
    contactPhone: optionalPhone,

    caterer: assignmentCatererSchema.default({}),
  })
  .strict();

export const updateVendorAssignmentSchema = createVendorAssignmentSchema.partial().omit({ vendor: true });

export const vendorAssignmentStatusSchema = z.object({
  status: z.enum(VENDOR_ASSIGNMENT_STATUSES),
});

// ── Vendor payments (money out) ──────────────────────────────────────────────

export const createVendorPaymentSchema = z
  .object({
    amount: z
      .number({ invalid_type_error: "Enter an amount.", required_error: "Enter an amount." })
      .finite()
      .min(1, "Amount must be at least ₹1")
      .max(MAX_VENDOR_RUPEES, "That amount looks too large — please check it."),
    paymentDate: z.string().trim().min(1, "Payment date is required."),
    method: z.enum(["cash", "upi", "bank-transfer", "card", "cheque", "other"]).default("cash"),
    reference: optionalText(100),
    notes: optionalText(500),
    status: z.enum(VENDOR_PAYMENT_RECORD_STATUSES).default("PAID"),
    /** Defaults to the assignment's agreed cost when omitted. */
    paidAgainst: rupees().optional(),
  })
  .strict();

export const updateVendorPaymentSchema = createVendorPaymentSchema.partial();

export type CreateVendorInput = z.infer<typeof vendorCreateSchema>;
export type UpdateVendorInput = z.infer<typeof vendorUpdateSchema>;
export type VendorListQuery = z.infer<typeof vendorListQuerySchema>;
export type CreateVendorAssignmentInput = z.infer<typeof createVendorAssignmentSchema>;
export type UpdateVendorAssignmentInput = z.infer<typeof updateVendorAssignmentSchema>;
export type CreateVendorPaymentInput = z.infer<typeof createVendorPaymentSchema>;
export type VendorNoteInput = z.infer<typeof vendorNoteSchema>;
