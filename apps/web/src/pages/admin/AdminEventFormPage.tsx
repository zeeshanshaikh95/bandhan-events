import { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { eventApi } from "@/services/api";
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
import { cn } from "@/utils/cn";
import {
  BOOKING_EVENT_TYPES,
  BOOKING_STATUSES,
  BOOKING_STATUS_LABELS,
  PAYMENT_STATUS_VALUES,
  PAYMENT_STATUS_LABELS,
} from "@bandhan/shared";

interface EventForm {
  customer: string;
  eventName: string;
  eventType: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  venue: string;
  venueAddress: string;
  guestCount: number | null;
  packageName: string;
  contractAmount: number;
  paymentTerms: string;
  notes: string;
  internalNotes: string;
  status: string;
  paymentStatus: string;
}

export default function AdminEventFormPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const isEdit = !!eventId;

  const existingEvent = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => eventApi.get(eventId!),
    enabled: isEdit,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EventForm>({
    defaultValues: {
      customer: "",
      eventName: "",
      eventType: "wedding",
      eventDate: new Date().toISOString().split("T")[0],
      startTime: "",
      endTime: "",
      venue: "",
      venueAddress: "",
      guestCount: null,
      packageName: "",
      contractAmount: 0,
      paymentTerms: "",
      notes: "",
      internalNotes: "",
      status: "ENQUIRY",
      paymentStatus: "UNPAID",
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (existingEvent.data) {
      const e = existingEvent.data;
      reset({
        customer: e.customer?.id || "",
        eventName: e.eventName,
        eventType: e.eventType,
        eventDate: e.eventDate.split("T")[0],
        startTime: e.startTime,
        endTime: e.endTime,
        venue: e.venue,
        venueAddress: e.venueAddress,
        guestCount: e.guestCount,
        packageName: e.packageName,
        contractAmount: e.contractAmount,
        paymentTerms: e.paymentTerms,
        notes: e.notes,
        internalNotes: e.internalNotes,
        status: e.status,
        paymentStatus: e.paymentStatus,
      });
    }
  }, [existingEvent.data, reset]);

  const mutation = useMutation({
    mutationFn: (data: EventForm) => {
      const payload = {
        ...data,
        guestCount: data.guestCount || undefined,
      };
      return isEdit ? eventApi.update(eventId!, payload) : eventApi.create(payload);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      navigate(`/admin/events/${result.id}`);
    },
  });

  if (isEdit && existingEvent.isLoading) {
    return (
      <>
        <AdminSeo title="Edit Event" />
        <LoadingRows rows={6} columns={2} />
      </>
    );
  }

  if (isEdit && existingEvent.isError) {
    return (
      <>
        <AdminSeo title="Edit Event" />
        <RetryState message="Failed to load event." onRetry={() => existingEvent.refetch()} />
      </>
    );
  }

  const canWrite = can("events:write");
  if (!canWrite && !isEdit) {
    navigate("/admin/events");
    return null;
  }

  return (
    <>
      <AdminSeo title={isEdit ? "Edit Event" : "New Event"} />
      <PageHeading
        eyebrow="Events"
        title={isEdit ? "Edit Event" : "Create New Event"}
        description="Fill in the event details. All fields are validated server-side."
        actions={
          <Link to="/admin/events" className="btn-outline">
            <ArrowLeft className="h-4 w-4" /> Back to Events
          </Link>
        }
      />

      <form
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
        className="mt-6 space-y-6"
        noValidate
      >
        <FormError message={mutation.isError ? "Failed to save event." : undefined} />

        {/* Customer */}
        <Panel title="Customer">
          <div className="p-5 sm:p-6">
            <TextField
              id="customer"
              label="Customer ID"
              required
              disabled={!canWrite}
              placeholder="Enter customer ID (from Customer module)"
              hint="Link an existing customer record."
              error={errors.customer?.message}
              {...register("customer", { required: "Customer is required" })}
            />
          </div>
        </Panel>

        {/* Event Details */}
        <Panel title="Event Details">
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <div className="sm:col-span-2">
              <TextField
                id="eventName"
                label="Event Name"
                required
                disabled={!canWrite}
                placeholder="e.g. Sharma Wedding Reception"
                error={errors.eventName?.message}
                {...register("eventName", { required: "Event name is required" })}
              />
            </div>
            <div>
              <label className={adminLabelClass}>Event Type</label>
              <select {...register("eventType")} disabled={!canWrite} className={cn(adminInputClass, "mt-1")}>
                {BOOKING_EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <TextField
                id="eventDate"
                label="Event Date"
                type="date"
                required
                disabled={!canWrite}
                error={errors.eventDate?.message}
                {...register("eventDate", { required: "Date is required" })}
              />
            </div>
            <div>
              <TextField
                id="startTime"
                label="Start Time"
                type="time"
                disabled={!canWrite}
                {...register("startTime")}
              />
            </div>
            <div>
              <TextField
                id="endTime"
                label="End Time"
                type="time"
                disabled={!canWrite}
                {...register("endTime")}
              />
            </div>
            <div>
              <TextField
                id="guestCount"
                label="Guest Count"
                type="number"
                disabled={!canWrite}
                {...register("guestCount", { valueAsNumber: true })}
              />
            </div>
          </div>
        </Panel>

        {/* Venue */}
        <Panel title="Venue">
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <div className="sm:col-span-2">
              <TextField
                id="venue"
                label="Venue Name"
                disabled={!canWrite}
                placeholder="e.g. Bandhan Events Banquet Hall"
                {...register("venue")}
              />
            </div>
            <div className="sm:col-span-2">
              <TextField
                id="venueAddress"
                label="Venue Address"
                disabled={!canWrite}
                placeholder="Full address"
                {...register("venueAddress")}
              />
            </div>
          </div>
        </Panel>

        {/* Commercial */}
        <Panel title="Commercial">
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <div>
              <TextField
                id="packageName"
                label="Package"
                disabled={!canWrite}
                placeholder="e.g. Premium Wedding Package"
                {...register("packageName")}
              />
            </div>
            <div>
              <TextField
                id="contractAmount"
                label="Contract Amount (₹)"
                type="number"
                required
                disabled={!canWrite}
                error={errors.contractAmount?.message}
                {...register("contractAmount", { required: "Amount is required", min: { value: 0, message: "Cannot be negative" } })}
              />
            </div>
            <div className="sm:col-span-2">
              <TextField
                id="paymentTerms"
                label="Payment Terms"
                disabled={!canWrite}
                placeholder="e.g. 50% advance, 50% before event"
                {...register("paymentTerms")}
              />
            </div>
          </div>
        </Panel>

        {/* Status */}
        <Panel title="Status">
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <div>
              <label className={adminLabelClass}>Booking Status</label>
              <select {...register("status")} disabled={!canWrite} className={cn(adminInputClass, "mt-1")}>
                {BOOKING_STATUSES.map((s) => (
                  <option key={s} value={s}>{BOOKING_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={adminLabelClass}>Payment Status</label>
              <select {...register("paymentStatus")} disabled={!canWrite} className={cn(adminInputClass, "mt-1")}>
                {PAYMENT_STATUS_VALUES.map((s) => (
                  <option key={s} value={s}>{PAYMENT_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>
        </Panel>

        {/* Notes */}
        <Panel title="Notes">
          <div className="p-5 sm:p-6 space-y-4">
            <TextField
              id="notes"
              label="Customer Notes"
              disabled={!canWrite}
              placeholder="Visible notes about the customer/event"
              {...register("notes")}
            />
            <TextField
              id="internalNotes"
              label="Internal Notes"
              disabled={!canWrite}
              placeholder="Private team notes"
              {...register("internalNotes")}
            />
          </div>
        </Panel>

        {/* Submit */}
        {canWrite && (
          <div className="flex gap-3">
            <button type="submit" disabled={mutation.isPending} className="btn-solid">
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isEdit ? "Update Event" : "Create Event"}
            </button>
            <Link to="/admin/events" className="btn-outline">Cancel</Link>
          </div>
        )}
      </form>
    </>
  );
}
