import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

/**
 * ---------------------------------------------------------------------------
 * COUNTER
 * ---------------------------------------------------------------------------
 * Backing store for human-readable document numbers (BE-QTN-2026-0001).
 *
 * `findOneAndUpdate` with `$inc` is atomic in MongoDB, so two concurrent
 * quotation creations can never receive the same sequence number — which is
 * exactly why the number is never generated in the browser.
 *
 * The document `_id` is the counter key itself (e.g. "quotation:2026"), so the
 * collection stays small and every key is trivially inspectable.
 */

const counterSchema = new Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { versionKey: false, timestamps: true }
);

export type CounterDocument = HydratedDocument<InferSchemaType<typeof counterSchema>>;

export const Counter = model("Counter", counterSchema);
