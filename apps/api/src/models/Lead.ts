import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";
import {
  BUDGET_VALUES,
  EVENT_TYPE_VALUES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  SERVICE_VALUES,
} from "@bandhan/shared";

/**
 * ---------------------------------------------------------------------------
 * LEAD
 * ---------------------------------------------------------------------------
 * One record for every enquiry, whether it arrived from the website, a phone
 * call or a walk-in. Website submissions are written by the public endpoint
 * with source = "website"; staff-created leads carry their own source.
 */
const leadNoteSchema = new Schema(
  {
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    author: { type: Schema.Types.ObjectId, ref: "User", default: null },
    authorName: { type: String, required: true, trim: true, maxlength: 80 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, _id: true }
);

const leadSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, lowercase: true, trim: true, maxlength: 254, default: null },

    eventType: { type: String, enum: EVENT_TYPE_VALUES, required: true, index: true },
    eventDate: { type: Date, default: null, index: true },
    guestCount: { type: Number, min: 1, max: 5000, default: null },
    serviceRequired: { type: String, enum: SERVICE_VALUES, required: true },
    budget: { type: String, enum: BUDGET_VALUES, default: null },

    message: { type: String, trim: true, maxlength: 1000, default: "" },

    source: { type: String, enum: LEAD_SOURCES, default: "website", required: true, index: true },
    status: { type: String, enum: LEAD_STATUSES, default: "NEW", required: true, index: true },

    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    notes: { type: [leadNoteSchema], default: [] },
    nextFollowUpAt: { type: Date, default: null, index: true },
    lostReason: { type: String, trim: true, maxlength: 300, default: null },

    /** Attribution for website enquiries (which page they converted on). */
    pagePath: { type: String, trim: true, maxlength: 200, default: null },

    /** Set when the lead is converted into a customer record (later module). */
    convertedCustomerId: { type: Schema.Types.ObjectId, ref: "Customer", default: null },
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

leadSchema.index({ createdAt: -1 });
leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({ nextFollowUpAt: 1, status: 1 });

export type LeadDocument = HydratedDocument<InferSchemaType<typeof leadSchema>>;

export const Lead = model("Lead", leadSchema);
