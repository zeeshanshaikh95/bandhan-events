import { images, type SiteImage } from "@/data/images";

/**
 * ---------------------------------------------------------------------------
 * GIFTING DATA
 * ---------------------------------------------------------------------------
 * The gifting catalogue is not finalised — copy below is placeholder text
 * and no pricing is shown anywhere. TODO: Replace with the real catalogue.
 */

export const giftingIntro = {
  eyebrow: "Gifting",
  heading: "Gifts That Carry the Occasion",
  description:
    "Curated gifting from the Bandhan ecosystem — thoughtfully assembled hampers and keepsakes for weddings, corporate occasions and every celebration between.",
};

export interface GiftCollection {
  id: string;
  title: string;
  description: string;
  points: string[];
  image: SiteImage;
}

export const giftCollections: GiftCollection[] = [
  {
    id: "wedding-gifting",
    title: "Wedding Gifting",
    description:
      "Gifts for families, wedding parties and guests — assembled to honour the occasion.",
    points: ["Family gift hampers", "Guest favours", "Trousseau packaging"],
    image: images.giftBox,
  },
  {
    id: "corporate-gifting",
    title: "Corporate Gifting",
    description:
      "Considered corporate gifts for clients, teams and milestone occasions.",
    points: ["Client hampers", "Festive corporate gifts", "Custom branding"],
    image: images.giftWrap,
  },
  {
    id: "occasion-gifting",
    title: "Occasion Gifting",
    description:
      "Festivals, housewarmings, anniversaries — curated for the moment at hand.",
    points: ["Festival hampers", "Milestone keepsakes", "Personal curation"],
    image: images.giftTable,
  },
];

// TODO: Replace with real gifting photography once the catalogue is finalised.
export const giftingGallery: SiteImage[] = [
  images.giftBox,
  images.giftWrap,
  images.giftTable,
  images.decorTable,
  images.flowersAlt,
  images.candleDiya,
];
