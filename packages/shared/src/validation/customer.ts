import { z } from "zod";
import {
  emailSchema,
  objectIdSchema,
  optionalText,
  paginationSchema,
  phoneSchema,
  trimmedString,
} from "./primitives";

/**
 * Customers. Deliberately small: a quotation needs a name and a phone to be
 * sendable, and everything else is optional context the team fills in later.
 */
export const customerCreateSchema = z.object({
  name: trimmedString(120, 2),
  phone: phoneSchema,
  email: emailSchema.optional(),
  address: optionalText(400),
  notes: optionalText(1000),
  /**
   * Duplicate protection is opt-out, not opt-in: a customer whose phone number
   * already exists is reported back to the dashboard so the team links the
   * existing record instead of creating a second one.
   */
  confirmDuplicate: z.boolean().default(false),
});

export const customerUpdateSchema = customerCreateSchema.partial();

export const customerListQuerySchema = paginationSchema.extend({
  search: trimmedString(80).optional(),
  sort: z.enum(["-createdAt", "createdAt", "name"]).default("name"),
});

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;

/** Re-exported so controllers can validate a customer id parameter. */
export const customerIdSchema = objectIdSchema;
