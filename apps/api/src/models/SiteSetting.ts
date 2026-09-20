import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

/**
 * ---------------------------------------------------------------------------
 * SITE SETTING
 * ---------------------------------------------------------------------------
 * Database-backed business settings, so editable values (phone, WhatsApp
 * number, email, Instagram, address) are never hardcoded in components.
 *
 * `value` is Mixed because the shape differs per key; each key's payload is
 * validated with a Zod schema at the service boundary before it is written.
 */
const siteSettingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, maxlength: 60 },
    value: { type: Schema.Types.Mixed, required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export type SiteSettingDocument = HydratedDocument<InferSchemaType<typeof siteSettingSchema>>;

export const SiteSetting = model("SiteSetting", siteSettingSchema);

/** Canonical setting keys. */
export const SETTING_KEYS = {
  business: "business",
} as const;
