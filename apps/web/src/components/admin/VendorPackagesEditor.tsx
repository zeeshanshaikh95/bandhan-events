import {
  useFieldArray,
  useWatch,
  type Control,
  type FieldErrors,
  type FieldValues,
  type UseFormRegister,
} from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { adminInputClass, adminLabelClass } from "@/components/admin/AdminUI";
import { StringListField } from "@/components/admin/StringListField";

/**
 * Reusable catering packages for a caterer vendor.
 *
 * A caterer sells the same menu at a handful of price points (₹450 / ₹650 /
 * ₹850 a plate in this market), so the packages are stored once on the vendor
 * and then picked when the caterer is assigned to an event — instead of being
 * retyped on every assignment.
 */

export interface VendorPackageFormValue {
  name: string;
  pricePerPlate: number;
  minimumGuests?: number | null;
  description?: string;
  menuItems: string[];
  active: boolean;
}

export const EMPTY_PACKAGE: VendorPackageFormValue = {
  name: "",
  pricePerPlate: 0,
  minimumGuests: undefined,
  description: "",
  menuItems: [],
  active: true,
};

/**
 * Empty numeric inputs become `undefined` rather than `NaN`/`0`: a blank
 * minimum-guest count must not be stored as a real constraint of zero.
 */
export const asNumber = {
  setValueAs: (value: unknown) =>
    value === "" || value === null || value === undefined ? undefined : Number(value),
};

export function VendorPackagesEditor<TForm extends FieldValues & { packages: VendorPackageFormValue[] }>({
  control,
  register,
  errors,
}: {
  control: Control<TForm>;
  register: UseFormRegister<TForm>;
  errors: FieldErrors<TForm>;
}) {
  /**
   * The generic keeps the owning form type-safe; inside, the field array is
   * untyped once — react-hook-form cannot prove a generic `TForm` has an array
   * at `packages`, so the narrowing happens here rather than at every field.
   */
  const arrayControl = control as Control<any>;
  const arrayRegister = register as UseFormRegister<any>;
  const arrayErrors = errors as FieldErrors<any>;

  const { fields, append, remove } = useFieldArray({ control: arrayControl, name: "packages" });
  const watched = (useWatch({ control: arrayControl, name: "packages" }) ?? []) as VendorPackageFormValue[];

  const rows = (arrayErrors.packages ?? []) as any[];
  const listError = arrayErrors.packages?.message as string | undefined;

  return (
    <div className="space-y-4">
      {listError && (
        <p role="alert" className="border border-red-900/20 bg-red-50/60 px-4 py-3 text-sm text-red-900">
          {listError}
        </p>
      )}

      {fields.length === 0 ? (
        <p className="text-sm text-charcoal-muted">
          No packages yet. Add one for each price point this caterer offers.
        </p>
      ) : (
        <ul className="space-y-5">
          {fields.map((field, index) => {
            const rowError = rows[index] ?? {};
            const preview = Number(watched[index]?.pricePerPlate) || 0;
            const minimum = watched[index]?.minimumGuests;

            return (
              <li key={field.id} className="border border-forest/10 bg-cream/40 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="grid flex-1 gap-4 sm:grid-cols-3">
                    <label className="block sm:col-span-1">
                      <span className={adminLabelClass}>Package name *</span>
                      <input
                        {...arrayRegister(`packages.${index}.name`)}
                        placeholder="Package B"
                        className={`${adminInputClass} mt-2`}
                      />
                      {rowError.name?.message && (
                        <span role="alert" className="mt-1.5 block text-xs text-red-800">
                          {rowError.name.message}
                        </span>
                      )}
                    </label>

                    <label className="block">
                      <span className={adminLabelClass}>Price per plate (₹)</span>
                      <input
                        type="number"
                        min={0}
                        step="1"
                        inputMode="decimal"
                        {...arrayRegister(`packages.${index}.pricePerPlate`, asNumber)}
                        className={`${adminInputClass} mt-2`}
                      />
                      {rowError.pricePerPlate?.message && (
                        <span role="alert" className="mt-1.5 block text-xs text-red-800">
                          {rowError.pricePerPlate.message}
                        </span>
                      )}
                    </label>

                    <label className="block">
                      <span className={adminLabelClass}>Minimum guests</span>
                      <input
                        type="number"
                        min={1}
                        step="1"
                        inputMode="numeric"
                        {...arrayRegister(`packages.${index}.minimumGuests`, asNumber)}
                        className={`${adminInputClass} mt-2`}
                      />
                      {rowError.minimumGuests?.message && (
                        <span role="alert" className="mt-1.5 block text-xs text-red-800">
                          {rowError.minimumGuests.message}
                        </span>
                      )}
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="mt-6 inline-flex items-center gap-1.5 border border-red-900/20 px-3 py-2 text-[11px] font-semibold uppercase tracking-widest2 text-red-900 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Remove
                  </button>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <StringListField
                      control={arrayControl as Control<any>}
                      registerPathAsName={`packages.${index}.menuItems`}
                      label="Menu items"
                      rows={5}
                      hint="One item per line."
                      placeholder={"Paneer tikka\nDal makhani\nJeera rice"}
                    />
                    {rowError.menuItems?.message && (
                      <span role="alert" className="mt-1.5 block text-xs text-red-800">
                        {rowError.menuItems.message}
                      </span>
                    )}
                  </div>

                  <div className="space-y-4">
                    <label className="block">
                      <span className={adminLabelClass}>Notes</span>
                      <textarea
                        rows={2}
                        {...arrayRegister(`packages.${index}.description`)}
                        className={`${adminInputClass} mt-2`}
                      />
                    </label>

                    <label className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        {...arrayRegister(`packages.${index}.active`)}
                        className="h-4 w-4 border-forest/30 accent-forest"
                      />
                      <span className="text-sm text-charcoal">Available for new events</span>
                    </label>

                    {preview > 0 && (
                      <p className="text-[11px] text-charcoal-muted">
                        {formatCurrency(preview)} per plate
                        {minimum ? ` · from ${minimum} guests` : ""}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={() => append({ ...EMPTY_PACKAGE })}
        className="btn-outline !px-5 !py-2 !text-[11px]"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Add package
      </button>
    </div>
  );
}
