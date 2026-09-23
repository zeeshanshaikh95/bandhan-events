import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

/**
 * ---------------------------------------------------------------------------
 * EXPENSE
 * ---------------------------------------------------------------------------
 * Tracks all business expenses — linked optionally to an event/booking.
 * Expenses are never casually deleted; prefer archiving.
 */

const EXPENSE_CATEGORIES = [
  "decoration",
  "flowers",
  "lighting",
  "furniture",
  "transport",
  "labour",
  "catering",
  "venue",
  "marketing",
  "printing",
  "equipment",
  "vendor",
  "miscellaneous",
] as const;

const PAYMENT_METHODS = ["cash", "upi", "bank-transfer", "card", "cheque", "other"] as const;

const expenseSchema = new Schema(
  {
    date: { type: Date, required: true, index: true },
    category: {
      type: String,
      enum: EXPENSE_CATEGORIES,
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true, maxlength: 500, default: "" },

    vendor: { type: Schema.Types.ObjectId, ref: "Vendor", default: null, index: true },
    vendorName: { type: String, trim: true, maxlength: 100, default: "" },

    /**
     * Link to a specific event/booking for event-wise profit calculation.
     * The ref must name the model as registered — "Event", not "Booking" —
     * or `populate("booking")` throws and the endpoint 500s.
     */
    booking: { type: Schema.Types.ObjectId, ref: "Event", default: null, index: true },

    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: "cash",
      required: true,
    },
    paidBy: { type: String, trim: true, maxlength: 100, default: "" },
    receipt: { type: String, trim: true, maxlength: 500, default: "" },
    notes: { type: String, trim: true, maxlength: 500, default: "" },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },

    /** Soft-delete: archived expenses are hidden from normal views. */
    archivedAt: { type: Date, default: null },

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

expenseSchema.index({ createdAt: -1 });
expenseSchema.index({ date: -1, category: 1 });
expenseSchema.index({ booking: 1, date: -1 });
expenseSchema.index({ archivedAt: 1 });

export type ExpenseDocument = HydratedDocument<InferSchemaType<typeof expenseSchema>>;

export const Expense = model("Expense", expenseSchema);

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export const EXPENSE_CATEGORY_VALUES = [...EXPENSE_CATEGORIES];
export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  decoration: "Decoration",
  flowers: "Flowers",
  lighting: "Lighting",
  furniture: "Furniture",
  transport: "Transport",
  labour: "Labour",
  catering: "Catering",
  venue: "Venue",
  marketing: "Marketing",
  printing: "Printing",
  equipment: "Equipment",
  vendor: "Vendor",
  miscellaneous: "Miscellaneous",
};
