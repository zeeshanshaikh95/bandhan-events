/**
 * ---------------------------------------------------------------------------
 * MONEY
 * ---------------------------------------------------------------------------
 * Every monetary figure in the quotation/invoice module is stored and
 * calculated as an **integer number of paise**. Binary floating point cannot
 * represent 0.1 exactly, so sums like 0.1 + 0.2 drift — unacceptable on a
 * document a customer pays against.
 *
 * Rupees only appear at the edges: the dashboard sends and receives rupees,
 * and the conversion is rounded once, here, and nowhere else.
 */

export const PAISE_PER_RUPEE = 100;

/** Rupees (possibly fractional) → integer paise. */
export function toPaise(rupees: number): number {
  if (!Number.isFinite(rupees)) return 0;
  return Math.round(rupees * PAISE_PER_RUPEE);
}

/** Integer paise → rupees, rounded to two decimals. */
export function toRupees(paise: number): number {
  if (!Number.isFinite(paise)) return 0;
  return Math.round(paise) / PAISE_PER_RUPEE;
}

/** Multiplies an amount by a quantity that may itself be fractional. */
export function multiplyPaise(paise: number, quantity: number): number {
  return Math.round(paise * quantity);
}

/** Percentage of an amount, in paise, rounded to the nearest paise. */
export function percentageOfPaise(paise: number, percent: number): number {
  if (!Number.isFinite(percent) || percent === 0) return 0;
  return Math.round((paise * percent) / 100);
}

/**
 * Formats paise as Indian Rupees for documents and logs.
 * @example formatPaise(15000000) → "₹1,50,000.00"
 */
export function formatPaise(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toRupees(paise));
}

/** Total of an array of paise amounts. */
export function sumPaise(amounts: number[]): number {
  return amounts.reduce((total, amount) => total + Math.round(amount), 0);
}
