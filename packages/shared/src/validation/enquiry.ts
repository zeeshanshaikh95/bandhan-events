import { z } from "zod";
import { BUDGET_VALUES, EVENT_TYPE_VALUES, SERVICE_VALUES } from "../constants";
import {
  choiceSchema,
  dateOnlySchema,
  emailSchema,
  optionalText,
  phoneSchema,
  trimmedString,
} from "./primitives";
import { stageConfigurationSchema } from "./stage";

/**
 * Public enquiry payload — the exact contract of the website contact form.
 * Every valid submission becomes a Lead with source = "website" server-side.
 */
export const enquirySchema = z.object({
  name: trimmedString(80, 2),
  phone: phoneSchema,
  email: emailSchema,
  eventType: choiceSchema(EVENT_TYPE_VALUES, "Please choose an event type."),
  eventDate: dateOnlySchema,
  guestCount: z.coerce
    .number({ invalid_type_error: "Please enter a number." })
    .int("Please enter a whole number.")
    .min(1, "Please enter at least 1 guest.")
    .max(5000, "Please enter 5000 guests or fewer.")
    .optional(),
  serviceRequired: choiceSchema(SERVICE_VALUES, "Please choose a service."),
  budget: choiceSchema(BUDGET_VALUES, "Please choose a budget range.").optional(),
  message: optionalText(1000),
  /**
   * Honeypot: real visitors never see or fill this field. Bots that autofill
   * every input give themselves away, and the request is accepted (so the bot
   * learns nothing) but never stored.
   */
  company: z.string().max(200).optional(),
  /** Optional page the enquiry came from, for attribution. */
  pagePath: trimmedString(200).optional(),
  /**
   * Optional stage-builder choices — sent only by /build-your-stage so the
   * dashboard can show exactly what the visitor configured.
   */
  stageConfiguration: stageConfigurationSchema.optional(),
});

export type EnquiryInput = z.infer<typeof enquirySchema>;

export const isHoneypotTripped = (input: Pick<EnquiryInput, "company">): boolean =>
  typeof input.company === "string" && input.company.trim().length > 0;
