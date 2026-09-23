import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";
import {
  DIETARY_OPTION_VALUES,
  RATE_BASIS_VALUES,
  VENDOR_STATUSES,
  VENDOR_TYPE_VALUES,
} from "@bandhan/shared";

/**
 * ---------------------------------------------------------------------------
 * VENDOR
 * ---------------------------------------------------------------------------
 * The suppliers Bandhan Events buys from. One collection covers every kind of
 * supplier — a florist, a photographer and a caterer are the same entity with
 * different `type`, which is why the catering block below is optional rather
 * than a separate collection.
 *
 * `Event.vendors[].vendor` and `Expense.vendor` reference this model. A vendor
 * is never hard-deleted once it has been used: `status` goes INACTIVE and the
 * historical assignments, expenses and payments stay intact.
 */

const vendorPackageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    pricePerPlate: { type: Number, min: 0, default: 0 },
    minimumGuests: { type: Number, min: 1, default: null },
    description: { type: String, trim: true, maxlength: 600, default: "" },
    menuItems: { type: [String], default: [] },
    active: { type: Boolean, default: true },
  },
  { _id: true }
);

/** Only meaningful for `type: "caterer"`, but stored for every vendor so a
 *  supplier that starts catering later needs no migration. */
const catererSchema = new Schema(
  {
    cuisines: { type: [String], default: [] },
    dietaryOptions: { type: [String], enum: DIETARY_OPTION_VALUES, default: [] },
    perPlatePrice: { type: Number, min: 0, default: 0 },
    minimumGuestCount: { type: Number, min: 1, default: null },
    maximumGuestCount: { type: Number, min: 1, default: null },
    staffIncluded: { type: Boolean, default: true },
    equipmentIncluded: { type: Boolean, default: false },
    servingStaff: { type: Number, min: 0, default: 0 },
    setupCharges: { type: Number, min: 0, default: 0 },
    deliveryCharges: { type: Number, min: 0, default: 0 },
    additionalCharges: { type: Number, min: 0, default: 0 },
    notes: { type: String, trim: true, maxlength: 1000, default: "" },
  },
  { _id: false }
);

const rateInfoSchema = new Schema(
  {
    basis: { type: String, enum: RATE_BASIS_VALUES, default: "lump-sum" },
    amount: { type: Number, min: 0, default: 0 },
    notes: { type: String, trim: true, maxlength: 400, default: "" },
  },
  { _id: false }
);

/** Dated, attributed notes — distinct from the `notes` summary field. */
const vendorNoteSchema = new Schema(
  {
    body: { type: String, required: true, trim: true, maxlength: 1000 },
    author: { type: Schema.Types.ObjectId, ref: "User", default: null },
    authorName: { type: String, required: true, trim: true, maxlength: 80 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, _id: true }
);

const vendorSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120, index: true },
    /** Trading name when it differs from the contact's name. */
    company: { type: String, trim: true, maxlength: 160, default: "" },
    type: { type: String, enum: VENDOR_TYPE_VALUES, required: true, index: true },
    category: { type: String, trim: true, maxlength: 80, default: "", index: true },
    status: { type: String, enum: VENDOR_STATUSES, default: "ACTIVE", index: true },

    contactPerson: { type: String, trim: true, maxlength: 120, default: "" },
    phone: { type: String, trim: true, maxlength: 20, default: "" },
    whatsapp: { type: String, trim: true, maxlength: 20, default: "" },
    email: { type: String, trim: true, lowercase: true, maxlength: 160, default: "" },

    address: { type: String, trim: true, maxlength: 400, default: "" },
    area: { type: String, trim: true, maxlength: 120, default: "", index: true },
    city: { type: String, trim: true, maxlength: 80, default: "", index: true },

    description: { type: String, trim: true, maxlength: 1000, default: "" },
    services: { type: [String], default: [] },
    rateInfo: { type: rateInfoSchema, default: () => ({}) },
    /** Free-text internal summary shown at the top of the vendor form. */
    notes: { type: String, trim: true, maxlength: 2000, default: "" },

    caterer: { type: catererSchema, default: () => ({}) },
    packages: { type: [vendorPackageSchema], default: [] },

    noteLog: { type: [vendorNoteSchema], default: [] },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },

    /** Google Sheets row tracking — set after the first sync. */
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
// Chosen from the actual query pattern: list/search by name, filter by
// type/status/city, and the picker's active-only lookup.

vendorSchema.index({ archivedAt: 1, status: 1, type: 1 });
vendorSchema.index({ name: 1 });
vendorSchema.index({ type: 1, status: 1 });
vendorSchema.index({ city: 1, area: 1 });
vendorSchema.index({ name: "text", company: "text", contactPerson: "text", services: "text" });

export type VendorDocument = HydratedDocument<InferSchemaType<typeof vendorSchema>>;

export const Vendor = model("Vendor", vendorSchema);
