import { Counter } from "@/models/Counter";

/**
 * ---------------------------------------------------------------------------
 * DOCUMENT NUMBERING
 * ---------------------------------------------------------------------------
 * Numbers are generated server-side from an atomic counter and are stable for
 * the lifetime of the document. `$inc` with `upsert` means concurrent requests
 * are serialised by MongoDB — there is no read-then-write race to lose.
 *
 * Format: `<PREFIX>-<YEAR>-<SEQUENCE padded to 4>`
 *   BE-QTN-2026-0001
 *   BE-INV-2026-0001
 */

export const DOC_PREFIX = {
  quotation: "BE-QTN",
  invoice: "BE-INV",
  receipt: "BE-RCP",
} as const;

export type DocKind = keyof typeof DOC_PREFIX;

/** Atomically increments and returns the next value for a counter key. */
export async function nextSequence(counterKey: string): Promise<number> {
  const counter = await Counter.findByIdAndUpdate(
    counterKey,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  if (!counter) {
    // Only reachable if the write failed in a way Mongo did not surface.
    throw new Error(`Could not allocate a sequence number for "${counterKey}".`);
  }

  return counter.seq;
}

export function formatDocNumber(prefix: string, year: number, sequence: number): string {
  return `${prefix}-${year}-${String(sequence).padStart(4, "0")}`;
}

/**
 * Allocates the next document number for a kind in a given year.
 * The counter key includes the year so each year restarts at 0001.
 */
export async function allocateDocumentNumber(
  kind: DocKind,
  date: Date = new Date()
): Promise<string> {
  const year = date.getFullYear();
  const sequence = await nextSequence(`${kind}:${year}`);
  return formatDocNumber(DOC_PREFIX[kind], year, sequence);
}
