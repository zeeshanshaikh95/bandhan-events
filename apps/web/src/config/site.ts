/**
 * ---------------------------------------------------------------------------
 * SITE CONFIG — single source of truth for brand + contact information.
 * ---------------------------------------------------------------------------
 * The owner can update phone, WhatsApp, email, Instagram and the address here
 * (or via the .env variables) without touching any component.
 *
 * Values marked TODO are placeholders until confirmed by the owners.
 * DO NOT invent real contact details.
 */

const env = import.meta.env;

export const siteConfig = {
  name: "Bandhan Events",
  legalName: "Bandhan Events",
  tagline: "Celebrations for a Lifetime",
  url: env.VITE_SITE_URL ?? "https://bandhanevents.in",
  /** Default social share image (lives in /public). */
  ogImage: "/og-image.png",

  address: {
    street: "63/1 Guru Gobind Singh Marg",
    locality: "Mulund Colony",
    area: "Mulund West",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400082",
    country: "India",
    countryCode: "IN",
  },

  contact: {
    // TODO: Replace with the real phone number when the owners confirm it.
    phoneDisplay: env.VITE_CONTACT_PHONE_DISPLAY ?? "Coming Soon",
    // WhatsApp business number (digits only, with country code).
    whatsappNumber: env.VITE_WHATSAPP_NUMBER ?? "919820080526",
    // TODO: Replace with the real email address when confirmed.
    email: env.VITE_CONTACT_EMAIL ?? "Coming Soon",
    // TODO: Replace with the real Instagram profile URL when confirmed.
    instagramUrl: env.VITE_INSTAGRAM_URL ?? "https://www.instagram.com/",
    instagramHandle: "@bandhanevents", // TODO: Confirm handle
  },

  /** Localities targeted for local SEO — used in structured data only. */
  areasServed: [
    "Mulund",
    "Mulund West",
    "Bhandup",
    "Ghatkopar",
    "Vikhroli",
    "Powai",
    "Thane",
    "Mumbai",
  ],
} as const;

/** Pre-approved WhatsApp enquiry messages (kept consistent across the site). */
export const whatsappMessages = {
  general: "Hi Bandhan Events, I would like to enquire about an event.",
  decorator: "Hi Bandhan Events, I would like to enquire about event decoration.",
  banquet: "Hi Bandhan Events, I would like to enquire about the banquet and catering.",
  gifting: "Hi Bandhan Events, I would like to enquire about gifting.",
  visit: "Hi Bandhan Events, I would like to book a visit to the venue.",
} as const;

/**
 * Routes where the fixed bottom Decorator / Banquet switcher is suppressed.
 * Shared by the switcher and the footer so reserved spacing can never drift
 * out of sync with the bar itself.
 */
export const switcherHiddenRoutes = ["/contact"] as const;

export function showsBusinessSwitcher(pathname: string): boolean {
  return !(switcherHiddenRoutes as readonly string[]).includes(pathname);
}

/** Build a wa.me deep link with a pre-filled message. */
export function whatsappUrl(
  message: string = whatsappMessages.general
): string {
  return `https://wa.me/${siteConfig.contact.whatsappNumber}?text=${encodeURIComponent(
    message
  )}`;
}

/** Full address as a single formatted string. */
export const formattedAddress = [
  siteConfig.address.street,
  siteConfig.address.locality,
  siteConfig.address.area,
  `${siteConfig.address.city} – ${siteConfig.address.postalCode}`,
].join(", ");

/** Google Maps search link for the venue (factual, no API key needed). */
export const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${siteConfig.name}, ${formattedAddress}`
)}`;

/** Primary navigation shared by header, mobile menu and footer. */
export const navLinks = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Decorators", to: "/decorators" },
  { label: "Banquet & Catering", to: "/banquet-catering" },
  { label: "Gallery", to: "/gallery" },
  { label: "Gifting", to: "/gifting" },
  { label: "Contact", to: "/contact" },
] as const;
