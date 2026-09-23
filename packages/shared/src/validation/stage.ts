import { z } from "zod";
import {
  STAGE_BACKDROP_VALUES,
  STAGE_EXTRA_DECOR_VALUES,
  STAGE_FLOWER_VALUES,
  STAGE_FURNITURE_VALUES,
  STAGE_LAYOUT_VALUES,
  STAGE_LIGHTING_VALUES,
} from "../stageConstants";
import { choiceSchema, optionalText } from "./primitives";

/**
 * Stage-builder configuration carried by a website enquiry.
 *
 * Optional as a whole — only the "Build Your Own Stage" page sends it — but
 * strict once present: every single-choice category must be one of its real
 * options (including "custom"), and the multi-select décor list cannot be
 * empty or contain unknown values. Server-side enforcement means the dashboard
 * never has to interpret free-typed junk.
 */
export const stageConfigurationSchema = z.object({
  layout: choiceSchema(STAGE_LAYOUT_VALUES, "Please choose a stage layout."),
  backdrop: choiceSchema(STAGE_BACKDROP_VALUES, "Please choose a backdrop."),
  flowers: choiceSchema(STAGE_FLOWER_VALUES, "Please choose a floral style."),
  lighting: choiceSchema(STAGE_LIGHTING_VALUES, "Please choose a lighting style."),
  furniture: choiceSchema(STAGE_FURNITURE_VALUES, "Please choose the stage furniture."),
  otherDecor: z
    .array(
      choiceSchema(STAGE_EXTRA_DECOR_VALUES, "Please choose a valid décor option."),
      { invalid_type_error: "Please choose at least one décor option." }
    )
    .min(1, "Please choose at least one décor option.")
    .max(STAGE_EXTRA_DECOR_VALUES.length, "That is more options than we offer."),
  notes: optionalText(500),
});

export type StageConfiguration = z.infer<typeof stageConfigurationSchema>;
