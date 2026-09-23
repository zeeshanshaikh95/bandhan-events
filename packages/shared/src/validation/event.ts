import { z } from "zod";
import {
  BOOKING_EVENT_TYPE_VALUES,
  BOOKING_STATUSES,
  PAYMENT_STATUS_VALUES,
  TEAM_ROLE_VALUES,
} from "../eventConstants";

/**
 * Event service line item (e.g. Stage Decoration, Catering).
 */
export const eventServiceItemSchema = z.object({
  name: z.string().min(1, "Service name is required").max(100),
  description: z.string().max(500).default(""),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.number().min(0, "Price cannot be negative"),
  estimatedCost: z.number().min(0).default(0),
  vendor: z.string().optional().nullable(),
  notes: z.string().max(300).default(""),
});

export type EventServiceItemInput = z.infer<typeof eventServiceItemSchema>;

/**
 * Vendor assignment for an event.
 */
export const eventVendorSchema = z.object({
  vendor: z.string().min(1, "Vendor is required"),
  service: z.string().max(100).default(""),
  agreedCost: z.number().min(0).default(0),
  contactPerson: z.string().max(100).default(""),
  contactPhone: z.string().max(20).default(""),
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED"]).default("PENDING"),
  paymentStatus: z.enum(["UNPAID", "PARTIAL", "PAID"]).default("UNPAID"),
  notes: z.string().max(300).default(""),
});

export type EventVendorInput = z.infer<typeof eventVendorSchema>;

/**
 * Team member assignment.
 */
export const eventTeamMemberSchema = z.object({
  user: z.string().min(1, "Team member is required"),
  role: z.enum(TEAM_ROLE_VALUES),
  notes: z.string().max(200).default(""),
});

export type EventTeamMemberInput = z.infer<typeof eventTeamMemberSchema>;

/**
 * Create event — full schema for POST /events.
 */
export const createEventSchema = z.object({
  customer: z.string().min(1, "Customer is required"),
  lead: z.string().optional().nullable(),

  eventName: z.string().min(2, "Event name is required").max(200),
  eventType: z.enum(BOOKING_EVENT_TYPE_VALUES),
  eventDate: z.string().min(1, "Event date is required"),
  startTime: z.string().max(5).default(""),
  endTime: z.string().max(5).default(""),

  venue: z.string().max(200).default(""),
  venueAddress: z.string().max(500).default(""),
  guestCount: z.number().int().min(1).max(10000).optional().nullable(),

  packageName: z.string().max(200).default(""),
  services: z.array(eventServiceItemSchema).default([]),
  contractAmount: z.number().min(0, "Contract amount cannot be negative"),
  paymentTerms: z.string().max(500).default(""),

  vendors: z.array(eventVendorSchema).default([]),
  team: z.array(eventTeamMemberSchema).default([]),

  notes: z.string().max(2000).default(""),
  internalNotes: z.string().max(2000).default(""),

  status: z.enum(BOOKING_STATUSES).default("ENQUIRY"),
  paymentStatus: z.enum(PAYMENT_STATUS_VALUES).default("UNPAID"),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

/**
 * Update event — partial schema for PATCH /events/:id.
 */
export const updateEventSchema = createEventSchema.partial().extend({
  status: z.enum(BOOKING_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUS_VALUES).optional(),
});

export type UpdateEventInput = z.infer<typeof updateEventSchema>;

/**
 * Event list query params.
 */
export const eventListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  eventType: z.string().optional(),
  status: z.string().optional(),
  paymentStatus: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  customer: z.string().optional(),
  sort: z.string().default("-eventDate"),
});

export type EventListQuery = z.infer<typeof eventListQuerySchema>;

/**
 * Add event note.
 */
export const addEventNoteSchema = z.object({
  body: z.string().min(1, "Note cannot be empty").max(2000),
});

export type AddEventNoteInput = z.infer<typeof addEventNoteSchema>;
