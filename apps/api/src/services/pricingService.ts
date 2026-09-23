import type { LineItemInput, PricingTotals } from "@bandhan/shared";
import { multiplyPaise, percentageOfPaise, sumPaise, toPaise, toRupees } from "@/utils/money";

/**
 * ---------------------------------------------------------------------------
 * PRICING
 * ---------------------------------------------------------------------------
 * The single place quotation and invoice totals are computed. The dashboard
 * shows a live preview, but its arithmetic is never trusted — every write
 * recalculates from the line items here, in integer paise.
 *
 * Order of operations per line:
 *
 *   gross           = unit price × quantity
 *   discount amount = gross × discount %
 *   net             = gross − discount
 *   tax amount      = net × tax %
 *   line total      = net + tax
 *
 * Totals are the sums of the per-line figures, so a printed total always
 * equals the sum of the printed rows — there is no separate document-level
 * discount the customer cannot reconcile against the lines.
 *
 * Tax is charged only where a line item asks for it. There is no default GST
 * rate in this system, and no GST summary block is emitted anywhere.
 *
 * Everything in this file is named `…Paise`; rupee figures exist only in
 * `toPricingTotals`, which is the boundary the API returns through.
 */

export interface CalculatedLineItem {
  category: string;
  description: string;
  quantity: number;
  unit: string;
  unitPricePaise: number;
  discountPercent: number;
  discountAmountPaise: number;
  taxPercent: number;
  taxAmountPaise: number;
  lineTotalPaise: number;
}

export interface CalculatedTotals {
  subtotalPaise: number;
  discountAmountPaise: number;
  taxAmountPaise: number;
  grandTotalPaise: number;
  advanceRequiredPaise: number;
  balancePaise: number;
}

export function calculateLineItem(input: LineItemInput): CalculatedLineItem {
  const unitPricePaise = toPaise(input.unitPrice);
  const quantity = input.quantity;
  const discountPercent = input.discountPercent ?? 0;
  const taxPercent = input.taxPercent ?? 0;

  const grossPaise = multiplyPaise(unitPricePaise, quantity);
  const discountAmountPaise = percentageOfPaise(grossPaise, discountPercent);
  const netPaise = grossPaise - discountAmountPaise;
  const taxAmountPaise = percentageOfPaise(netPaise, taxPercent);

  return {
    category: input.category,
    description: input.description,
    quantity,
    unit: input.unit ?? "lump-sum",
    unitPricePaise,
    discountPercent,
    taxPercent,
    discountAmountPaise,
    taxAmountPaise,
    lineTotalPaise: netPaise + taxAmountPaise,
  };
}

export function calculateLineItems(inputs: LineItemInput[]): CalculatedLineItem[] {
  return inputs.map(calculateLineItem);
}

/**
 * Derives the totals block. An advance larger than the grand total is a
 * data-entry error, not a credit note, so it is clamped to the total.
 */
export function calculateTotals(
  lineItems: CalculatedLineItem[],
  advancePaise: number
): CalculatedTotals {
  const grossPerLine = lineItems.map((item) => multiplyPaise(item.unitPricePaise, item.quantity));

  const subtotalPaise = sumPaise(grossPerLine);
  const discountAmountPaise = sumPaise(lineItems.map((item) => item.discountAmountPaise));
  const taxAmountPaise = sumPaise(lineItems.map((item) => item.taxAmountPaise));
  const grandTotalPaise = sumPaise(lineItems.map((item) => item.lineTotalPaise));

  const advanceRequiredPaise = Math.max(
    0,
    Math.min(Math.round(advancePaise || 0), grandTotalPaise)
  );

  return {
    subtotalPaise,
    discountAmountPaise,
    taxAmountPaise,
    grandTotalPaise,
    advanceRequiredPaise,
    balancePaise: grandTotalPaise - advanceRequiredPaise,
  };
}

/** Converts a stored totals subdocument (paise) into the rupee DTO shape. */
export function toPricingTotals(totals: Partial<CalculatedTotals> | null | undefined): PricingTotals {
  return {
    subtotal: toRupees(totals?.subtotalPaise ?? 0),
    discountAmount: toRupees(totals?.discountAmountPaise ?? 0),
    taxAmount: toRupees(totals?.taxAmountPaise ?? 0),
    grandTotal: toRupees(totals?.grandTotalPaise ?? 0),
    advanceRequired: toRupees(totals?.advanceRequiredPaise ?? 0),
    balance: toRupees(totals?.balancePaise ?? 0),
  };
}

/** Maps a stored line item (paise) into the rupee DTO shape. */
export function toLineItemDto(item: any) {
  return {
    id: String(item._id ?? ""),
    category: item.category,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit || "lump-sum",
    unitPrice: toRupees(item.unitPricePaise),
    discountPercent: item.discountPercent ?? 0,
    discountAmount: toRupees(item.discountAmountPaise),
    taxPercent: item.taxPercent ?? 0,
    taxAmount: toRupees(item.taxAmountPaise),
    lineTotal: toRupees(item.lineTotalPaise),
  };
}
