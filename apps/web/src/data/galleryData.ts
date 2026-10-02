import { images, type SiteImage } from "@/data/images";

/**
 * ---------------------------------------------------------------------------
 * GALLERY DATA
 * ---------------------------------------------------------------------------
 * The /gallery page and the homepage preview strip read from this file.
 *
 * Every entry below is real Bandhan Events photography supplied by the client.
 * The optimised WebP copies live in public/images and are declared in
 * src/data/images.ts, which is also where the alt text lives.
 *
 * Categories cover only the event types the supplied photographs actually
 * show — no engagement, catering-only or prarthana sabha frames were supplied,
 * so no such category is offered.
 */

export const galleryCategories = [
  "All",
  "Weddings",
  "Birthdays",
  "Banquet",
  "Decor",
  "Corporate",
] as const;

export type GalleryCategory = (typeof galleryCategories)[number];

export interface GalleryItem extends SiteImage {
  category: Exclude<GalleryCategory, "All">;
  caption?: string;
}

/**
 * Ordered so the homepage preview — which takes the first six items — leads
 * with a broad mix of the work rather than a run from a single category.
 */
export const galleryItems: GalleryItem[] = [
  { ...images.galleryWeddingFloralStage, category: "Weddings", caption: "Floral wedding stage" },
  { ...images.galleryBanquetEntrance, category: "Banquet", caption: "Venue entrance" },
  { ...images.galleryBirthdayNeonGlow, category: "Birthdays", caption: "Birthday stage" },
  { ...images.galleryWeddingPinkFloralStage, category: "Weddings", caption: "Wedding stage" },
  { ...images.galleryCorporateGalaStage, category: "Corporate", caption: "Corporate gala" },
  { ...images.galleryFloralChandelierBackdrop, category: "Decor", caption: "Floral chandelier" },
  { ...images.galleryBirthdayRoseGoldStage, category: "Birthdays", caption: "Milestone birthday" },
  { ...images.galleryBanquetRoundTables, category: "Banquet", caption: "Banquet seating" },
  { ...images.galleryBirthdayPinkFloralStage, category: "Birthdays", caption: "Birthday stage" },
  { ...images.galleryBlossomStageBackdrop, category: "Decor", caption: "Stage backdrop" },
  { ...images.galleryBanquetLuxuryBuffet, category: "Banquet", caption: "Buffet service" },
  { ...images.galleryBirthdayNeonGlowCrazy, category: "Birthdays", caption: "Neon birthday decor" },
  { ...images.galleryBanquetTheatreSeating, category: "Banquet", caption: "Banquet hall" },
  { ...images.galleryFloralTower, category: "Decor", caption: "Floral installation" },
  { ...images.galleryBirthdayRoseGoldWelcome, category: "Birthdays", caption: "Welcome display" },
  { ...images.galleryGrandDrapedHall, category: "Corporate", caption: "Draped event hall" },
  { ...images.galleryBanquetAisleSeating, category: "Banquet", caption: "Ceremony aisle" },
  { ...images.galleryBirthdayPinkWelcomeBoard, category: "Birthdays", caption: "Birthday welcome board" },
  { ...images.galleryCeremonyWhiteChairs, category: "Banquet", caption: "Ceremony seating" },
];
