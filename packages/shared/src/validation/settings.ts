import { z } from "zod";
import { emailSchema, optionalText, trimmedString } from "./primitives";

/**
 * Editable business settings (§34/§13). Unknown keys are stripped, so a
 * crafted payload can never write fields that are not declared here — the
 * mass-assignment guard for the settings endpoint.
 */
export const businessSettingsSchema = z.object({
  brand: z.object({
    name: trimmedString(80, 2),
    tagline: trimmedString(120, 2),
  }),
  contact: z.object({
    phoneDisplay: trimmedString(40, 2),
    // Empty string means "not confirmed yet" — the website then hides the CTA
    // rather than dialling a placeholder number.
    whatsappNumber: z
      .string()
      .trim()
      .refine((value) => value === "" || /^\d{8,15}$/.test(value), {
        message: "Use digits only, with country code (e.g. 919876543210).",
      }),
    email: z.union([emailSchema, z.literal("Coming Soon"), z.literal("")]),
    instagramUrl: z
      .union([z.string().trim().url("Enter a full URL."), z.literal("")])
      .optional(),
    instagramHandle: trimmedString(60, 1),
  }),
  address: z.object({
    street: trimmedString(120, 2),
    locality: trimmedString(80, 2),
    area: trimmedString(80, 2),
    city: trimmedString(60, 2),
    state: trimmedString(60, 2),
    postalCode: trimmedString(12, 4),
    country: trimmedString(60, 2),
  }),
  onlinePresence: z
    .object({
      // The owners share the profile as a Google short link (share.google/…);
      // full maps URLs are equally valid. http(s) only — no javascript: tricks.
      // No .default() here: a default would be injected into partial PATCHes
      // by deepPartial and silently wipe the stored value.
      googleBusinessUrl: z
        .union([z.string().trim().url("Enter a full URL, e.g. https://share.google/…"), z.literal("")])
        .refine((value) => value === "" || value.startsWith("https://"), {
          message: "Use an https:// link.",
        })
        .optional(),
      justdialUrl: z
        .union([z.string().trim().url("Enter a full URL."), z.literal("")])
        .refine((value) => value === "" || value.startsWith("https://"), {
          message: "Use an https:// link.",
        })
        .optional(),
    })
    .optional(),
  internal: z
    .object({
      enquiryNotifyEmail: z.union([emailSchema, z.literal("")]).optional(),
    })
    .optional(),
});

export type BusinessSettingsInput = z.infer<typeof businessSettingsSchema>;

/** Admin-side settings payloads keep `internal` optional so nothing is lost. */
export const settingsPatchSchema = businessSettingsSchema.deepPartial();

export const publicSettingsQuerySchema = z.object({}).optional();

export const settingsMetaSchema = z.object({
  key: trimmedString(60, 2),
  value: optionalText(2000),
});
