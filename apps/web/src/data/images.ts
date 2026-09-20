/**
 * ---------------------------------------------------------------------------
 * CENTRAL IMAGE REGISTRY
 * ---------------------------------------------------------------------------
 * Every photography reference on the site lives here. To swap in real
 * Bandhan Events photography later, replace the files in /public/images
 * (keep the same filenames) or drop new files in and update the entries
 * below — no component changes required.
 *
 * All current images are curated placeholder photography (Unsplash license).
 * TODO: Replace with actual Bandhan Events photography.
 */

export interface SiteImage {
  src: string;
  alt: string;
  /** Intrinsic aspect ratio (w/h) used to reserve space and avoid layout shift. */
  width?: number;
  height?: number;
}

/** One re-encoded width of a source image (see scripts/optimize-images.mjs). */
export interface ImageVariant {
  w: number;
  src: string;
}

/**
 * Entry in the generated manifest. `width`/`height` are the source image's
 * native dimensions; `variants` are the responsive WebP derivatives that
 * actually ship to visitors.
 */
export interface ImageManifestEntry {
  width: number;
  height: number;
  variants: ImageVariant[];
}

export type ImageManifest = Record<string, ImageManifestEntry | undefined>;

const img = (src: string, alt: string): SiteImage => ({
  src,
  alt,
  width: 1600,
  height: 1067,
});

export const images = {
  hero: img("/images/hero.webp", "Elegant banquet hall dressed for an evening celebration"),

  // Decorator work
  decorStage: img("/images/decor-stage.webp", "Wedding stage design with warm ambient lighting"),
  decorArch: img("/images/decor-arch.webp", "Floral wedding arch set in an outdoor ceremony"),
  decorFloral: img("/images/decor-floral.webp", "Fresh floral styling in soft seasonal tones"),
  decorTable: img("/images/decor-table.webp", "Wedding table decor with florals and candles"),
  decorSetting: img("/images/decor-setting.webp", "Fine table setting styled for a celebration"),
  decorCeremony: img("/images/decor-ceremony.webp", "Ceremony aisle and seating dressed for a wedding"),
  decorBouquet: img("/images/decor-bouquet.webp", "Hand-tied bridal bouquet in muted tones"),
  decorOutdoor: img("/images/decor-outdoor.webp", "Open-air venue styled for an evening function"),
  lightAmbience: img("/images/light-1.webp", "Warm lighting and candlelight creating event ambience"),
  flowersAlt: img("/images/flowers-2.webp", "Floral arrangements prepared for event styling"),
  flowersAlt2: img("/images/flowers-3.webp", "Seasonal flowers used in venue decoration"),

  // Couples / weddings
  coupleHands: img("/images/couple-1.webp", "Bride and groom holding hands on their wedding day"),
  coupleWalk: img("/images/couple-2.webp", "Newly-wed couple walking through their venue"),
  coupleEvening: img("/images/couple-3.webp", "Couple at an evening wedding celebration"),
  coupleIndian: img("/images/couple-indian.webp", "Indian couple at their wedding ceremony"),

  // Banquet & catering
  diningFine: img("/images/dining-1.webp", "Elegant dining room set for a hosted dinner"),
  diningHall: img("/images/dining-2.webp", "Banquet dining space arranged for guests"),
  diningTable: img("/images/dining-3.webp", "Celebration table laid with dinner service"),
  chefPlating: img("/images/chef-1.webp", "Chef plating a dish in the event kitchen"),
  banquetHall: img("/images/banquet-1.webp", "Banquet hall interior prepared for an event"),
  banquetSetup: img("/images/banquet-2.webp", "Banquet seating arranged for a family function"),

  // Events
  celebrationSparkler: img("/images/celebration-1.webp", "Guests celebrating with sparklers at an event"),
  celebrationDance: img("/images/celebration-2.webp", "Guests dancing at a social celebration"),

  // Corporate
  corporateGala: img("/images/corporate-1.webp", "Corporate event guests at a formal gathering"),
  corporateConference: img("/images/corporate-2.webp", "Conference hall set up for a corporate event"),
  corporateStage: img("/images/corporate-3.webp", "Speaker on stage at a corporate function"),
  corporateLounge: img("/images/corporate-4.webp", "Corporate lounge space styled for networking"),

  // Gifting
  giftBox: img("/images/gift-1.webp", "Wrapped gift box tied with ribbon"),
  giftWrap: img("/images/gift-2.webp", "Elegantly wrapped gifts stacked together"),
  giftTable: img("/images/gift-3.webp", "Curated gifts arranged on a table"),

  // Prayer / prarthana sabha
  candleDiya: img("/images/candle-1.webp", "Candles and diyas at a prayer gathering"),
} as const;

/**
 * Fallback for any image that may be missing — used by <SmartImage /> to
 * avoid broken-image icons during development.
 */
export const imageFallback = "/images/hero.webp";
