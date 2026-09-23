import {
  useFieldArray,
  useWatch,
  type Control,
  type FieldErrors,
  type FieldValues,
  type UseFormRegister,
} from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import {
  LINE_ITEM_CATEGORIES,
  LINE_ITEM_UNITS,
  type LineItemCategory,
  type LineItemUnit,
} from "@bandhan/shared";
import { adminInputClass, adminLabelClass } from "@/components/admin/AdminUI";
import { formatCurrency } from "@/utils/formatCurrency";
import { cn } from "@/utils/cn";

/**
 * Line-item rows for quotations and invoices.
 *
 * Rows are a two-column block on phones and a single seven-column row on
 * desktop — one set of inputs, reflowed. The totals at the foot are a
 * **display preview** of the arithmetic `pricingService` performs in integer
 * paise; the numbers that get stored are always the server's.
 */

export interface LineItemFormValue {
  category: LineItemCategory;
  description: string;
  quantity: number;
  unit: LineItemUnit;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
}

export const EMPTY_LINE_ITEM: LineItemFormValue = {
  category: "stage-decoration",
  description: "",
  quantity: 1,
  unit: "lump-sum",
  unitPrice: 0,
  discountPercent: 0,
  taxPercent: 0,
};

/** Mirrors `pricingService.calculateLineItem` for preview only. */
function previewLine(item: Partial<LineItemFormValue>) {
  const gross = (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0);
  const discountAmount = (gross * (Number(item.discountPercent) || 0)) / 100;
  const net = gross - discountAmount;
  const taxAmount = (net * (Number(item.taxPercent) || 0)) / 100;

  return { gross, discountAmount, taxAmount, lineTotal: net + taxAmount };
}

const ROW_GRID =
  "grid grid-cols-2 gap-3 lg:grid-cols-[1.3fr_2.2fr_0.6fr_1fr_0.6fr_0.6fr_auto] lg:items-end";

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className={adminLabelClass}>{label}</span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

/**
 * Generic over the owning form so quotations and invoices can both use it
 * without either side widening its own types to `any`.
 */
export function LineItemsEditor<TForm extends FieldValues & { lineItems: LineItemFormValue[] }>({
  control,
  register,
  errors,
}: {
  control: Control<TForm>;
  register: UseFormRegister<TForm>;
  errors: FieldErrors<TForm>;
}) {
  /**
   * The generic above is for the caller's benefit — it keeps quotations and
   * invoices from widening their own form types to `any`. Inside, the field
   * array is necessarily untyped: react-hook-form cannot prove that a generic
   * `TForm` has an array at `lineItems`, so it is narrowed to the untyped API
   * here, once, instead of at every call site.
   */
  const arrayControl = control as Control<any>;
  const arrayRegister = register as UseFormRegister<any>;
  const arrayErrors = errors as FieldErrors<any>;

  const { fields, append, remove } = useFieldArray({ control: arrayControl, name: "lineItems" });
  const watched = (useWatch({ control: arrayControl, name: "lineItems" }) ?? []) as LineItemFormValue[];
  const path = (field: keyof LineItemFormValue, index: number) => `lineItems.${index}.${field}`;

  const preview = watched.map(previewLine);
  const sum = (pick: (line: ReturnType<typeof previewLine>) => number) =>
    preview.reduce((total, line) => total + pick(line), 0);

  const subtotal = sum((line) => line.gross);
  const discountTotal = sum((line) => line.discountAmount);
  const taxTotal = sum((line) => line.taxAmount);
  const grandTotal = sum((line) => line.lineTotal);

  const arrayError = arrayErrors.lineItems?.message as string | undefined;
  const rowErrors = (arrayErrors.lineItems ?? []) as any[];

  return (
    <div className="space-y-4">
      <ul className="space-y-4">
        {fields.map((field, index) => (
          <li key={field.id} className="border border-forest/10 bg-ivory-soft p-4 lg:bg-transparent lg:p-0 lg:pb-4 lg:border-x-0 lg:border-t-0">
            <div className={ROW_GRID}>
              <Field label="Category">
                <select {...arrayRegister(path("category", index))} className={adminInputClass}>
                  {LINE_ITEM_CATEGORIES.map((entry) => (
                    <option key={entry.value} value={entry.value}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Description" className="col-span-2 lg:col-span-1">
                <input
                  {...arrayRegister(path("description", index))}
                  placeholder="Stage decoration with floral centrepiece"
                  className={adminInputClass}
                />
              </Field>

              <Field label="Qty">
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  {...arrayRegister(path("quantity", index), { valueAsNumber: true })}
                  className={adminInputClass}
                />
              </Field>

              <Field label="Unit price ₹">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...arrayRegister(path("unitPrice", index), { valueAsNumber: true })}
                  className={adminInputClass}
                />
              </Field>

              <Field label="Disc %">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  {...arrayRegister(path("discountPercent", index), { valueAsNumber: true })}
                  className={adminInputClass}
                />
              </Field>

              <Field label="Tax %">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  {...arrayRegister(path("taxPercent", index), { valueAsNumber: true })}
                  className={adminInputClass}
                />
              </Field>

              <div className="col-span-2 flex items-end gap-3 lg:col-span-1">
                <Field label="Unit" className="flex-1 lg:hidden">
                  <select {...arrayRegister(path("unit", index))} className={adminInputClass}>
                    {LINE_ITEM_UNITS.map((entry) => (
                      <option key={entry.value} value={entry.value}>
                        {entry.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <select
                  {...arrayRegister(path("unit", index))}
                  aria-label={`Line ${index + 1} unit`}
                  className={cn(adminInputClass, "hidden lg:block lg:w-28")}
                >
                  {LINE_ITEM_UNITS.map((entry) => (
                    <option key={entry.value} value={entry.value}>
                      {entry.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                  aria-label={`Remove line ${index + 1}`}
                  className="mb-0.5 p-2.5 text-charcoal-muted transition hover:text-red-800 disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <p className="mt-2 text-right text-xs text-charcoal-muted lg:hidden">
              Line total <span className="font-medium text-forest">{formatCurrency(preview[index]?.lineTotal ?? 0)}</span>
            </p>

            {rowErrors[index]?.description && (
              <p role="alert" className="mt-1 text-xs text-red-800">
                {rowErrors[index].description.message}
              </p>
            )}
          </li>
        ))}
      </ul>

      <button type="button" onClick={() => append({ ...EMPTY_LINE_ITEM })} className="btn-outline !px-4 !py-2 !text-[11px]">
        <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add line item
      </button>

      {arrayError && (
        <p role="alert" className="text-xs text-red-800">
          {arrayError}
        </p>
      )}

      <dl className="ml-auto max-w-xs space-y-1 border-t border-forest/15 pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-charcoal-muted">Subtotal</dt>
          <dd className="text-charcoal">{formatCurrency(subtotal)}</dd>
        </div>
        {discountTotal > 0 && (
          <div className="flex justify-between">
            <dt className="text-charcoal-muted">Discount</dt>
            <dd className="text-charcoal">− {formatCurrency(discountTotal)}</dd>
          </div>
        )}
        {taxTotal > 0 && (
          <div className="flex justify-between">
            <dt className="text-charcoal-muted">Tax</dt>
            <dd className="text-charcoal">{formatCurrency(taxTotal)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-forest/10 pt-2">
          <dt className="font-medium text-forest">Total</dt>
          <dd className="font-serif text-lg font-medium text-forest">{formatCurrency(grandTotal)}</dd>
        </div>
        <p className="pt-1 text-[10px] text-charcoal-muted">
          Preview only — the saved total is recalculated by the server.
        </p>
      </dl>
    </div>
  );
}
