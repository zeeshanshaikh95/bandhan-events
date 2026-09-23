import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";
import {
  INVOICE_STATUSES,
  LINE_ITEM_CATEGORY_VALUES,
  LINE_ITEM_UNIT_VALUES,
} from "@bandhan/shared";

/**
 * ---------------------------------------------------------------------------
 * INVOICE
 * ---------------------------------------------------------------------------
 * A demand for payment against a customer (optionally an event and quotation).
 *
 * `amountPaid` and `outstanding` are deliberately NOT stored here. Payments
 * already live in the Payment collection and are the source of truth; keeping a
 * second copy on the invoice is how balance figures drift out of agreement.
 * The service derives both from the Payment collection on every read.
 */

const lineItemSchema = new Schema(
  {
    category: { type: String, enum: LINE_ITEM_CATEGORY_VALUES, required: true },
    description: { type: String, required: true, trim: true, maxlength: 300 },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, enum: LINE_ITEM_UNIT_VALUES, default: "lump-sum" },

    unitPricePaise: { type: Number, required: true, min: 0 },
    discountPercent: { type: Number, min: 0, max: 100, default: 0 },
    discountAmountPaise: { type: Number, min: 0, default: 0 },
    taxPercent: { type: Number, min: 0, max: 100, default: 0 },
    taxAmountPaise: { type: Number, min: 0, default: 0 },
    lineTotalPaise: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const totalsSchema = new Schema(
  {
    subtotalPaise: { type: Number, required: true, min: 0, default: 0 },
    discountAmountPaise: { type: Number, required: true, min: 0, default: 0 },
    taxAmountPaise: { type: Number, required: true, min: 0, default: 0 },
    grandTotalPaise: { type: Number, required: true, min: 0, default: 0 },
    advanceRequiredPaise: { type: Number, required: true, min: 0, default: 0 },
    balancePaise: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false }
);

const invoiceSchema = new Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },

    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    event: { type: Schema.Types.ObjectId, ref: "Event", default: null, index: true },
    quotation: { type: Schema.Types.ObjectId, ref: "Quotation", default: null, index: true },

    issueDate: { type: Date, required: true, index: true },
    dueDate: { type: Date, default: null, index: true },

    lineItems: { type: [lineItemSchema], default: [] },
    totals: { type: totalsSchema, required: true },

    status: {
      type: String,
      enum: INVOICE_STATUSES,
      default: "DRAFT",
      required: true,
      index: true,
    },

    notes: { type: String, trim: true, maxlength: 2000, default: "" },
    termsAndConditions: { type: String, trim: true, maxlength: 2000, default: "" },

    issuedAt: { type: Date, default: null },
    voidedAt: { type: Date, default: null },
    voidReason: { type: String, trim: true, maxlength: 500, default: null },

    pdfDocumentId: { type: Schema.Types.ObjectId, ref: "RenderedDocument", default: null },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },

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

invoiceSchema.index({ createdAt: -1 });
invoiceSchema.index({ customer: 1, createdAt: -1 });
invoiceSchema.index({ status: 1, dueDate: 1 });
invoiceSchema.index({ archivedAt: 1 });

export type InvoiceDocument = HydratedDocument<InferSchemaType<typeof invoiceSchema>>;

export const Invoice = model("Invoice", invoiceSchema);
