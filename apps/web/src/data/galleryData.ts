import { images, type SiteImage } from "@/data/images";

/**
 * ---------------------------------------------------------------------------
 * GALLERY DATA
 * ---------------------------------------------------------------------------
 * The /gallery page and all preview strips read from this file.
 * TODO: Replace with actual Bandhan Events photography.
 */

export const galleryCategories = [
  "All",
  "Decor",
  "Weddings",
  "Banquet",
  "Celebrations",
  "Corporate",
] as const;

export type GalleryCategory = (typeof galleryCategories)[number];

export interface GalleryItem extends SiteImage {
  category: Exclude<GalleryCategory, "All">;
  caption?: string;
}

export const galleryItems: GalleryItem[] = [
  { ...images.decorStage, category: "Decor", caption: "Stage design" },
  { ...images.coupleHands, category: "Weddings", caption: "The wedding day" },
  { ...images.banquetHall, category: "Banquet", caption: "Banquet ready for guests" },
  { ...images.decorFloral, category: "Decor", caption: "Floral styling" },
  { ...images.celebrationDance, category: "Celebrations", caption: "Celebration on the floor" },
  { ...images.corporateGala, category: "Corporate", caption: "Corporate evening" },
  { ...images.decorArch, category: "Decor", caption: "Ceremony arch" },
  { ...images.diningFine, category: "Banquet", caption: "Dining, dressed" },
  { ...images.coupleIndian, category: "Weddings", caption: "Rituals and tradition" },
  { ...images.decorTable, category: "Decor", caption: "Table styling" },
  { ...images.celebrationSparkler, category: "Celebrations", caption: "Send-off sparklers" },
  { ...images.corporateConference, category: "Corporate", caption: "Conference setup" },
  { ...images.decorSetting, category: "Decor", caption: "The tablescape" },
  { ...images.banquetSetup, category: "Banquet", caption: "Family function seating" },
  { ...images.coupleEvening, category: "Weddings", caption: "An evening to remember" },
  { ...images.decorBouquet, category: "Decor", caption: "Bridal bouquet" },
  { ...images.decorCeremony, category: "Weddings", caption: "The vows aisle" },
  { ...images.candleDiya, category: "Celebrations", caption: "Prayer gathering" },
];
