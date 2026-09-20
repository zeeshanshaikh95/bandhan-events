/**
 * Business vocabulary shared by the public form, the API and the admin UI.
 * Values are stable slugs; labels are display-only and may be reworded freely.
 * Nothing here may be invented beyond what the owners confirmed.
 */

export const EVENT_TYPES = [
  { value: "weddings", label: "Weddings" },
  { value: "engagements", label: "Engagements" },
  { value: "social-celebrations", label: "Social Celebrations" },
  { value: "corporate-events", label: "Corporate Events" },
  { value: "prarthana-sabha", label: "Prarthana Sabha" },
  { value: "special-occasions", label: "Special Occasions" },
  { value: "other", label: "Other Occasion" },
] as const;

export type EventType = (typeof EVENT_TYPES)[number]["value"];
export const EVENT_TYPE_VALUES = EVENT_TYPES.map((e) => e.value) as [EventType, ...EventType[]];

export const SERVICES = [
  { value: "decorator", label: "Decorator / Event Decoration" },
  { value: "banquet-catering", label: "Banquet & Catering" },
  { value: "both", label: "Both (Decor + Banquet)" },
  { value: "gifting", label: "Gifting" },
  { value: "other", label: "Something Else" },
] as const;

export type ServiceRequired = (typeof SERVICES)[number]["value"];
export const SERVICE_VALUES = SERVICES.map((s) => s.value) as [
  ServiceRequired,
  ...ServiceRequired[],
];

export const LEAD_SOURCES = [
  "website",
  "whatsapp",
  "instagram",
  "facebook",
  "justdial",
  "google",
  "referral",
  "walk-in",
  "phone",
  "other",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "FOLLOW_UP",
  "QUOTED",
  "NEGOTIATION",
  "CONFIRMED",
  "COMPLETED",
  "LOST",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  FOLLOW_UP: "Follow-up",
  QUOTED: "Quoted",
  NEGOTIATION: "Negotiation",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  LOST: "Lost",
};

export const USER_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** Enquiry budget bands — deliberately coarse; the owner can refine later. */
export const BUDGET_RANGES = [
  { value: "under-1l", label: "Under ₹1 lakh" },
  { value: "1-3l", label: "₹1–3 lakh" },
  { value: "3-6l", label: "₹3–6 lakh" },
  { value: "6-12l", label: "₹6–12 lakh" },
  { value: "12l-plus", label: "₹12 lakh+" },
  { value: "not-sure", label: "Not decided yet" },
] as const;

export type BudgetRange = (typeof BUDGET_RANGES)[number]["value"];
export const BUDGET_VALUES = BUDGET_RANGES.map((b) => b.value) as [BudgetRange, ...BudgetRange[]];
