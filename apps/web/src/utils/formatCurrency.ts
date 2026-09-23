/**
 * Indian Rupee formatting utility.
 * Centralized so every finance page uses the same format.
 */

const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const compactFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

/**
 * Format a number as Indian Rupees.
 * @example formatCurrency(150000) → "₹1,50,000"
 */
export function formatCurrency(amount: number): string {
  return formatter.format(amount);
}

/**
 * Format a number as compact Indian Rupees.
 * @example formatCurrencyCompact(150000) → "₹1.5L"
 */
export function formatCurrencyCompact(amount: number): string {
  return compactFormatter.format(amount);
}

/**
 * Format a number with Indian comma grouping (no currency symbol).
 * @example formatNumber(150000) → "1,50,000"
 */
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount);
}

/**
 * Parse a currency string back to a number.
 * @example parseCurrency("₹1,50,000") → 150000
 */
export function parseCurrency(value: string): number {
  return Number(value.replace(/[₹,\s]/g, "")) || 0;
}
