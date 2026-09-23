import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";
import { VENDOR_PAYMENT_RECORD_STATUSES } from "@bandhan/shared";

/**
 * ---------------------------------------------------------------------------
 * VENDOR PAYMENT  (money going out)
 * ---------------------------------------------------------------------------
 * Deliberately its own collection rather than more fields on `Payment`.
 *
 * `Payment` is money *received*: its records feed revenue, the finance summary
 * and the cash-flow "money in" line, and they feed the invoice outstanding
 * calculation. Adding supplier payments to it would put outflows into a
 * revenue aggregation that every financial figure on the dashboard reads —
 * a single missed `$match` would silently overstate income. Two directions of
 * money with different meanings belong in two collections; `financeService`
 * already anticipated this with its `vendorPayments` cash-flow line.
 *
 * What a vendor payment is NOT is a second accounting system. The *cost* lives
 * on the vendor assignment and is represented in the existing Expense
 * collection, which is what event profit is calculated from. This collection
 * only records money actually leaving the business against that cost.
 */

const PAYMENT_METHODS = ["cash", "upi", "bank-transfer", "card", "cheque", "other"] as const;

const vendorPaymentSchema = new Schema(
  {
    vendor: { type: Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    /** The event this money was paid for, when it relates to one. */
    event: { type: Schema.Types.ObjectId, ref: "Event", default: null, index: true },
    /**
     * The `Event.vendors[]._id` the payment settles. Stored as a string because
     * it identifies a subdocument, not a collection row — so it cannot be a
     * `ref`, and a plain string is the honest representation.
     */
    assignmentId: { type: String, default: null, index: true },
    /** The Expense record representing this assignment's cost. */
    expense: { type: Schema.Types.ObjectId, ref: "Expense", default: null },

    amount: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, required: true, index: true },
    method: { type: String, enum: PAYMENT_METHODS, default: "cash", required: true },
    reference: { type: String, trim: true, maxlength: 100, default: "" },
    notes: { type: String, trim: true, maxlength: 500, default: "" },

    status: {
      type: String,
      enum: VENDOR_PAYMENT_RECORD_STATUSES,
      default: "PAID",
      required: true,
      index: true,
    },

    paidBy: { type: String, trim: true, maxlength: 120, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },

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

vendorPaymentSchema.index({ vendor: 1, paymentDate: -1 });
vendorPaymentSchema.index({ event: 1, vendor: 1 });
vendorPaymentSchema.index({ assignmentId: 1, status: 1 });
vendorPaymentSchema.index({ paymentDate: -1, status: 1 });

export type VendorPaymentDocument = HydratedDocument<InferSchemaType<typeof vendorPaymentSchema>>;

export const VendorPayment = model("VendorPayment", vendorPaymentSchema);

export type VendorPaymentRecordStatus = (typeof VENDOR_PAYMENT_RECORD_STATUSES)[number];
export type VendorPaymentMethod = (typeof PAYMENT_METHODS)[number];
export const VENDOR_PAYMENT_METHOD_VALUES = [...PAYMENT_METHODS];
