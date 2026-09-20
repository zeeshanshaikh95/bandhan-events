import { siteConfig } from "@/config/site";

/**
 * ---------------------------------------------------------------------------
 * SEO REGISTRY — unique metadata per route (no keyword stuffing, no
 * unsupported claims). Structured data uses factual information only.
 * ---------------------------------------------------------------------------
 */

export interface SeoData {
  title: string;
  description: string;
  path: string;
  /** Keeps a route out of the index (used for the 404 page). */
  noindex?: boolean;
}

export const seoByRoute: Record<string, SeoData> = {
  "/": {
    title: "Bandhan Events | Wedding Decorators & Banquet in Mulund, Mumbai",
    description:
      "Bandhan Events offers wedding decoration, event decor, banquet and catering services in Mulund West, Mumbai for weddings, celebrations, corporate events and special occasions.",
    path: "/",
  },
  "/about": {
    title: "About Bandhan Events | Our Story & Experience in Mumbai",
    description:
      "Know Bandhan — a new destination for celebrations in Mumbai, combining event decoration, banquet venues and hospitality, backed by decades of experience in event decoration.",
    path: "/about",
  },
  "/decorators": {
    title: "Wedding Decorators in Mulund, Mumbai | Bandhan Events",
    description:
      "Wedding decoration, stage design, floral styling, venue styling, lighting and mandap setup by Bandhan Events — event decorators serving Mulund and Mumbai.",
    path: "/decorators",
  },
  "/banquet-catering": {
    title: "Banquet Hall & Catering in Mulund West, Mumbai | Bandhan Events",
    description:
      "Vegetarian banquet hall with catering in Mulund West, Mumbai for weddings, engagements, social celebrations, corporate events and prarthana sabha. Parking and bride-groom room available.",
    path: "/banquet-catering",
  },
  "/gallery": {
    title: "Gallery | Bandhan Events — Decor, Weddings & Celebrations",
    description:
      "Browse decoration, wedding, banquet, celebration and corporate event photography by Bandhan Events in Mumbai.",
    path: "/gallery",
  },
  "/gifting": {
    title: "Gifting | Bandhan Events — Wedding & Corporate Gifts in Mumbai",
    description:
      "Curated wedding, corporate and occasion gifting by Bandhan Events, Mumbai. Hampers and keepsakes assembled for every celebration.",
    path: "/gifting",
  },
  "/contact": {
    title: "Contact & Enquire | Bandhan Events, Mulund West, Mumbai",
    description:
      "Enquire about event decoration, banquet and catering in Mulund West, Mumbai. Find our address, send an enquiry or reach us on WhatsApp.",
    path: "/contact",
  },
  "/404": {
    title: "Page Not Found | Bandhan Events",
    description:
      "The page you were looking for could not be found. Explore event decoration, banquet and catering by Bandhan Events in Mulund West, Mumbai.",
    path: "/404",
    noindex: true,
  },
};

/**
 * Address shape used by the structured-data builders. The dashboard can edit
 * these values, so the builders take them as an argument rather than reading a
 * compile-time constant — otherwise the venue's published address and its
 * structured data could drift apart.
 */
export interface AddressLike {
  street: string;
  locality: string;
  area: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

function postalAddress(address: AddressLike) {
  return {
    "@type": "PostalAddress",
    streetAddress: `${address.street}, ${address.locality}`,
    addressLocality: `${address.area}, ${address.city}`,
    addressRegion: address.state,
    postalCode: address.postalCode,
    // schema.org expects an ISO 3166-1 country code, not the country name.
    addressCountry: address.country.toLowerCase() === "india" ? "IN" : address.country,
  };
}

/** LocalBusiness / EventVenue / Organization structured data (factual only). */
export function buildLocalBusinessJsonLd(address: AddressLike = siteConfig.address) {
  return {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "EventVenue"],
    "@id": `${siteConfig.url}/#business`,
    name: siteConfig.name,
    slogan: siteConfig.tagline,
    url: siteConfig.url,
    image: `${siteConfig.url}${siteConfig.ogImage}`,
    description:
      "Bandhan Events offers wedding decoration, event decor, banquet and catering services in Mulund West, Mumbai.",
    address: postalAddress(address),
    areaServed: siteConfig.areasServed.map((name) => ({ "@type": "Place", name })),
    knowsAbout: [
      "Wedding decoration",
      "Event decoration",
      "Stage design",
      "Floral styling",
      "Venue styling",
      "Banquet",
      "Vegetarian catering",
    ],
  };
}

export function buildOrganizationJsonLd(address: AddressLike = siteConfig.address) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteConfig.url}/#organization`,
    name: siteConfig.name,
    slogan: siteConfig.tagline,
    url: siteConfig.url,
    logo: `${siteConfig.url}/logo-footer.png`,
    address: postalAddress(address),
  };
}

export function buildBreadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${siteConfig.url}${item.path}`,
    })),
  };
}

/** Shared "About" copy used on home + about page — approved wording only. */
export const aboutCopy = {
  eyebrow: "Know Bandhan",
  heading: "A New Home for Timeless Celebrations",
  paragraphs: [
    "Bandhan Events is building a new destination for celebrations in Mumbai — bringing together event decoration, venue experiences and hospitality under one name.",
    "The brand is new; the craft is not. Our work is backed by decades of experience in the event-decoration industry, designing and delivering weddings and celebrations across Mumbai.",
  ],
};
