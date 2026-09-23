import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";
import {
  BUDGET_VALUES,
  EVENT_TYPE_VALUES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  SERVICE_VALUES,
  STAGE_BACKDROP_VALUES,
  STAGE_EXTRA_DECOR_VALUES,
  STAGE_FLOWER_VALUES,
  STAGE_FURNITURE_VALUES,
  STAGE_LAYOUT_VALUES,
  STAGE_LIGHTING_VALUES,
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

/**
 * Choices from the "Build Your Own Stage" wizard. Present only on enquiries
 * that came through /build-your-stage; enum-guarded here exactly like the
 * shared Zod schema so a stale or hand-crafted payload cannot store values
 * the dashboard would then render as raw slugs.
 */
const stageConfigurationSchema = new Schema(
  {
    layout: { type: String, enum: STAGE_LAYOUT_VALUES, required: true },
    backdrop: { type: String, enum: STAGE_BACKDROP_VALUES, required: true },
    flowers: { type: String, enum: STAGE_FLOWER_VALUES, required: true },
    lighting: { type: String, enum: STAGE_LIGHTING_VALUES, required: true },
    furniture: { type: String, enum: STAGE_FURNITURE_VALUES, required: true },
    otherDecor: {
      type: [String],
      enum: STAGE_EXTRA_DECOR_VALUES,
      required: true,
      validate: {
        validator: (values: string[]) => values.length >= 1,
        message: "Please choose at least one décor option.",
      },
    },
    notes: { type: String, trim: true, maxlength: 500, default: "" },
  },
  { _id: false }
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

    /** Stage-builder choices — null for every other kind of lead. */
    stageConfiguration: { type: stageConfigurationSchema, default: null },

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
