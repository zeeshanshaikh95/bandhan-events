import { z } from "zod";
import { BUDGET_VALUES, EVENT_TYPE_VALUES, LEAD_SOURCES, LEAD_STATUSES, SERVICE_VALUES } from "../constants";
import {
  choiceSchema,
  dateOnlySchema,
  emailSchema,
  objectIdSchema,
  optionalText,
  paginationSchema,
  phoneSchema,
  trimmedString,
} from "./primitives";

export const leadCreateSchema = z.object({
  name: trimmedString(80, 2),
  phone: phoneSchema,
  email: emailSchema.optional(),
  eventType: choiceSchema(EVENT_TYPE_VALUES, "Please choose an event type."),
  eventDate: dateOnlySchema,
  guestCount: z.coerce
    .number({ invalid_type_error: "Please enter a number." })
    .int("Please enter a whole number.")
    .min(1, "Please enter at least 1 guest.")
    .max(5000, "Please enter 5000 guests or fewer.")
    .optional(),
  serviceRequired: choiceSchema(SERVICE_VALUES, "Please choose a service."),
  budget: z.enum(BUDGET_VALUES).optional(),
  message: optionalText(1000),
  source: z.enum(LEAD_SOURCES).default("phone"),
  status: z.enum(LEAD_STATUSES).default("NEW"),
  assignedTo: objectIdSchema.optional(),
  nextFollowUpAt: z.coerce.date().optional(),
});

export const leadUpdateSchema = z
  .object({
    name: trimmedString(80, 2).optional(),
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    eventType: z.enum(EVENT_TYPE_VALUES).optional(),
    eventDate: dateOnlySchema,
    guestCount: z.coerce.number().int().min(1).max(5000).optional(),
    serviceRequired: z.enum(SERVICE_VALUES).optional(),
    budget: z.enum(BUDGET_VALUES).optional(),
    message: optionalText(1000),
    source: z.enum(LEAD_SOURCES).optional(),
    status: z.enum(LEAD_STATUSES).optional(),
    assignedTo: objectIdSchema.nullable().optional(),
    nextFollowUpAt: z.coerce.date().nullable().optional(),
    lostReason: optionalText(300),
  })
  .strict();

export const leadNoteSchema = z.object({
  body: trimmedString(2000, 1),
});

export const leadListQuerySchema = paginationSchema.extend({
  search: trimmedString(80).optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  source: z.enum(LEAD_SOURCES).optional(),
  assignedTo: objectIdSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sort: z.enum(["-createdAt", "createdAt", "eventDate", "nextFollowUpAt"]).default("-createdAt"),
});

export type LeadCreateInput = z.infer<typeof leadCreateSchema>;
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;
export type LeadListQuery = z.infer<typeof leadListQuerySchema>;
