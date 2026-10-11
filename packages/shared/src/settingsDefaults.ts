/**
 * Business settings that the owners can edit from the admin dashboard instead
 * of in code. Values marked TODO are placeholders awaiting confirmation — they
 * are deliberately NOT invented.
 *
 * `PUBLIC_SETTING_PATHS` is the allow-list of what the public website may read.
 * Anything not listed (notification inboxes, internal notes) never leaves the
 * admin API.
 */

export interface BusinessSettings {
  brand: {
    name: string;
    tagline: string;
  };
  contact: {
    /** Shown on the website exactly as written, e.g. "+91 98200 80526". */
    phoneDisplay: string;
    /** Optional dialable number in E.164, digits only for wa.me links. */
    whatsappNumber: string;
    email: string;
    instagramUrl: string;
    instagramHandle: string;
  };
  address: {
    street: string;
    locality: string;
    area: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  /**
   * Local-listing links. Stored here so the dashboard can deep-link to the
   * profiles; the public website never renders them.
   */
  onlinePresence: {
    /** Owner-verified Google Business Profile share link. */
    googleBusinessUrl: string;
    /** Justdial listing, once confirmed. Empty until supplied. */
    justdialUrl: string;
  };
  /** Internal only — never returned by the public settings endpoint. */
  internal: {
    enquiryNotifyEmail: string;
  };
}

export const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  brand: {
    name: "Bandhan Events",
    tagline: "Celebrations for a Lifetime",
  },
  contact: {
    // Official number confirmed by the owners: displayed as written, and used
    // as the dialable/WhatsApp number in digits with country code.
    // TODO: owners to confirm the email address and Instagram handle.
    phoneDisplay: "+91 98200 80526",
    whatsappNumber: "919820080526",
    email: "Coming Soon",
    instagramUrl: "https://www.instagram.com/",
    instagramHandle: "@bandhanevents",
  },
  address: {
    street: "63/1 Guru Gobind Singh Marg",
    locality: "Mulund Colony",
    area: "Mulund West",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400082",
    country: "India",
  },
  onlinePresence: {
    // Owner-provided Google Business Profile link (share.google/fcrCmDpVRMnpQl0z9).
    // TODO: replace with the canonical share URL if the owners regenerate it.
    googleBusinessUrl: "https://share.google/fcrCmDpVRMnpQl0z9",
    justdialUrl: "",
  },
  internal: {
    enquiryNotifyEmail: "",
  },
};

/** The subset of settings the public website is allowed to read. */
export type PublicBusinessSettings = Pick<BusinessSettings, "brand" | "contact" | "address">;

export function toPublicSettings(settings: BusinessSettings): PublicBusinessSettings {
  return {
    brand: settings.brand,
    contact: settings.contact,
    address: settings.address,
  };
}

/** Keys whose values the public settings endpoint must never expose. */
export const PUBLIC_SETTINGS_OMITTED_KEYS = ["onlinePresence", "internal"] as const;

/** Localities the business targets for local SEO (factual, owner-provided). */
export const AREAS_SERVED = [
  "Mulund",
  "Mulund West",
  "Bhandup",
  "Ghatkopar",
  "Vikhroli",
  "Powai",
  "Thane",
  "Mumbai",
] as const;

export const VENUE_POLICIES = {
  vegetarianOnly: true,
  alcoholAllowed: false,
  parkingVehicles: 15,
  brideGroomRoom: true,
} as const;
