/**
 * Event/Booking DTO types shared between API and frontend.
 * These match the MongoDB document shapes after transformation.
 */

import type { EventVendorAssignmentDto } from "./vendorTypes";

export interface EventServiceItemDto {
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  estimatedCost: number;
  vendor?: string | null;
  notes: string;
}

/**
 * @deprecated Superseded by `EventVendorAssignmentDto`, which carries the
 * assignment id, the cost breakdown and the derived payment position. Kept
 * because the calendar and list endpoints still reference the older shape.
 */
export interface EventVendorDto {
  vendor: { id: string; name: string } | string;
  service: string;
  agreedCost: number;
  contactPerson: string;
  contactPhone: string;
  status: string;
  paymentStatus: string;
  notes: string;
}

export interface EventTeamMemberDto {
  user: { id: string; name: string } | string;
  role: string;
  notes: string;
}

export interface EventNoteDto {
  id: string;
  body: string;
  authorName: string;
  authorId?: string | null;
  createdAt: string;
}

export interface EventDto {
  id: string;
  customer: { id: string; name: string; phone: string } | null;
  lead?: { id: string; name: string } | null;

  eventName: string;
  eventType: string;
  eventDate: string;
  startTime: string;
  endTime: string;

  venue: string;
  venueAddress: string;
  guestCount: number | null;

  packageName: string;
  services: EventServiceItemDto[];
  contractAmount: number;
  paymentTerms: string;

  vendors: EventVendorAssignmentDto[];
  team: EventTeamMemberDto[];

  notes: string;
  internalNotes: string;

  status: string;
  paymentStatus: string;

  // Computed from finance system
  amountReceived: number;
  outstanding: number;
  directExpenses: number;
  grossProfit: number;

  createdBy?: { id: string; name: string } | null;
  updatedBy?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

/** Event with computed financial fields for the detail page. */
export interface EventFinancials {
  contractAmount: number;
  amountReceived: number;
  outstanding: number;
  directExpenses: number;
  grossProfit: number;
  grossMarginPercent: number;
}

/** Calendar event (slim version for calendar view). */
export interface CalendarEvent {
  id: string;
  eventName: string;
  eventType: string;
  eventDate: string;
  venue: string;
  status: string;
  paymentStatus: string;
  customerName: string;
}

/** Upcoming event for dashboard. */
export interface UpcomingEvent {
  id: string;
  eventName: string;
  eventType: string;
  eventDate: string;
  venue: string;
  status: string;
  paymentStatus: string;
  customerName: string;
  customerPhone: string;
  outstanding: number;
}
