import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { z } from "zod";
import {
  DIETARY_OPTIONS,
  RATE_BASES,
  VENDOR_STATUSES,
  VENDOR_STATUS_LABELS,
  VENDOR_TYPES,
  vendorCreateSchema,
  type DietaryOption,
} from "@bandhan/shared";
import { vendorApi } from "@/services/api";
import { ApiClientError } from "@/lib/apiClient";
import {
  VendorPackagesEditor,
  asNumber,
  type VendorPackageFormValue,
} from "@/components/admin/VendorPackagesEditor";
import { StringListField } from "@/components/admin/StringListField";
import {
  AdminSeo,
  FormError,
  LoadingRows,
  PageHeading,
  Panel,
  RetryState,
  TextField,
  adminInputClass,
  adminLabelClass,
} from "@/components/admin/AdminUI";

type VendorFormValues = z.infer<typeof vendorCreateSchema>;

/**
 * The schema's `optionalText`/`default()` transforms make zod's input and output
 * types differ slightly. The form always holds concrete values, so the resolver
 * is pinned to the output shape once, here, instead of widening every field.
 */
const vendorResolver = zodResolver(vendorCreateSchema) as Resolver<VendorFormValues>;

const BLANK_VENDOR: VendorFormValues = {
  name: "",
  type: "caterer",
  status: "ACTIVE",
  phone: "",
  whatsapp: "",
  email: "",
  services: [],
  rateInfo: { basis: "lump-sum", amount: 0 },
  caterer: {
    cuisines: [],
    dietaryOptions: [],
    perPlatePrice: 0,
    staffIncluded: true,
    equipmentIncluded: false,
    servingStaff: 0,
    setupCharges: 0,
    deliveryCharges: 0,
    additionalCharges: 0,
  },
  packages: [],
  confirmDuplicate: false,
};

/**
 * Create and edit vendors and caterers.
 *
 * One form serves every vendor type: the catering block only appears for a
 * caterer, so a photographer is not asked for a per-plate rate. Duplicate names
 * are refused by the API; the operator can override that explicitly, which is
 * why `confirmDuplicate` exists as a visible choice rather than a silent retry.
 */
export default function AdminVendorFormPage() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(vendorId);

  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const existing = useQuery({
    queryKey: ["vendor", vendorId],
    queryFn: () => vendorApi.get(vendorId!),
    enabled: isEdit,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<VendorFormValues>({
    resolver: vendorResolver,
    defaultValues: BLANK_VENDOR,
  });

  const vendorType = watch("type");
  const isCaterer = vendorType === "caterer";
  const confirmDuplicate = watch("confirmDuplicate");

  useEffect(() => {
    const vendor = existing.data;
    if (!vendor) return;
    reset({
      name: vendor.name,
      company: vendor.company || undefined,
      type: vendor.type as VendorFormValues["type"],
      category: vendor.category || undefined,
      status: vendor.status,
      contactPerson: vendor.contactPerson || undefined,
      phone: vendor.phone || "",
      whatsapp: vendor.whatsapp || "",
      email: vendor.email || "",
      address: vendor.address || undefined,
      area: vendor.area || undefined,
      city: vendor.city || undefined,
      description: vendor.description || undefined,
      services: vendor.services,
      rateInfo: {
        basis: vendor.rateInfo.basis as VendorFormValues["rateInfo"]["basis"],
        amount: vendor.rateInfo.amount,
        notes: vendor.rateInfo.notes || undefined,
      },
      notes: vendor.notes || undefined,
      caterer: {
        cuisines: vendor.caterer.cuisines,
        dietaryOptions: vendor.caterer.dietaryOptions as DietaryOption[],
        perPlatePrice: vendor.caterer.perPlatePrice,
        minimumGuestCount: vendor.caterer.minimumGuestCount ?? undefined,
        maximumGuestCount: vendor.caterer.maximumGuestCount ?? undefined,
        staffIncluded: vendor.caterer.staffIncluded,
        equipmentIncluded: vendor.caterer.equipmentIncluded,
        servingStaff: vendor.caterer.servingStaff,
        setupCharges: vendor.caterer.setupCharges,
        deliveryCharges: vendor.caterer.deliveryCharges,
        additionalCharges: vendor.caterer.additionalCharges,
        notes: vendor.caterer.notes || undefined,
      },
      packages: vendor.packages.map<VendorPackageFormValue>((entry) => ({
        name: entry.name,
        pricePerPlate: entry.pricePerPlate,
        minimumGuests: entry.minimumGuests ?? undefined,
        description: entry.description || undefined,
        menuItems: entry.menuItems,
        active: entry.active,
      })),
      confirmDuplicate: false,
    });
  }, [existing.data, reset]);

  const save = useMutation({
    mutationFn: async (values: VendorFormValues) => {
      const payload = { ...values };
      // `whatsapp`/`phone` are `"" | undefined`-tolerant upstream; sending the
      // empty string is how the operator clears a number that was removed.
      delete (payload as Record<string, unknown>).confirmDuplicate;
      return isEdit ? vendorApi.update(vendorId!, payload) : vendorApi.create(payload);
    },
    onSuccess: (vendor) => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      queryClient.invalidateQueries({ queryKey: ["vendor", vendor.id] });
      navigate(`/admin/vendors/${vendor.id}`);
    },
    onError: (error) => {
      if (error instanceof ApiClientError && error.code === "DUPLICATE_VENDOR") {
        setDuplicateWarning(error.message);
        return;
      }
      setDuplicateWarning(null);
    },
  });

  const onSubmit = (values: VendorFormValues) => {
    setDuplicateWarning(null);
    save.mutate(values);
  };

  if (isEdit && existing.isPending) {
    return (
      <>
        <AdminSeo title="Vendor" />
        <Panel>
          <LoadingRows rows={6} columns={2} />
        </Panel>
      </>
    );
  }

  if (isEdit && existing.isError) {
    return (
      <>
        <AdminSeo title="Vendor" />
        <RetryState
          message="We could not load that vendor. It may have been removed."
          onRetry={() => existing.refetch()}
        />
      </>
    );
  }

  const vendorError = save.error;
  const generalError =
    vendorError instanceof ApiClientError && vendorError.code !== "DUPLICATE_VENDOR"
      ? vendorError.message
      : vendorError && !(vendorError instanceof ApiClientError)
        ? (vendorError as Error).message
        : null;

  /** Narrow helper so a field error is rendered exactly where it belongs. */
  const fieldError = (path: keyof VendorFormValues | string): string | undefined => {
    const segments = path.split(".");
    let cursor: unknown = errors;
    for (const segment of segments) {
      if (!cursor || typeof cursor !== "object") return undefined;
      cursor = (cursor as Record<string, unknown>)[segment];
    }
    return (cursor as { message?: string } | undefined)?.message;
  };

  return (
    <>
      <AdminSeo title={isEdit ? "Edit vendor" : "New vendor"} />

      <Link
        to={isEdit ? `/admin/vendors/${vendorId}` : "/admin/vendors"}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest2 text-charcoal-muted hover:text-forest"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to vendors
      </Link>

      <div className="mt-4">
        <PageHeading
          eyebrow={isEdit ? "Vendor" : "New vendor"}
          title={isEdit ? existing.data?.name || "Edit vendor" : "Add a vendor or caterer"}
          description="Suppliers you book for events. Costs and payments recorded against them flow into the same expense and profit figures as the rest of the business."
        />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6" noValidate>
        <FormError message={generalError} />

        {duplicateWarning && (
          <div className="border border-gold/50 bg-gold/5 px-4 py-4">
            <p className="text-sm text-gold-deep">{duplicateWarning}</p>
            <label className="mt-3 flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={confirmDuplicate}
                onChange={(event) => setValue("confirmDuplicate", event.target.checked)}
                className="h-4 w-4 border-forest/30 accent-forest"
              />
              <span className="text-sm text-charcoal">
                These are genuinely two different vendors — save this one anyway.
              </span>
            </label>
          </div>
        )}

        <Panel title="Basic information">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <TextField
              id="vendor-name"
              label="Vendor name"
              required
              autoComplete="off"
              placeholder="Shreeji Caterers"
              error={fieldError("name")}
              {...register("name")}
            />

            <label className="block">
              <span className={adminLabelClass}>Vendor type *</span>
              <select {...register("type")} className={`${adminInputClass} mt-2`}>
                {VENDOR_TYPES.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </select>
              {fieldError("type") && (
                <span role="alert" className="mt-1.5 block text-xs text-red-800">
                  {fieldError("type")}
                </span>
              )}
            </label>

            <TextField
              id="vendor-company"
              label="Company / firm"
              autoComplete="off"
              error={fieldError("company")}
              {...register("company")}
            />

            <TextField
              id="vendor-category"
              label="Category"
              hint="Optional grouping, e.g. “Premium caterers”."
              autoComplete="off"
              error={fieldError("category")}
              {...register("category")}
            />

            <label className="block">
              <span className={adminLabelClass}>Status</span>
              <select {...register("status")} className={`${adminInputClass} mt-2`}>
                {VENDOR_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {VENDOR_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Panel>

        <Panel title="Contact">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <TextField
              id="vendor-contact-person"
              label="Contact person"
              autoComplete="off"
              error={fieldError("contactPerson")}
              {...register("contactPerson")}
            />
            <TextField
              id="vendor-phone"
              label="Phone"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              placeholder="+91 98XXX XXXXX"
              error={fieldError("phone")}
              {...register("phone")}
            />
            <TextField
              id="vendor-whatsapp"
              label="WhatsApp"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              hint="Leave blank to use the phone number."
              error={fieldError("whatsapp")}
              {...register("whatsapp")}
            />
            <TextField
              id="vendor-email"
              label="Email"
              type="email"
              autoComplete="off"
              error={fieldError("email")}
              {...register("email")}
            />
          </div>
        </Panel>

        <Panel title="Location">
          <div className="grid gap-4 p-5 sm:grid-cols-3">
            <TextField
              id="vendor-area"
              label="Area"
              autoComplete="off"
              placeholder="Mulund West"
              error={fieldError("area")}
              {...register("area")}
            />
            <TextField
              id="vendor-city"
              label="City"
              autoComplete="off"
              placeholder="Mumbai"
              error={fieldError("city")}
              {...register("city")}
            />
            <div className="sm:col-span-3">
              <label className="block">
                <span className={adminLabelClass}>Address</span>
                <textarea
                  rows={2}
                  {...register("address")}
                  className={`${adminInputClass} mt-2`}
                />
                {fieldError("address") && (
                  <span role="alert" className="mt-1.5 block text-xs text-red-800">
                    {fieldError("address")}
                  </span>
                )}
              </label>
            </div>
          </div>
        </Panel>

        <Panel title="Services and rates">
          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <StringListField
              control={control}
              registerPathAsName="services"
              label="Services offered"
              rows={5}
              hint="One service per line, e.g. “Stage decoration”."
              placeholder={"Stage decoration\nFloral styling\nMandap"}
            />

            <div className="space-y-4">
              <label className="block">
                <span className={adminLabelClass}>Rate basis</span>
                <select {...register("rateInfo.basis")} className={`${adminInputClass} mt-2`}>
                  {RATE_BASES.map((entry) => (
                    <option key={entry.value} value={entry.value}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className={adminLabelClass}>Indicative rate (₹)</span>
                <input
                  type="number"
                  min={0}
                  step="1"
                  inputMode="decimal"
                  {...register("rateInfo.amount", asNumber)}
                  className={`${adminInputClass} mt-2`}
                />
                <span className="mt-1.5 block text-[11px] text-charcoal-muted">
                  A rough guide only. What the business actually pays is the agreed cost on each event.
                </span>
                {fieldError("rateInfo.amount") && (
                  <span role="alert" className="mt-1.5 block text-xs text-red-800">
                    {fieldError("rateInfo.amount")}
                  </span>
                )}
              </label>

              <label className="block">
                <span className={adminLabelClass}>Rate notes</span>
                <textarea
                  rows={2}
                  {...register("rateInfo.notes")}
                  placeholder="Rates exclude transport."
                  className={`${adminInputClass} mt-2`}
                />
              </label>
            </div>

            <div className="sm:col-span-2">
              <label className="block">
                <span className={adminLabelClass}>Description</span>
                <textarea
                  rows={3}
                  {...register("description")}
                  className={`${adminInputClass} mt-2`}
                />
                {fieldError("description") && (
                  <span role="alert" className="mt-1.5 block text-xs text-red-800">
                    {fieldError("description")}
                  </span>
                )}
              </label>
            </div>
          </div>
        </Panel>

        {isCaterer && (
          <>
            <Panel
              title="Catering"
              description="What this caterer can serve, and the charges that sit outside the per-plate rate."
            >
              <div className="grid gap-5 p-5 sm:grid-cols-2">
                <StringListField
                  control={control}
                  registerPathAsName="caterer.cuisines"
                  label="Cuisines"
                  rows={4}
                  placeholder={"North Indian\nGujarati\nMaharashtrian"}
                />

                <div>
                  <span className={adminLabelClass}>Dietary options</span>
                  <Controller
                    control={control}
                    name="caterer.dietaryOptions"
                    render={({ field }) => {
                      const selected = (field.value ?? []) as DietaryOption[];
                      return (
                        <div className="mt-2 space-y-2">
                          {DIETARY_OPTIONS.map((option) => (
                            <label key={option.value} className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={selected.includes(option.value)}
                                onChange={(event) =>
                                  field.onChange(
                                    event.target.checked
                                      ? [...selected, option.value]
                                      : selected.filter((entry) => entry !== option.value)
                                  )
                                }
                                className="h-4 w-4 border-forest/30 accent-forest"
                              />
                              <span className="text-sm text-charcoal">{option.label}</span>
                            </label>
                          ))}
                        </div>
                      );
                    }}
                  />
                </div>

                <label className="block">
                  <span className={adminLabelClass}>Default price per plate (₹)</span>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    inputMode="decimal"
                    {...register("caterer.perPlatePrice", asNumber)}
                    className={`${adminInputClass} mt-2`}
                  />
                  {fieldError("caterer.perPlatePrice") && (
                    <span role="alert" className="mt-1.5 block text-xs text-red-800">
                      {fieldError("caterer.perPlatePrice")}
                    </span>
                  )}
                </label>

                <label className="block">
                  <span className={adminLabelClass}>Serving staff included</span>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    inputMode="numeric"
                    {...register("caterer.servingStaff", asNumber)}
                    className={`${adminInputClass} mt-2`}
                  />
                  <span className="mt-1.5 block text-[11px] text-charcoal-muted">
                    Number of servers provided at no extra charge.
                  </span>
                </label>

                <label className="block">
                  <span className={adminLabelClass}>Minimum guests</span>
                  <input
                    type="number"
                    min={1}
                    step="1"
                    inputMode="numeric"
                    {...register("caterer.minimumGuestCount", asNumber)}
                    className={`${adminInputClass} mt-2`}
                  />
                  {fieldError("caterer.minimumGuestCount") && (
                    <span role="alert" className="mt-1.5 block text-xs text-red-800">
                      {fieldError("caterer.minimumGuestCount")}
                    </span>
                  )}
                </label>

                <label className="block">
                  <span className={adminLabelClass}>Maximum guests</span>
                  <input
                    type="number"
                    min={1}
                    step="1"
                    inputMode="numeric"
                    {...register("caterer.maximumGuestCount", asNumber)}
                    className={`${adminInputClass} mt-2`}
                  />
                  {fieldError("caterer.maximumGuestCount") && (
                    <span role="alert" className="mt-1.5 block text-xs text-red-800">
                      {fieldError("caterer.maximumGuestCount")}
                    </span>
                  )}
                </label>

                <label className="block">
                  <span className={adminLabelClass}>Setup charges (₹)</span>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    inputMode="decimal"
                    {...register("caterer.setupCharges", asNumber)}
                    className={`${adminInputClass} mt-2`}
                  />
                </label>

                <label className="block">
                  <span className={adminLabelClass}>Delivery charges (₹)</span>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    inputMode="decimal"
                    {...register("caterer.deliveryCharges", asNumber)}
                    className={`${adminInputClass} mt-2`}
                  />
                </label>

                <label className="block">
                  <span className={adminLabelClass}>Other charges (₹)</span>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    inputMode="decimal"
                    {...register("caterer.additionalCharges", asNumber)}
                    className={`${adminInputClass} mt-2`}
                  />
                </label>

                <div className="flex flex-col gap-3 self-end pb-1">
                  <label className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      {...register("caterer.staffIncluded")}
                      className="h-4 w-4 border-forest/30 accent-forest"
                    />
                    <span className="text-sm text-charcoal">Staff included in per-plate rate</span>
                  </label>
                  <label className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      {...register("caterer.equipmentIncluded")}
                      className="h-4 w-4 border-forest/30 accent-forest"
                    />
                    <span className="text-sm text-charcoal">Equipment included</span>
                  </label>
                </div>

                <div className="sm:col-span-2">
                  <label className="block">
                    <span className={adminLabelClass}>Catering notes</span>
                    <textarea
                      rows={2}
                      {...register("caterer.notes")}
                      placeholder="Requires 3 days notice for Jain menus."
                      className={`${adminInputClass} mt-2`}
                    />
                  </label>
                </div>
              </div>
            </Panel>

            <Panel
              title="Catering packages"
              description="Reusable menus at fixed price points. Picking one on an event fills in the rate."
            >
              <div className="p-5">
                <VendorPackagesEditor control={control} register={register} errors={errors} />
              </div>
            </Panel>
          </>
        )}

        <Panel title="Internal notes">
          <div className="p-5">
            <label className="block">
              <span className={adminLabelClass}>Notes</span>
              <textarea
                rows={3}
                {...register("notes")}
                placeholder="Payment required 50% in advance."
                className={`${adminInputClass} mt-2`}
              />
              {fieldError("notes") && (
                <span role="alert" className="mt-1.5 block text-xs text-red-800">
                  {fieldError("notes")}
                </span>
              )}
            </label>
          </div>
        </Panel>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={isSubmitting || save.isPending} className="btn-solid">
            <Save className="h-4 w-4" aria-hidden="true" />
            {save.isPending ? "Saving…" : isEdit ? "Save changes" : "Add vendor"}
          </button>
          <Link
            to={isEdit ? `/admin/vendors/${vendorId}` : "/admin/vendors"}
            className="btn-outline"
          >
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
