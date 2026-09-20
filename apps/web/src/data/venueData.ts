import { images, type SiteImage } from "@/data/images";

/**
 * ---------------------------------------------------------------------------
 * BANQUET & CATERING DIVISION DATA
 * ---------------------------------------------------------------------------
 * Facts below are supplied by the owners. Do not invent seating capacities,
* AC claims, menus, pricing or awards — placeholders are marked with TODO.
 */

export const venueIntro = {
  eyebrow: "Banquet & Catering",
  heading: "Your Celebration, Our Space",
  description:
    "A thoughtfully equipped venue in Mulund West for weddings, engagements, social celebrations, corporate events and special occasions — supported by catering and event services under one roof.",
};

export interface VenueFacility {
  title: string;
  description: string;
}

/** Only owner-confirmed facilities and policies appear here. */
export const venueFacilities: VenueFacility[] = [
  {
    title: "Vegetarian Catering",
    description:
      "Pure vegetarian catering for every occasion hosted at the venue.",
  },
  {
    title: "Alcohol-Free Venue",
    description:
      "Alcohol is not permitted anywhere on the premises.",
  },
  {
    title: "On-Site Parking",
    description:
      "Parking available for approximately 15 vehicles.",
  },
  {
    title: "Bride & Groom Room",
    description:
      "A private room for the bride and groom to prepare and rest.",
  },
];

export interface EventCategory {
  id: string;
  title: string;
  description: string;
  image: SiteImage;
  /** Which division this event primarily belongs to. */
  division: "banquet" | "decorator" | "both";
  whatsappMessageKey: "general" | "decorator" | "banquet";
}

/** Reusable event categories shared by home, banquet and decorator pages. */
export const eventCategories: EventCategory[] = [
  {
    id: "weddings",
    title: "Weddings",
    description:
      "Complete wedding celebrations — decor, venue and catering planned around your rituals and your guests.",
    image: images.coupleIndian,
    division: "both",
    whatsappMessageKey: "general",
  },
  {
    id: "engagements",
    title: "Engagements",
    description:
      "Intimate or grand engagement ceremonies hosted and styled with care.",
    image: images.coupleHands,
    division: "banquet",
    whatsappMessageKey: "banquet",
  },
  {
    id: "social-celebrations",
    title: "Social Celebrations",
    description:
      "Birthdays, anniversaries and family gatherings celebrated in style.",
    image: images.celebrationDance,
    division: "banquet",
    whatsappMessageKey: "banquet",
  },
  {
    id: "corporate-events",
    title: "Corporate Events",
    description:
      "Conferences, launches and corporate gatherings managed end to end.",
    image: images.corporateConference,
    division: "both",
    whatsappMessageKey: "general",
  },
  {
    id: "prarthana-sabha",
    title: "Prarthana Sabha",
    description:
      "Prayer meetings and memorial gatherings held with dignity and quiet hospitality.",
    image: images.candleDiya,
    division: "banquet",
    whatsappMessageKey: "banquet",
  },
  {
    id: "special-occasions",
    title: "Special Occasions",
    description:
      "Every milestone deserves a setting — tell us the occasion and we'll shape the evening.",
    image: images.celebrationSparkler,
    division: "both",
    whatsappMessageKey: "general",
  },
];

/** Venue gallery for the banquet page + home preview. */
// TODO: Replace with actual Bandhan Events venue photography.
export const venueGallery: SiteImage[] = [
  images.banquetHall,
  images.diningFine,
  images.diningHall,
  images.banquetSetup,
  images.diningTable,
  images.decorSetting,
];

/** Chef / catering visuals used on the banquet page. */
export const cateringImages = {
  primary: images.chefPlating,
  secondary: images.diningFine,
  tertiary: images.diningTable,
} as const;
