import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IndianRupee, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { z } from "zod";
import {
  VENDOR_ASSIGNMENT_STATUSES,
  VENDOR_ASSIGNMENT_STATUS_LABELS,
  createVendorAssignmentSchema,
  createVendorPaymentSchema,
  vendorTypeLabel,
  type EventVendorAssignmentDto,
} from "@bandhan/shared";
import { eventVendorApi, vendorApi } from "@/services/api";
import { ApiClientError } from "@/lib/apiClient";
import { formatCurrency } from "@/utils/formatCurrency";
import {
  EmptyState,
  FormError,
  LoadingRows,
  Panel,
  RetryState,
  adminInputClass,
  adminLabelClass,
  formatDate,
} from "@/components/admin/AdminUI";
import { AssignmentStatusPill, VendorPaymentStatusPill } from "@/components/admin/VendorStatus";
import { useAuth } from "@/providers/AuthProvider";
import { cn } from "@/utils/cn";

/**
 * Vendors working on one event.
 *
 * This is the operational view an event manager reads on the day: who is
 * handling what, what we agreed to pay, what has already gone out, and what is
 * still owed. Assigning a vendor records the agreed cost as a real Expense, so
 * the event's profit figure — and the business profit figure — includes it
 * without a second calculation anywhere.
 */

/**
 * The shared create schema, with one field message reworded for a `<select>`
 * ("Invalid identifier." is correct but unhelpful when nothing is chosen yet).
 */
const assignmentFormSchema = createVendorAssignmentSchema.extend({
  vendor: z.string().regex(/^[0-9a-fA-F]{24}$/, "Choose a vendor."),
});
type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;
const assignmentResolver = zodResolver(assignmentFormSchema) as Resolver<AssignmentFormValues>;

const paymentFormSchema = createVendorPaymentSchema;
type PaymentFormValues = z.infer<typeof paymentFormSchema>;
const paymentResolver = zodResolver(paymentFormSchema) as Resolver<PaymentFormValues>;

const today = () => new Date().toISOString().slice(0, 10);
/** Empty numeric inputs must not become 0 — 0 is a real, meaningful cost. */
const asNumber = {
  setValueAs: (value: unknown) =>
    value === "" || value === null || value === undefined ? undefined : Number(value),
};

const EMPTY_ASSIGNMENT: AssignmentFormValues = {
  vendor: "",
  role: "",
  service: "",
  estimatedCost: 0,
  negotiatedCost: 0,
  agreedCost: undefined,
  quantity: 1,
  status: "PLANNED",
  startTime: "",
  endTime: "",
  notes: "",
  contactPerson: "",
  contactPhone: "",
  caterer: {},
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span role="alert" className="mt-1.5 block text-xs text-red-800">
      {message}
    </span>
  );
}

function Labelled({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className={adminLabelClass}>{label}</span>
      <span className="mt-2 block">{children}</span>
      {hint && <span className="mt-1.5 block text-[11px] text-charcoal-muted">{hint}</span>}
    </label>
  );
}

// ── Assignment editor (assign a vendor, or edit an existing assignment) ───────

function AssignmentEditor({
  eventId,
  assignment,
  onDone,
  onCancel,
}: {
  eventId: string;
  assignment: EventVendorAssignmentDto | null;
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(assignment);

  const vendors = useQuery({
    queryKey: ["vendors", "picker"],
    queryFn: () => vendorApi.list({ activeOnly: "true", limit: 100, sort: "name" }),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AssignmentFormValues>({
    resolver: assignmentResolver,
    defaultValues: assignment
      ? {
          vendor: assignment.vendor?.id ?? "",
          role: assignment.role,
          service: assignment.service,
          estimatedCost: assignment.estimatedCost,
          negotiatedCost: assignment.negotiatedCost,
          agreedCost: assignment.agreedCost,
          quantity: assignment.quantity,
          status: assignment.status,
          startTime: assignment.startTime,
          endTime: assignment.endTime,
          notes: assignment.notes,
          contactPerson: assignment.contactPerson,
          contactPhone: assignment.contactPhone,
          caterer: {
            guestCount: assignment.caterer.guestCount ?? undefined,
            packageName: assignment.caterer.packageName,
            pricePerPlate: assignment.caterer.pricePerPlate || undefined,
            cuisine: assignment.caterer.cuisine,
            dietaryNotes: assignment.caterer.dietaryNotes,
            setupTime: assignment.caterer.setupTime,
            servingTime: assignment.caterer.servingTime,
            cleanupTime: assignment.caterer.cleanupTime,
            specialInstructions: assignment.caterer.specialInstructions,
          },
        }
      : EMPTY_ASSIGNMENT,
  });

  const selectedVendorId = watch("vendor");
  const selectedVendor = vendors.data?.items.find((entry) => entry.id === selectedVendorId);
  const isCaterer = selectedVendor?.type === "caterer";

  /**
   * The picker list is deliberately lean, so the caterer's packages and their
   * rates are fetched only once a caterer is actually selected.
   */
  const catererDetail = useQuery({
    queryKey: ["vendor", selectedVendorId],
    queryFn: () => vendorApi.get(selectedVendorId),
    enabled: Boolean(selectedVendorId) && isCaterer && !isEdit,
  });
  const packages = (catererDetail.data?.packages ?? []).filter((pkg) => pkg.active);

  const guestCount = Number(watch("caterer.guestCount")) || 0;
  const pricePerPlate = Number(watch("caterer.pricePerPlate")) || 0;
  const cateringPreview = guestCount * pricePerPlate;

  const save = useMutation({
    mutationFn: (values: AssignmentFormValues) =>
      isEdit
        ? eventVendorApi.update(eventId, assignment!.id, values)
        : eventVendorApi.assign(eventId, values as never),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["event-vendors", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-financials", eventId] });
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      queryClient.invalidateQueries({ queryKey: ["vendor", saved.vendor?.id] });
      onDone(isEdit ? "Assignment updated." : "Vendor assigned and cost recorded.");
    },
  });

  const fieldError = (name: string): string | undefined => {
    let cursor: unknown = errors;
    for (const segment of name.split(".")) {
      if (!cursor || typeof cursor !== "object") return undefined;
      cursor = (cursor as Record<string, unknown>)[segment];
    }
    return (cursor as { message?: string } | undefined)?.message;
  };

  const error =
    save.error instanceof ApiClientError ? save.error.message : (save.error as Error | null)?.message;

  return (
    <form
      onSubmit={handleSubmit((values) => save.mutate(values))}
      className="space-y-5 border border-forest/15 bg-cream/40 p-5"
      noValidate
    >
      <h3 className="font-serif text-xl font-medium text-forest">
        {isEdit ? `Edit assignment — ${assignment!.vendor?.name ?? "vendor"}` : "Assign a vendor"}
      </h3>

      <FormError message={error ?? null} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Labelled label="Vendor *">
          <select
            {...register("vendor")}
            disabled={isEdit}
            className={`${adminInputClass} disabled:opacity-60`}
          >
            <option value="">Choose a vendor…</option>
            {vendors.data?.items.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name} — {vendorTypeLabel(entry.type)}
              </option>
            ))}
          </select>
          <FieldError message={fieldError("vendor")} />
          {isEdit && (
            <span className="mt-1.5 block text-[11px] text-charcoal-muted">
              Remove this assignment and add a new one to change the vendor.
            </span>
          )}
        </Labelled>

        <Labelled label="Role on this event">
          <input
            {...register("role")}
            placeholder={selectedVendor ? vendorTypeLabel(selectedVendor.type) : "Caterer"}
            className={adminInputClass}
          />
          <FieldError message={fieldError("role")} />
        </Labelled>

        <Labelled label="Service">
          <input
            {...register("service")}
            placeholder="Dinner service, 400 plates"
            className={adminInputClass}
          />
          <FieldError message={fieldError("service")} />
        </Labelled>

        {isCaterer && (
          <>
            <Labelled label="Guests">
              <input
                type="number"
                min={1}
                step="1"
                inputMode="numeric"
                {...register("caterer.guestCount", asNumber)}
                className={adminInputClass}
              />
              <FieldError message={fieldError("caterer.guestCount")} />
            </Labelled>

            <Labelled
              label="Package"
              hint={
                packages.length > 0
                  ? "Choosing a package fills in its per-plate rate."
                  : undefined
              }
            >
              <select
                {...register("caterer.packageName", {
                  onChange: (event: { target: { value: string } }) => {
                    const chosen = packages.find((pkg) => pkg.name === event.target.value);
                    if (chosen) setValue("caterer.pricePerPlate", chosen.pricePerPlate);
                  },
                })}
                className={adminInputClass}
              >
                <option value="">No package</option>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.name}>
                    {pkg.name} — {formatCurrency(pkg.pricePerPlate)}/plate
                  </option>
                ))}
              </select>
              <FieldError message={fieldError("caterer.packageName")} />
            </Labelled>

            <Labelled
              label="Price per plate (₹)"
              hint={cateringPreview > 0 ? `${guestCount} × ${formatCurrency(pricePerPlate)} = ${formatCurrency(cateringPreview)}` : undefined}
            >
              <input
                type="number"
                min={0}
                step="1"
                inputMode="decimal"
                {...register("caterer.pricePerPlate", asNumber)}
                className={adminInputClass}
              />
              <FieldError message={fieldError("caterer.pricePerPlate")} />
            </Labelled>

            <Labelled label="Cuisine">
              <input
                {...register("caterer.cuisine")}
                placeholder="Gujarati thali"
                className={adminInputClass}
              />
            </Labelled>

            <Labelled label="Dietary requirements">
              <input
                {...register("caterer.dietaryNotes")}
                placeholder="Jain, no onion or garlic"
                className={adminInputClass}
              />
            </Labelled>

            <Labelled label="Setup / serving / cleanup">
              <span className="flex gap-2">
                <input type="time" {...register("caterer.setupTime")} className={adminInputClass} />
                <input type="time" {...register("caterer.servingTime")} className={adminInputClass} />
                <input type="time" {...register("caterer.cleanupTime")} className={adminInputClass} />
              </span>
            </Labelled>

            <div className="sm:col-span-2 lg:col-span-3">
              <Labelled label="Special instructions">
                <textarea
                  rows={2}
                  {...register("caterer.specialInstructions")}
                  className={adminInputClass}
                />
              </Labelled>
            </div>
          </>
        )}

        <Labelled label="Estimated cost (₹)">
          <input
            type="number"
            min={0}
            step="1"
            inputMode="decimal"
            {...register("estimatedCost", asNumber)}
            className={adminInputClass}
          />
          <FieldError message={fieldError("estimatedCost")} />
        </Labelled>

        <Labelled label="Negotiated cost (₹)">
          <input
            type="number"
            min={0}
            step="1"
            inputMode="decimal"
            {...register("negotiatedCost", asNumber)}
            className={adminInputClass}
          />
        </Labelled>

        <Labelled
          label="Final agreed cost (₹)"
          hint="Leave blank to use the negotiated figure. This is what the event pays."
        >
          <input
            type="number"
            min={0}
            step="1"
            inputMode="decimal"
            {...register("agreedCost", asNumber)}
            className={adminInputClass}
          />
          <FieldError message={fieldError("agreedCost")} />
        </Labelled>

        <Labelled label="Quantity">
          <input
            type="number"
            min={0}
            step="1"
            inputMode="numeric"
            {...register("quantity", asNumber)}
            className={adminInputClass}
          />
        </Labelled>

        <Labelled label="Assignment status">
          <select {...register("status")} className={adminInputClass}>
            {VENDOR_ASSIGNMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {VENDOR_ASSIGNMENT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </Labelled>

        <Labelled label="On-site from / to">
          <span className="flex gap-2">
            <input type="time" {...register("startTime")} className={adminInputClass} />
            <input type="time" {...register("endTime")} className={adminInputClass} />
          </span>
        </Labelled>

        <Labelled label="Contact person">
          <input {...register("contactPerson")} className={adminInputClass} />
        </Labelled>

        <Labelled label="Contact phone">
          <input type="tel" inputMode="tel" {...register("contactPhone")} className={adminInputClass} />
        </Labelled>

        <div className="sm:col-span-2 lg:col-span-3">
          <Labelled label="Notes">
            <textarea rows={2} {...register("notes")} className={adminInputClass} />
          </Labelled>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={isSubmitting || save.isPending} className="btn-solid">
          {save.isPending ? "Saving…" : isEdit ? "Save assignment" : "Assign vendor"}
        </button>
        <button type="button" onClick={onCancel} className="btn-outline">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Vendor payment (money out) ───────────────────────────────────────────────

function PaymentForm({
  eventId,
  assignment,
  onDone,
  onCancel,
}: {
  eventId: string;
  assignment: EventVendorAssignmentDto;
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormValues>({
    resolver: paymentResolver,
    defaultValues: {
      amount: Math.max(assignment.outstanding, 1),
      paymentDate: today(),
      method: "cash",
      status: "PAID",
      reference: "",
      notes: "",
    },
  });

  const save = useMutation({
    mutationFn: (values: PaymentFormValues) =>
      eventVendorApi.recordPayment(eventId, assignment.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-vendors", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-vendor-payments", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-financials", eventId] });
      queryClient.invalidateQueries({ queryKey: ["vendor-payments", assignment.vendor?.id] });
      queryClient.invalidateQueries({ queryKey: ["vendor-financials", assignment.vendor?.id] });
      onDone("Payment recorded.");
    },
  });

  const error =
    save.error instanceof ApiClientError ? save.error.message : (save.error as Error | null)?.message;

  return (
    <form
      onSubmit={handleSubmit((values) => save.mutate(values))}
      className="mt-4 space-y-4 border border-gold/40 bg-gold/5 p-4"
      noValidate
    >
      <p className="text-sm text-charcoal">
        Recording a payment to <strong>{assignment.vendor?.name}</strong>. Outstanding{" "}
        <strong>{formatCurrency(assignment.outstanding)}</strong>.
      </p>

      <FormError message={error ?? null} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Labelled label="Amount (₹) *">
          <input
            type="number"
            min={1}
            step="1"
            inputMode="decimal"
            {...register("amount", asNumber)}
            className={adminInputClass}
          />
          <FieldError message={errors.amount?.message} />
        </Labelled>

        <Labelled label="Date *">
          <input type="date" {...register("paymentDate")} className={adminInputClass} />
          <FieldError message={errors.paymentDate?.message} />
        </Labelled>

        <Labelled label="Method">
          <select {...register("method")} className={adminInputClass}>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="bank-transfer">Bank transfer</option>
            <option value="cheque">Cheque</option>
            <option value="card">Card</option>
            <option value="other">Other</option>
          </select>
        </Labelled>

        <Labelled label="Reference">
          <input {...register("reference")} placeholder="UPI / cheque no." className={adminInputClass} />
        </Labelled>

        <div className="sm:col-span-2 lg:col-span-4">
          <Labelled label="Notes">
            <input {...register("notes")} className={adminInputClass} />
          </Labelled>
        </div>
      </div>

      <p className="text-[11px] text-charcoal-muted">
        Amounts above the outstanding balance are refused by the server.
      </p>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={isSubmitting || save.isPending} className="btn-solid">
          <IndianRupee className="h-3.5 w-3.5" aria-hidden="true" />
          {save.isPending ? "Recording…" : "Record payment"}
        </button>
        <button type="button" onClick={onCancel} className="btn-outline">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Panel ────────────────────────────────────────────────────────────────────

export function EventVendorsPanel({ eventId }: { eventId: string }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const canWrite = can("vendors:write");
  const canSeeMoney = can("vendors:finance");

  const [editing, setEditing] = useState<EventVendorAssignmentDto | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const assignments = useQuery({
    queryKey: ["event-vendors", eventId],
    queryFn: () => eventVendorApi.list(eventId),
    enabled: Boolean(eventId),
  });

  const remove = useMutation({
    mutationFn: (assignmentId: string) => eventVendorApi.remove(eventId, assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-vendors", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["event-financials", eventId] });
      setNotice("Assignment removed and its cost reversed.");
    },
  });

  const list = assignments.data ?? [];
  const contracted = list.reduce((total, item) => total + item.agreedCost, 0);
  const paid = list.reduce((total, item) => total + item.amountPaid, 0);

  if (assignments.isPending) {
    return (
      <Panel title="Vendors">
        <LoadingRows rows={4} columns={4} />
      </Panel>
    );
  }

  if (assignments.isError) {
    return (
      <Panel title="Vendors">
        <RetryState
          message="We could not load the vendors assigned to this event."
          onRetry={() => assignments.refetch()}
        />
      </Panel>
    );
  }

  return (
    <Panel
      title="Vendors"
      description="Who is handling what, what was agreed, and what has been paid."
      actions={
        canWrite && !assigning && !editing ? (
          <button
            type="button"
            onClick={() => setAssigning(true)}
            className="btn-solid !px-4 !py-1.5 !text-[11px]"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Assign vendor
          </button>
        ) : undefined
      }
    >
      <div className="border-b border-forest/10 px-5 py-4 space-y-3">
        {notice && (
          <p role="status" className="border border-forest/20 bg-forest/5 px-4 py-2.5 text-sm text-forest">
            {notice}
          </p>
        )}
        {remove.error instanceof ApiClientError && <FormError message={remove.error.message} />}

        {canSeeMoney && list.length > 0 && (
          <dl className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Contracted", value: contracted },
              { label: "Paid", value: paid },
              { label: "Outstanding", value: contracted - paid },
            ].map((figure) => (
              <div key={figure.label}>
                <dt className="font-sans text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted">
                  {figure.label}
                </dt>
                <dd className="mt-1 font-serif text-2xl font-medium text-forest">
                  {formatCurrency(figure.value)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div className="space-y-5 p-5">
        {assigning && (
          <AssignmentEditor
            eventId={eventId}
            assignment={null}
            onDone={(message) => {
              setAssigning(false);
              setNotice(message);
            }}
            onCancel={() => setAssigning(false)}
          />
        )}

        {!assigning && editing && (
          <AssignmentEditor
            eventId={eventId}
            assignment={editing}
            onDone={(message) => {
              setEditing(null);
              setNotice(message);
            }}
            onCancel={() => setEditing(null)}
          />
        )}

        {list.length === 0 && !assigning ? (
          <EmptyState
            title="No vendors assigned"
            description="Assign the caterer, decorator, photographer and anyone else working this event to keep costs and schedules in one place."
          />
        ) : (
          <ul className="space-y-3">
            {list.map((item) => (
              <li key={item.id} className="border border-forest/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-serif text-lg font-medium text-forest">
                        {item.vendor?.name ?? "Removed vendor"}
                      </h3>
                      <AssignmentStatusPill status={item.status} />
                      {canSeeMoney && <VendorPaymentStatusPill status={item.paymentStatus} />}
                    </div>
                    <p className="mt-1 text-xs text-charcoal-muted">
                      {item.role || (item.vendor ? vendorTypeLabel(item.vendor.type) : "—")}
                      {item.service ? ` · ${item.service}` : ""}
                      {item.caterer.guestCount
                        ? ` · ${item.caterer.guestCount} guests`
                        : ""}
                      {item.caterer.packageName ? ` · ${item.caterer.packageName}` : ""}
                    </p>
                    {(item.startTime || item.endTime) && (
                      <p className="mt-1 text-[11px] text-charcoal-muted">
                        On site {item.startTime || "—"}
                        {item.endTime ? ` – ${item.endTime}` : ""}
                      </p>
                    )}
                    {item.contactPhone && (
                      <p className="mt-1 text-[11px] text-charcoal-muted">
                        {item.contactPerson ? `${item.contactPerson} · ` : ""}
                        {item.contactPhone}
                      </p>
                    )}
                    {item.notes && (
                      <p className="mt-2 max-w-2xl text-xs text-charcoal-muted">{item.notes}</p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="font-serif text-xl font-medium text-forest">
                      {formatCurrency(item.agreedCost)}
                    </p>
                    <p className="text-[11px] text-charcoal-muted">
                      {item.costSource === "agreed"
                        ? "agreed cost"
                        : item.costSource === "negotiated"
                          ? "from negotiated quote"
                          : item.costSource === "catering-calculation"
                            ? "calculated from guest count"
                            : "no cost recorded"}
                    </p>
                    {canSeeMoney && (
                      <p className="mt-1 text-[11px] text-charcoal-muted">
                        Paid {formatCurrency(item.amountPaid)}
                        {item.outstanding > 0 && (
                          <span className="text-red-900"> · {formatCurrency(item.outstanding)} due</span>
                        )}
                      </p>
                    )}
                    {item.expenseId && (
                      <p className="mt-1 text-[10px] uppercase tracking-wide text-charcoal-muted">
                        In expenses
                      </p>
                    )}
                  </div>
                </div>

                {(canWrite || canSeeMoney) && (
                  <div className="mt-3 flex flex-wrap gap-3 border-t border-forest/5 pt-3">
                    {canWrite && !editing && !assigning && (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditing(item)}
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest2 text-charcoal-muted hover:text-forest"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          Edit cost
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Remove ${item.vendor?.name ?? "this vendor"} from this event?`)) {
                              remove.mutate(item.id);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest2 text-red-900 hover:underline"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Remove
                        </button>
                      </>
                    )}
                    {canSeeMoney && item.outstanding > 0 && payingId !== item.id && (
                      <button
                        type="button"
                        onClick={() => setPayingId(item.id)}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest2 text-gold-deep hover:text-forest"
                      >
                        <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
                        Record payment
                      </button>
                    )}
                    {item.createdAt && (
                      <span className="ml-auto self-center text-[11px] text-charcoal-muted">
                        Added {formatDate(item.createdAt)}
                      </span>
                    )}
                  </div>
                )}

                {payingId === item.id && (
                  <PaymentForm
                    eventId={eventId}
                    assignment={item}
                    onDone={(message) => {
                      setPayingId(null);
                      setNotice(message);
                    }}
                    onCancel={() => setPayingId(null)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="border-t border-forest/10 px-5 py-3 text-[11px] text-charcoal-muted">
        Costs flow into the event's expenses and profit through the finance module. Vendor payment
        status is calculated from what has actually been paid — it cannot be set directly.
      </p>
    </Panel>
  );
}
