/**
 * Event/Booking constants shared between API and frontend.
 * These extend the existing EVENT_TYPES from constants.ts with booking-specific values.
 */

// ── Event Types (extended for bookings) ──────────────────────────────────────

export const BOOKING_EVENT_TYPES = [
  { value: "wedding", label: "Wedding" },
  { value: "reception", label: "Reception" },
  { value: "engagement", label: "Engagement" },
  { value: "birthday", label: "Birthday" },
  { value: "corporate", label: "Corporate Event" },
  { value: "anniversary", label: "Anniversary" },
  { value: "baby-shower", label: "Baby Shower" },
  { value: "mehendi", label: "Mehendi" },
  { value: "haldi", label: "Haldi" },
  { value: "sangeet", label: "Sangeet" },
  { value: "religious", label: "Religious Event" },
  { value: "social-celebration", label: "Social Celebration" },
  { value: "other", label: "Other" },
] as const;

export type BookingEventType = (typeof BOOKING_EVENT_TYPES)[number]["value"];
export const BOOKING_EVENT_TYPE_VALUES = BOOKING_EVENT_TYPES.map((e) => e.value) as [
  BookingEventType,
  ...BookingEventType[],
];

// ── Booking Status ───────────────────────────────────────────────────────────

export const BOOKING_STATUSES = [
  "ENQUIRY",
  "QUOTATION_SENT",
  "NEGOTIATION",
  "CONFIRMED",
  "PLANNING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  ENQUIRY: "Enquiry",
  QUOTATION_SENT: "Quotation Sent",
  NEGOTIATION: "Negotiation",
  CONFIRMED: "Confirmed",
  PLANNING: "Planning",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

// ── Payment Status ───────────────────────────────────────────────────────────

export const PAYMENT_STATUS_VALUES = ["UNPAID", "PARTIAL", "PAID", "OVERDUE"] as const;
export type PaymentStatusValue = (typeof PAYMENT_STATUS_VALUES)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatusValue, string> = {
  UNPAID: "Unpaid",
  PARTIAL: "Partially Paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
};

// ── Event Services ───────────────────────────────────────────────────────────

export const EVENT_SERVICES = [
  { value: "stage-decoration", label: "Stage Decoration" },
  { value: "floral-decoration", label: "Floral Decoration" },
  { value: "lighting", label: "Lighting" },
  { value: "furniture", label: "Furniture" },
  { value: "sound", label: "Sound" },
  { value: "entry-gate", label: "Entry Gate" },
  { value: "mandap", label: "Mandap" },
  { value: "backdrop", label: "Backdrop" },
  { value: "catering", label: "Catering" },
  { value: "photography", label: "Photography" },
  { value: "videography", label: "Videography" },
  { value: "dj", label: "DJ" },
  { value: "transport", label: "Transport" },
  { value: "other", label: "Other" },
] as const;

export type EventServiceType = (typeof EVENT_SERVICES)[number]["value"];
export const EVENT_SERVICE_VALUES = EVENT_SERVICES.map((s) => s.value) as [
  EventServiceType,
  ...EventServiceType[],
];

// ── Team Roles ───────────────────────────────────────────────────────────────

export const TEAM_ROLES = [
  { value: "event-manager", label: "Event Manager" },
  { value: "decorator", label: "Decorator" },
  { value: "designer", label: "Designer" },
  { value: "supervisor", label: "Supervisor" },
  { value: "coordinator", label: "Coordinator" },
  { value: "labour", label: "Labour" },
  { value: "photographer", label: "Photographer" },
  { value: "other", label: "Other" },
] as const;

export type TeamRole = (typeof TEAM_ROLES)[number]["value"];
export const TEAM_ROLE_VALUES = TEAM_ROLES.map((r) => r.value) as [TeamRole, ...TeamRole[]];
