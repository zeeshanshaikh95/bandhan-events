import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

/**
 * ---------------------------------------------------------------------------
 * CUSTOMER
 * ---------------------------------------------------------------------------
 * The commercial record a quotation, invoice, event and payment all hang off.
 * `Event.customer` and `Payment.customer` already referenced "Customer" — this
 * is that model, so the relationships resolve to a real document instead of a
 * dangling ObjectId.
 *
 * Duplicate prevention is handled at the service layer (normalised phone
 * lookup + an explicit confirmation flag) rather than a unique index, because
 * one family may legitimately book several events under one number.
 */

const customerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120, index: true },
    /** Normalised digits-only copy, used for duplicate detection. */
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    phoneNormalized: { type: String, required: true, index: true },
    email: { type: String, lowercase: true, trim: true, maxlength: 254, default: null },

    address: { type: String, trim: true, maxlength: 400, default: "" },
    notes: { type: String, trim: true, maxlength: 1000, default: "" },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },

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

customerSchema.index({ createdAt: -1 });
customerSchema.index({ phoneNormalized: 1, archivedAt: 1 });
customerSchema.index({ name: "text", phone: "text" });

/** Strips formatting so "+91 98765 43210" and "9876543210" match. */
export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

export type CustomerDocument = HydratedDocument<InferSchemaType<typeof customerSchema>>;

export const Customer = model("Customer", customerSchema);
