import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";
import {
  BOOKING_EVENT_TYPE_VALUES,
  LINE_ITEM_CATEGORY_VALUES,
  LINE_ITEM_UNIT_VALUES,
  QUOTATION_STATUSES,
} from "@bandhan/shared";

/**
 * ---------------------------------------------------------------------------
 * QUOTATION
 * ---------------------------------------------------------------------------
 * A priced offer to a customer. Everything monetary is stored in **integer
 * paise** (see utils/money.ts) so totals never drift.
 *
 * Versioning rule: once a quotation leaves DRAFT its contents are frozen. An
 * edit under a locked status appends the outgoing content to `versions` and
 * increments `version`, so `versions[0]` plus the live document always describes
 * every version the customer may have seen.
 *
 * `totals` is a cache of the server-side calculation. It is never accepted from
 * the client — the service recomputes it from `lineItems` on every write.
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

/**
 * A frozen copy of a superseded version. Deliberately `Mixed`: snapshots are
 * written only by the service from already-validated data, and a schema copy of
 * the whole quotation here would be a second place for the shape to rot.
 */
const versionSchema = new Schema(
  {
    version: { type: Number, required: true, min: 1 },
    snapshot: { type: Schema.Types.Mixed, required: true },
    changeNote: { type: String, trim: true, maxlength: 300, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    createdByName: { type: String, trim: true, maxlength: 80, default: "System" },
  },
  { timestamps: { createdAt: true, updatedAt: false }, _id: true }
);

const quotationSchema = new Schema(
  {
    quotationNumber: { type: String, required: true, unique: true, index: true },
    version: { type: Number, required: true, default: 1, min: 1 },

    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    lead: { type: Schema.Types.ObjectId, ref: "Lead", default: null },
    /** Set once the quotation is converted, or linked up-front to a booking. */
    event: { type: Schema.Types.ObjectId, ref: "Event", default: null, index: true },

    issueDate: { type: Date, required: true, index: true },
    validUntil: { type: Date, default: null },

    status: {
      type: String,
      enum: QUOTATION_STATUSES,
      default: "DRAFT",
      required: true,
      index: true,
    },

    /** Event context, captured before a booking exists. */
    eventType: { type: String, enum: BOOKING_EVENT_TYPE_VALUES, default: null },
    eventDate: { type: Date, default: null },
    venue: { type: String, trim: true, maxlength: 200, default: "" },
    venueAddress: { type: String, trim: true, maxlength: 500, default: "" },
    guestCount: { type: Number, min: 1, max: 10_000, default: null },

    packageName: { type: String, trim: true, maxlength: 200, default: "" },
    lineItems: { type: [lineItemSchema], default: [] },
    totals: { type: totalsSchema, required: true },
    paymentTerms: { type: String, trim: true, maxlength: 500, default: "" },
    notes: { type: String, trim: true, maxlength: 2000, default: "" },
    termsAndConditions: { type: String, trim: true, maxlength: 2000, default: "" },

    sentAt: { type: Date, default: null },
    acceptedAt: { type: Date, default: null },
    acceptedByName: { type: String, trim: true, maxlength: 120, default: null },
    acceptanceNote: { type: String, trim: true, maxlength: 1000, default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, maxlength: 500, default: null },
    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, trim: true, maxlength: 500, default: null },

    versions: { type: [versionSchema], default: [] },

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

quotationSchema.index({ createdAt: -1 });
quotationSchema.index({ customer: 1, createdAt: -1 });
quotationSchema.index({ status: 1, createdAt: -1 });
quotationSchema.index({ status: 1, validUntil: 1 });
quotationSchema.index({ archivedAt: 1 });

export type QuotationDocument = HydratedDocument<InferSchemaType<typeof quotationSchema>>;

export const Quotation = model("Quotation", quotationSchema);
