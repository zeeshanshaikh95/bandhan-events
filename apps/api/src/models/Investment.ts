import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

/**
 * ---------------------------------------------------------------------------
 * INVESTMENT
 * ---------------------------------------------------------------------------
 * Tracks partner contributions separately from ordinary business expenses.
 * Investments are NOT automatically classified as expenses.
 */

const INVESTMENT_TYPES = [
  "capital",
  "additional-contribution",
  "withdrawal",
] as const;

const PAYMENT_METHODS = ["cash", "upi", "bank-transfer", "card", "cheque", "other"] as const;

const investmentSchema = new Schema(
  {
    date: { type: Date, required: true, index: true },
    partner: { type: String, required: true, trim: true, maxlength: 100, index: true },
    amount: { type: Number, required: true, min: 0 },
    type: {
      type: String,
      enum: INVESTMENT_TYPES,
      default: "capital",
      required: true,
    },
    purpose: { type: String, trim: true, maxlength: 300, default: "" },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: "cash",
      required: true,
    },
    reference: { type: String, trim: true, maxlength: 100, default: "" },
    notes: { type: String, trim: true, maxlength: 500, default: "" },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },

    /** Google Sheets row tracking. */
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

investmentSchema.index({ createdAt: -1 });
investmentSchema.index({ partner: 1, date: -1 });
investmentSchema.index({ date: -1 });

export type InvestmentDocument = HydratedDocument<InferSchemaType<typeof investmentSchema>>;

export const Investment = model("Investment", investmentSchema);

export type InvestmentType = (typeof INVESTMENT_TYPES)[number];
export const INVESTMENT_TYPE_VALUES = [...INVESTMENT_TYPES];
