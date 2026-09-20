import { images, type SiteImage } from "@/data/images";

/**
 * ---------------------------------------------------------------------------
 * DECORATOR DIVISION DATA
 * ---------------------------------------------------------------------------
 * Everything the /decorators page renders comes from this file.
 */

export interface DecoratorService {
  id: string;
  index: string;
  title: string;
  description: string;
  points: string[];
  image: SiteImage;
}

export const decoratorIntro = {
  eyebrow: "Decorator Division",
  heading: "Decor That Becomes Part of the Memory",
  description:
    "Bandhan Events carries decades of family experience in event decoration into every celebration it designs. From intimate functions to grand wedding stages, our work is built around your occasion — its rituals, its people and its mood.",
};

// TODO: Replace copy + images with confirmed service details and real photography.
export const decoratorServices: DecoratorService[] = [
  {
    id: "wedding-decor",
    index: "01",
    title: "Wedding Decor",
    description:
      "Complete wedding decoration planned around your traditions — from the first haldi to the final vidaai, every corner styled with intention.",
    points: ["Theme & palette planning", "Full-venue styling", "Family function decor"],
    image: images.coupleHands,
  },
  {
    id: "stage-design",
    index: "02",
    title: "Stage Design",
    description:
      "Custom-designed stages that anchor your celebration — built, dressed and lit to become the focal point of every photograph.",
    points: ["Custom stage fabrication", "Backdrops & panels", "Seating & staging plans"],
    image: images.decorStage,
  },
  {
    id: "floral-styling",
    index: "03",
    title: "Floral Styling",
    description:
      "Fresh and artificial floral work, selected and arranged to suit the season, the venue and the mood of your occasion.",
    points: ["Fresh flower decor", "Floral arches & pathways", "Boutonnieres & garlands"],
    image: images.decorFloral,
  },
  {
    id: "venue-styling",
    index: "04",
    title: "Venue Styling",
    description:
      "Entrances, walkways, dining areas and photo corners — the whole venue dressed so guests feel the celebration from the moment they arrive.",
    points: ["Entrance & welcome decor", "Photo booth & corners", "Table & seating styling"],
    image: images.decorSetting,
  },
  {
    id: "lighting-ambience",
    index: "05",
    title: "Lighting & Ambience",
    description:
      "Thoughtful lighting design that flatters the decor, guides the evening and gives every space its own atmosphere.",
    points: ["Warm & ambient lighting", "Fairy & festoon work", "Stage & spot lighting"],
    image: images.lightAmbience,
  },
  {
    id: "mandap-setup",
    index: "06",
    title: "Mandap & Wedding Setup",
    description:
      "Traditional and contemporary mandap designs, erected with care and completed on schedule for your muhurat.",
    points: ["Traditional & modern mandaps", "Complete wedding setup", "On-time installation"],
    image: images.decorArch,
  },
  {
    id: "corporate-social",
    index: "07",
    title: "Corporate & Social Events",
    description:
      "Decor for launches, conferences, anniversaries and private celebrations — professional, punctual and polished.",
    points: ["Corporate branding & staging", "Anniversaries & birthdays", "Community gatherings"],
    image: images.corporateStage,
  },
];

/** Before/after transformation strip. */
// TODO: Replace with real before/after photos of Bandhan Events transformations.
export const decoratorTransformation = {
  eyebrow: "The Transformation",
  heading: "From Empty Grounds to Celebrated Evenings",
  description:
    "Every venue holds potential. Our team plans, builds and styles until the space matches the celebration imagined for it.",
  before: images.decorOutdoor,
  after: images.decorStage,
};

/** Real-work gallery shown on the decorator page. */
// TODO: Replace with actual Bandhan Events work photos.
export const decoratorGallery: SiteImage[] = [
  images.decorStage,
  images.decorArch,
  images.decorFloral,
  images.decorTable,
  images.decorSetting,
  images.decorCeremony,
  images.decorBouquet,
  images.lightAmbience,
];
