import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";
import {
  BOOKING_EVENT_TYPE_VALUES,
  BOOKING_STATUSES,
  PAYMENT_STATUS_VALUES,
  TEAM_ROLE_VALUES,
  VENDOR_ASSIGNMENT_STATUSES,
  VENDOR_TYPE_VALUES,
} from "@bandhan/shared";

/**
 * ---------------------------------------------------------------------------
 * EVENT / BOOKING
 * ---------------------------------------------------------------------------
 * One record per confirmed or potential booking. Links to a Customer and
 * optionally to a Lead that generated the enquiry.
 *
 * Financials (amountReceived, directExpenses, grossProfit) are computed from
 * the existing Payment and Expense collections — never stored redundantly.
 */

const eventServiceItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    quantity: { type: Number, int: true, min: 1, default: 1 },
    unitPrice: { type: Number, min: 0, required: true },
    estimatedCost: { type: Number, min: 0, default: 0 },
    vendor: { type: String, trim: true, maxlength: 100, default: null },
    notes: { type: String, trim: true, maxlength: 300, default: "" },
  },
  { _id: false }
);

/**
 * Catering detail for one assignment. Kept next to the assignment rather than
 * on the vendor, because guest count and the agreed plate rate are properties
 * of this job, not of the caterer.
 */
const assignmentCatererSchema = new Schema(
  {
    guestCount: { type: Number, min: 1, max: 100000, default: null },
    packageName: { type: String, trim: true, maxlength: 120, default: "" },
    pricePerPlate: { type: Number, min: 0, default: 0 },
    cuisine: { type: String, trim: true, maxlength: 200, default: "" },
    dietaryNotes: { type: String, trim: true, maxlength: 600, default: "" },
    setupTime: { type: String, trim: true, maxlength: 5, default: "" },
    servingTime: { type: String, trim: true, maxlength: 5, default: "" },
    cleanupTime: { type: String, trim: true, maxlength: 5, default: "" },
    specialInstructions: { type: String, trim: true, maxlength: 1000, default: "" },
  },
  { _id: false }
);

/**
 * One vendor working one event.
 *
 * `_id` is enabled deliberately: it is the stable identifier the dashboard, the
 * vendor payment records and the Google Sheets row mapping all use to refer to
 * "this vendor, on this event". Without it a payment could only be matched back
 * by (vendor, event), which breaks the moment a vendor is booked twice for the
 * same event in two roles.
 *
 * `paymentStatus` is NOT stored. It is derived from the VendorPayment records
 * on every read, so it can never disagree with the money actually paid.
 */
const eventVendorSchema = new Schema(
  {
    vendor: { type: Schema.Types.ObjectId, ref: "Vendor", required: true },
    /** The role played on this event — usually the vendor's own type. */
    role: { type: String, enum: VENDOR_TYPE_VALUES, default: "other" },
    service: { type: String, trim: true, maxlength: 160, default: "" },

    /** Vendor's own quote, before negotiation. */
    estimatedCost: { type: Number, min: 0, default: 0 },
    /** Figure agreed in conversation. */
    negotiatedCost: { type: Number, min: 0, default: 0 },
    /** What we actually pay — this is what flows into event expenses. */
    agreedCost: { type: Number, min: 0, default: 0 },
    quantity: { type: Number, min: 0, default: 1 },

    contactPerson: { type: String, trim: true, maxlength: 120, default: "" },
    contactPhone: { type: String, trim: true, maxlength: 20, default: "" },

    status: {
      type: String,
      enum: VENDOR_ASSIGNMENT_STATUSES,
      default: "PLANNED",
    },
    startTime: { type: String, trim: true, maxlength: 5, default: "" },
    endTime: { type: String, trim: true, maxlength: 5, default: "" },
    notes: { type: String, trim: true, maxlength: 1000, default: "" },

    caterer: { type: assignmentCatererSchema, default: () => ({}) },

    /** The Expense row this cost is represented by, so edits update it. */
    expense: { type: Schema.Types.ObjectId, ref: "Expense", default: null },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { _id: true, timestamps: true }
);

const eventTeamMemberSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: TEAM_ROLE_VALUES, required: true },
    notes: { type: String, trim: true, maxlength: 200, default: "" },
  },
  { _id: false }
);

const eventNoteSchema = new Schema(
  {
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    author: { type: Schema.Types.ObjectId, ref: "User", default: null },
    authorName: { type: String, required: true, trim: true, maxlength: 80 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, _id: true }
);

const eventSchema = new Schema(
  {
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    lead: { type: Schema.Types.ObjectId, ref: "Lead", default: null },
    /** The accepted quotation this booking came from, when there is one. */
    quotation: { type: Schema.Types.ObjectId, ref: "Quotation", default: null, index: true },

    eventName: { type: String, required: true, trim: true, maxlength: 200 },
    eventType: { type: String, enum: BOOKING_EVENT_TYPE_VALUES, required: true, index: true },
    eventDate: { type: Date, required: true, index: true },
    startTime: { type: String, trim: true, maxlength: 5, default: "" },
    endTime: { type: String, trim: true, maxlength: 5, default: "" },

    venue: { type: String, trim: true, maxlength: 200, default: "" },
    venueAddress: { type: String, trim: true, maxlength: 500, default: "" },
    guestCount: { type: Number, min: 1, max: 10000, default: null },

    packageName: { type: String, trim: true, maxlength: 200, default: "" },
    services: { type: [eventServiceItemSchema], default: [] },
    contractAmount: { type: Number, min: 0, required: true },
    paymentTerms: { type: String, trim: true, maxlength: 500, default: "" },

    vendors: { type: [eventVendorSchema], default: [] },
    team: { type: [eventTeamMemberSchema], default: [] },

    notes: { type: String, trim: true, maxlength: 2000, default: "" },
    internalNotes: { type: String, trim: true, maxlength: 2000, default: "" },

    status: {
      type: String,
      enum: BOOKING_STATUSES,
      default: "ENQUIRY",
      required: true,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUS_VALUES,
      default: "UNPAID",
      required: true,
      index: true,
    },

    eventNotes: { type: [eventNoteSchema], default: [] },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },

    /** Google Sheets row tracking. */
    sheetRowId: { type: String, default: null },

    archivedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Indexes ──────────────────────────────────────────────────────────────────

eventSchema.index({ createdAt: -1 });
eventSchema.index({ eventDate: -1 });
eventSchema.index({ status: 1, eventDate: -1 });
eventSchema.index({ customer: 1, eventDate: -1 });
eventSchema.index({ eventType: 1, eventDate: -1 });
eventSchema.index({ archivedAt: 1 });
// Vendor lookups: "which events is this vendor on" and "what is on this date".
eventSchema.index({ "vendors.vendor": 1, eventDate: -1 });
eventSchema.index({ "vendors._id": 1 });

// ── Text search ──────────────────────────────────────────────────────────────

eventSchema.index({ eventName: "text", venue: "text" });

export type EventDocument = HydratedDocument<InferSchemaType<typeof eventSchema>>;

export const Event = model("Event", eventSchema);
