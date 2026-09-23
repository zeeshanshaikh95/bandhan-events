/**
 * ---------------------------------------------------------------------------
 * BUILD YOUR OWN STAGE — option vocabulary
 * ---------------------------------------------------------------------------
 * Stable slugs + display labels for the six stage-builder choices. Shared by
 * the website wizard, the API's enquiry validation and the dashboard's lead
 * detail view, so a choice can never drift between the three.
 *
 * Labels are display-only and may be reworded freely; values never change once
 * leads reference them.
 */

export const STAGE_LAYOUTS = [
  { value: "traditional", label: "Traditional" },
  { value: "royal", label: "Royal" },
  { value: "floral", label: "Floral" },
  { value: "modern", label: "Modern" },
  { value: "custom", label: "Custom" },
] as const;

export const STAGE_BACKDROPS = [
  { value: "floral", label: "Floral" },
  { value: "fabric", label: "Fabric" },
  { value: "led", label: "LED" },
  { value: "wooden", label: "Wooden" },
  { value: "custom", label: "Custom" },
] as const;

export const STAGE_FLOWERS = [
  { value: "roses", label: "Roses" },
  { value: "marigold", label: "Marigold" },
  { value: "mixed", label: "Mixed" },
  { value: "premium", label: "Premium" },
] as const;

export const STAGE_LIGHTING = [
  { value: "warm", label: "Warm" },
  { value: "fairy-lights", label: "Fairy Lights" },
  { value: "chandeliers", label: "Chandeliers" },
  { value: "led", label: "LED" },
  { value: "spotlights", label: "Spotlights" },
] as const;

export const STAGE_FURNITURE = [
  { value: "sofa", label: "Sofa" },
  { value: "chairs", label: "Chairs" },
  { value: "couple-seating", label: "Couple Seating" },
  { value: "custom", label: "Custom" },
] as const;

export const STAGE_EXTRA_DECOR = [
  { value: "props", label: "Props" },
  { value: "pillars", label: "Pillars" },
  { value: "entrance", label: "Entrance" },
  { value: "welcome-board", label: "Welcome Board" },
  { value: "custom", label: "Custom" },
] as const;

type ValueOf<T extends readonly { value: string }[]> = T[number]["value"];
const values = <T extends readonly { value: string }[]>(list: T) =>
  list.map((option) => option.value) as [ValueOf<T>, ...ValueOf<T>[]];

export type StageLayout = ValueOf<typeof STAGE_LAYOUTS>;
export type StageBackdrop = ValueOf<typeof STAGE_BACKDROPS>;
export type StageFlowers = ValueOf<typeof STAGE_FLOWERS>;
export type StageLighting = ValueOf<typeof STAGE_LIGHTING>;
export type StageFurniture = ValueOf<typeof STAGE_FURNITURE>;
export type StageExtraDecor = ValueOf<typeof STAGE_EXTRA_DECOR>;

export const STAGE_LAYOUT_VALUES = values(STAGE_LAYOUTS);
export const STAGE_BACKDROP_VALUES = values(STAGE_BACKDROPS);
export const STAGE_FLOWER_VALUES = values(STAGE_FLOWERS);
export const STAGE_LIGHTING_VALUES = values(STAGE_LIGHTING);
export const STAGE_FURNITURE_VALUES = values(STAGE_FURNITURE);
export const STAGE_EXTRA_DECOR_VALUES = values(STAGE_EXTRA_DECOR);

/** The configuration keys a stage enquiry carries (notes is free text). */
export type StageConfigKey =
  | "layout"
  | "backdrop"
  | "flowers"
  | "lighting"
  | "furniture"
  | "otherDecor";

export interface StageCategory {
  key: Exclude<StageConfigKey, "otherDecor">;
  step: number;
  label: string;
  hint: string;
  options: readonly { value: string; label: string }[];
}

/**
 * Ordered exactly as the wizard presents them. `otherDecor` is multi-select
 * and rendered separately, so it is not part of this list.
 */
export const STAGE_CATEGORIES: StageCategory[] = [
  {
    key: "layout",
    step: 1,
    label: "Stage Layout",
    hint: "The shape and character of the platform itself.",
    options: STAGE_LAYOUTS,
  },
  {
    key: "backdrop",
    step: 2,
    label: "Backdrop",
    hint: "What stands behind the stage.",
    options: STAGE_BACKDROPS,
  },
  {
    key: "flowers",
    step: 3,
    label: "Flowers",
    hint: "The floral treatment across the stage.",
    options: STAGE_FLOWERS,
  },
  {
    key: "lighting",
    step: 4,
    label: "Lighting",
    hint: "How the stage is lit through the evening.",
    options: STAGE_LIGHTING,
  },
  {
    key: "furniture",
    step: 5,
    label: "Furniture",
    hint: "Seating placed on the stage.",
    options: STAGE_FURNITURE,
  },
];

/** Step 6 renders as multi-select — a stage usually needs several of these. */
export const STAGE_EXTRA_DECOR_CATEGORY = {
  step: 6,
  label: "Other Décor",
  hint: "Pick everything you would like — props, pillars, entrance, welcome board.",
  options: STAGE_EXTRA_DECOR,
} as const;

/** Structural shape any stage configuration reader (API, admin, WhatsApp
 *  message builder) can consume without depending on the Zod output type. */
export interface StageConfigurationLike {
  layout: string;
  backdrop: string;
  flowers: string;
  lighting: string;
  furniture: string;
  otherDecor?: string[];
  notes?: string;
}

export interface StageChoiceLine {
  label: string;
  value: string;
}

function labelOf(
  options: readonly { value: string; label: string }[],
  value: string
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

/**
 * Human-readable "Layout: Royal" lines for a stored configuration — one
 * owner for how a configuration reads in the dashboard, on WhatsApp and in
 * any future quotation document.
 */
export function stageChoiceLines(config: StageConfigurationLike): StageChoiceLine[] {
  const lines: StageChoiceLine[] = [
    { label: "Layout", value: labelOf(STAGE_LAYOUTS, config.layout) },
    { label: "Backdrop", value: labelOf(STAGE_BACKDROPS, config.backdrop) },
    { label: "Flowers", value: labelOf(STAGE_FLOWERS, config.flowers) },
    { label: "Lighting", value: labelOf(STAGE_LIGHTING, config.lighting) },
    { label: "Furniture", value: labelOf(STAGE_FURNITURE, config.furniture) },
  ];

  const extras = config.otherDecor ?? [];
  if (extras.length > 0) {
    lines.push({
      label: "Other Décor",
      value: extras.map((value) => labelOf(STAGE_EXTRA_DECOR, value)).join(", "),
    });
  }
  if (config.notes?.trim()) {
    lines.push({ label: "Notes", value: config.notes.trim() });
  }

  return lines;
}
