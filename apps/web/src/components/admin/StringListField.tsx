import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { adminInputClass, adminLabelClass } from "@/components/admin/AdminUI";

/**
 * Edits an array of short strings through a textarea, one entry per line.
 *
 * Service lists and menu items arrive as a pasted list far more often than they
 * are typed one at a time, so a "＋ Add row" repeater would be slower to use and
 * harder to reorder. The form state stays a real `string[]`, so the shared Zod
 * schema validates exactly what the API will receive.
 */
export function StringListField<TForm extends FieldValues>({
  control,
  registerPathAsName,
  label,
  hint,
  placeholder,
  rows = 4,
}: {
  control: Control<TForm>;
  /** Full field path, e.g. `services` or `packages.0.menuItems`. */
  registerPathAsName: Path<TForm>;
  label: string;
  hint?: string;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <Controller
      control={control}
      name={registerPathAsName}
      render={({ field }) => {
        const items = Array.isArray(field.value) ? (field.value as string[]) : [];
        return (
          <label className="block">
            <span className={adminLabelClass}>{label}</span>
            <textarea
              rows={rows}
              value={items.join("\n")}
              placeholder={placeholder}
              onChange={(event) =>
                field.onChange(
                  event.target.value
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean)
                )
              }
              onBlur={field.onBlur}
              className={`${adminInputClass} mt-2`}
            />
            {hint && <span className="mt-1.5 block text-[11px] text-charcoal-muted">{hint}</span>}
            {items.length > 0 && (
              <span className="mt-1.5 block text-[11px] text-charcoal-muted">
                {items.length} {items.length === 1 ? "entry" : "entries"}
              </span>
            )}
          </label>
        );
      }}
    />
  );
}
