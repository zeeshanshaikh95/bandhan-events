import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { z } from "zod";
import { BOOKING_EVENT_TYPES, createQuotationSchema } from "@bandhan/shared";
import { customerApi, eventApi, quotationApi } from "@/services/api";
import { formatCurrency } from "@/utils/formatCurrency";
import { LineItemsEditor, EMPTY_LINE_ITEM } from "@/components/admin/LineItemsEditor";
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
import { useAuth } from "@/providers/AuthProvider";

/**
 * The create schema, plus the one field only an edit needs. Extending rather
 * than redeclaring keeps a single source of truth for every pricing rule.
 */
const quotationFormSchema = createQuotationSchema.extend({
  changeNote: z.string().trim().max(300).optional(),
});

type QuotationFormValues = z.infer<typeof quotationFormSchema>;

/**
 * The schema's own defaults (`unit`, `discountPercent`, `taxPercent`, …) make
 * zod's input and output types differ slightly. The form works with the output
 * shape — the fields always hold a concrete value — so the resolver is pinned
 * to it once, here, rather than widening every field to `any`.
 */
const quotationResolver = zodResolver(quotationFormSchema) as Resolver<QuotationFormValues>;

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

/**
 * Build and edit quotations.
 *
 * Editing a quotation that has already left the building is versioned by the
 * API, not overwritten: the dashboard asks for a change note and the service
 * snapshots the previous state before applying the new one.
 */
export default function AdminQuotationFormPage() {
  const { quotationId } = useParams<{ quotationId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const isEdit = Boolean(quotationId);

  const existing = useQuery({
    queryKey: ["quotation", quotationId],
    queryFn: () => quotationApi.get(quotationId!),
    enabled: isEdit,
  });

  const customers = useQuery({
    queryKey: ["customers", "options"],
    queryFn: () => customerApi.list({ limit: 200, sort: "name" }),
  });

  const events = useQuery({
    queryKey: ["events", "options"],
    queryFn: () => eventApi.list({ limit: 200 }),
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<QuotationFormValues>({
    resolver: quotationResolver,
    defaultValues: {
      customer: "",
      event: null,
      issueDate: today(),
      validUntil: inDays(14),
      eventType: "wedding",
      eventDate: today(),
      venue: "",
      venueAddress: "",
      guestCount: null,
      packageName: "",
      lineItems: [{ ...EMPTY_LINE_ITEM }],
      advanceRequired: 0,
      paymentTerms: "",
      notes: "",
      termsAndConditions: "",
    },
  });

  // Load the stored quotation into the form when editing.
  useEffect(() => {
    const quotation = existing.data;
    if (!quotation) return;

    reset({
      customer: quotation.customer?.id ?? "",
      event: quotation.event?.id ?? null,
      issueDate: quotation.issueDate.slice(0, 10),
      validUntil: (quotation.validUntil ?? quotation.issueDate).slice(0, 10),
      eventType: quotation.eventType as QuotationFormValues["eventType"],
      eventDate: (quotation.eventDate ?? quotation.issueDate).slice(0, 10),
      venue: quotation.venue,
      venueAddress: quotation.venueAddress,
      guestCount: quotation.guestCount,
      packageName: quotation.packageName,
      lineItems: quotation.lineItems.map((item) => ({
        category: item.category as QuotationFormValues["lineItems"][number]["category"],
        description: item.description,
        quantity: item.quantity,
        unit: item.unit as QuotationFormValues["lineItems"][number]["unit"],
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent,
        taxPercent: item.taxPercent,
      })),
      advanceRequired: quotation.totals.advanceRequired,
      paymentTerms: quotation.paymentTerms,
      notes: quotation.notes,
      termsAndConditions: quotation.termsAndConditions,
    });
  }, [existing.data, reset]);

  const save = useMutation({
    mutationFn: (values: QuotationFormValues) =>
      isEdit ? quotationApi.update(quotationId!, values) : quotationApi.create(values),
    onSuccess: (quotation) => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["quotation", quotation.id] });
      navigate(`/admin/quotations/${quotation.id}`);
    },
  });

  const selectedCustomer = customers.data?.items.find((entry) => entry.id === watch("customer"));

  if (!can("quotations:write")) {
    return <RetryState message="Your role cannot create or edit quotations." />;
  }
  if (isEdit && existing.isLoading) return <LoadingRows rows={8} columns={3} />;
  if (isEdit && existing.isError) {
    return <RetryState message="That quotation could not be loaded." onRetry={() => existing.refetch()} />;
  }

  // A quotation that has already been sent may only be revised with a note, so
  // the version history explains why the figures changed.
  const requiresChangeNote = isEdit && existing.data != null && existing.data.status !== "DRAFT";

  return (
    <>
      <AdminSeo title={isEdit ? `Edit ${existing.data?.quotationNumber ?? "quotation"}` : "New quotation"} />
      <PageHeading
        eyebrow="Commercial"
        title={isEdit ? `Edit ${existing.data?.quotationNumber}` : "New quotation"}
        description={
          requiresChangeNote
            ? "This quotation has already been sent. Saving records a new version and keeps the previous one intact."
            : "Totals are recalculated by the server — the figures below are a preview."
        }
        actions={
          <Link to={isEdit ? `/admin/quotations/${quotationId}` : "/admin/quotations"} className="btn-outline">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
          </Link>
        }
      />

      <form className="mt-6 space-y-6" noValidate onSubmit={handleSubmit((values) => save.mutate(values))}>
        <FormError
          message={save.isError ? (save.error as Error).message || "The quotation could not be saved." : null}
        />

        <Panel title="Customer & validity">
          <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <label>
              <span className={adminLabelClass}>Customer *</span>
              <select {...register("customer")} className={`${adminInputClass} mt-2`}>
                <option value="">Choose a customer…</option>
                {customers.data?.items.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} · {customer.phone}
                  </option>
                ))}
              </select>
              {errors.customer && (
                <p role="alert" className="mt-1.5 text-xs text-red-800">
                  {errors.customer.message}
                </p>
              )}
              <Link to="/admin/customers" className="mt-2 inline-block text-[11px] text-forest hover:underline">
                Add a new customer
              </Link>
            </label>

            <label>
              <span className={adminLabelClass}>Existing event (optional)</span>
              <select {...register("event")} className={`${adminInputClass} mt-2`}>
                <option value="">Not linked yet</option>
                {events.data?.items.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.eventName}
                  </option>
                ))}
              </select>
            </label>

            <TextField
              id="quotation-package"
              label="Package name"
              placeholder="Wedding decoration package"
              {...register("packageName")}
            />
            <TextField
              id="quotation-issue"
              label="Issue date *"
              type="date"
              error={errors.issueDate?.message}
              {...register("issueDate")}
            />
            <TextField
              id="quotation-valid"
              label="Valid until *"
              type="date"
              error={errors.validUntil?.message}
              {...register("validUntil")}
            />
          </div>

          {selectedCustomer && (
            <p className="border-t border-forest/10 px-5 py-3 text-xs text-charcoal-muted">
              Quoting {selectedCustomer.name} — {selectedCustomer.phone}
              {selectedCustomer.email ? ` · ${selectedCustomer.email}` : ""}
            </p>
          )}
        </Panel>

        <Panel title="Event details" description="The quotation carries the event context; the booking itself is created on acceptance.">
          <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <label>
              <span className={adminLabelClass}>Event type</span>
              <select {...register("eventType")} className={`${adminInputClass} mt-2`}>
                {BOOKING_EVENT_TYPES.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
            <TextField id="quotation-event-date" label="Event date" type="date" {...register("eventDate")} />
            <TextField id="quotation-venue" label="Venue" placeholder="Mulund West, Mumbai" {...register("venue")} />
            <TextField
              id="quotation-venue-address"
              label="Venue address"
              {...register("venueAddress")}
            />
            <label>
              <span className={adminLabelClass}>Guest count</span>
              <input
                type="number"
                min={1}
                {...register("guestCount", { setValueAs: (value) => (value === "" ? null : Number(value)) })}
                className={`${adminInputClass} mt-2`}
              />
            </label>
          </div>
        </Panel>

        <Panel title="Line items">
          <div className="p-5">
            <LineItemsEditor control={control} register={register} errors={errors} />
          </div>
        </Panel>

        <Panel title="Terms">
          <div className="grid gap-5 p-5 lg:grid-cols-2">
            <label>
              <span className={adminLabelClass}>Advance required ₹</span>
              <input
                type="number"
                min={0}
                step="0.01"
                {...register("advanceRequired", { valueAsNumber: true })}
                className={`${adminInputClass} mt-2`}
              />
              {errors.advanceRequired && (
                <p role="alert" className="mt-1.5 text-xs text-red-800">
                  {errors.advanceRequired.message}
                </p>
              )}
            </label>

            <label>
              <span className={adminLabelClass}>Payment terms</span>
              <input
                {...register("paymentTerms")}
                placeholder="50% advance, balance on the day of the event"
                className={`${adminInputClass} mt-2`}
              />
            </label>

            <label>
              <span className={adminLabelClass}>Notes for the customer</span>
              <textarea rows={4} {...register("notes")} className={`${adminInputClass} mt-2`} />
            </label>

            <label>
              <span className={adminLabelClass}>Terms &amp; conditions</span>
              <textarea
                rows={4}
                {...register("termsAndConditions")}
                placeholder="Quotation valid for 14 days. Vegetarian only. Alcohol is not permitted on the premises."
                className={`${adminInputClass} mt-2`}
              />
            </label>

            {requiresChangeNote && (
              <label className="lg:col-span-2">
                <span className={adminLabelClass}>Change note</span>
                <input
                  {...register("changeNote")}
                  placeholder="Reduced the floral package at the customer's request"
                  className={`${adminInputClass} mt-2`}
                />
                <span className="mt-1.5 block text-[11px] text-charcoal-muted">
                  Stored against the new version so the change is explicable later.
                </span>
              </label>
            )}
          </div>
        </Panel>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-solid" disabled={isSubmitting || save.isPending}>
            <Save className="h-4 w-4" aria-hidden="true" />
            {save.isPending ? "Saving…" : isEdit ? "Save quotation" : "Create quotation"}
          </button>
          <Link to={isEdit ? `/admin/quotations/${quotationId}` : "/admin/quotations"} className="btn-outline">
            Cancel
          </Link>
          {isEdit && existing.data && (
            <span className="text-xs text-charcoal-muted">
              Current total {formatCurrency(existing.data.totals.grandTotal)} · version {existing.data.version}
            </span>
          )}
        </div>
      </form>
    </>
  );
}
