import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

/**
 * ---------------------------------------------------------------------------
 * PAYMENT
 * ---------------------------------------------------------------------------
 * Manual payment tracking — no online payment gateway. Each record represents
 * money received from a customer against a booking/event.
 */

const PAYMENT_METHODS = ["cash", "upi", "bank-transfer", "card", "cheque", "other"] as const;
const PAYMENT_STATUSES = ["PENDING", "RECEIVED", "REFUNDED"] as const;

const paymentSchema = new Schema(
  {
    customer: { type: Schema.Types.ObjectId, ref: "Customer", default: null, index: true },
    /** The event this money was received against (the model is named Event). */
    booking: { type: Schema.Types.ObjectId, ref: "Event", default: null, index: true },
    quotation: { type: Schema.Types.ObjectId, ref: "Quotation", default: null },
    /** Set when the payment settles an invoice, so receipts can reference it. */
    invoice: { type: Schema.Types.ObjectId, ref: "Invoice", default: null, index: true },

    amount: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, required: true, index: true },
    method: {
      type: String,
      enum: PAYMENT_METHODS,
      default: "cash",
      required: true,
    },
    reference: { type: String, trim: true, maxlength: 100, default: "" },
    notes: { type: String, trim: true, maxlength: 500, default: "" },

    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "RECEIVED",
      required: true,
      index: true,
    },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },

    /** Google Sheets row tracking — set after first sync. */
    sheetRowId: { type: String, default: null },
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

paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ paymentDate: -1, status: 1 });
paymentSchema.index({ customer: 1, paymentDate: -1 });
paymentSchema.index({ booking: 1 });
paymentSchema.index({ invoice: 1, status: 1 });

export type PaymentDocument = HydratedDocument<InferSchemaType<typeof paymentSchema>>;

export const Payment = model("Payment", paymentSchema);

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export const PAYMENT_METHOD_VALUES = [...PAYMENT_METHODS];
export const PAYMENT_STATUS_VALUES = [...PAYMENT_STATUSES];
