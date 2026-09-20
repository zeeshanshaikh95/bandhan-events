import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  BUDGET_RANGES,
  EVENT_TYPES,
  LEAD_SOURCES,
  SERVICES,
  leadCreateSchema,
} from "@bandhan/shared";
import { FormError, Panel, TextField, adminInputClass, adminLabelClass } from "@/components/admin/AdminUI";
import { ApiClientError } from "@/lib/apiClient";
import { zodFormResolver } from "@/lib/formResolver";
import { leadApi } from "@/services/api";
import { cn } from "@/utils/cn";

interface LeadFormValues {
  name: string;
  phone: string;
  email?: string;
  eventType: string;
  eventDate?: string;
  guestCount?: number;
  serviceRequired: string;
  budget?: string;
  message?: string;
  source: string;
}

/**
 * Manual lead entry — for phone calls, walk-ins, WhatsApp and referral leads.
 * Uses the same shared schema as the API, so a fast typist cannot bypass the
 * rules the server enforces.
 */
export default function LeadCreatePanel({ onDone }: { onDone?: () => void }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LeadFormValues>({
    resolver: zodFormResolver<LeadFormValues>(leadCreateSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      eventType: "",
      eventDate: "",
      serviceRequired: "",
      budget: "",
      message: "",
      source: "phone",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: LeadFormValues) =>
      leadApi.create({
        ...values,
        // Empty strings must be omitted, not sent as "" (which fails validation).
        email: values.email || undefined,
        eventDate: values.eventDate || undefined,
        budget: values.budget || undefined,
        guestCount: values.guestCount || undefined,
        message: values.message || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      reset();
      onDone?.();
    },
    onError: (error) =>
      setFormError(error instanceof ApiClientError ? error.message : "We could not save that lead."),
  });

  return (
    <Panel
      title="Record a lead"
      description="For enquiries that arrive by phone, WhatsApp, Instagram or in person."
    >
      <form
        onSubmit={handleSubmit((values) => {
          setFormError(null);
          mutation.mutate(values);
        })}
        noValidate
        className="space-y-5 p-5 sm:p-6"
      >
        <FormError message={formError} />

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="lead-name"
            label="Name"
            required
            error={errors.name?.message}
            {...register("name")}
          />
          <TextField
            id="lead-phone"
            label="Phone"
            type="tel"
            inputMode="tel"
            required
            error={errors.phone?.message}
            {...register("phone")}
          />
          <TextField
            id="lead-email"
            label="Email"
            type="email"
            inputMode="email"
            error={errors.email?.message}
            {...register("email")}
          />

          <div>
            <label htmlFor="lead-event-type" className={adminLabelClass}>
              Event type *
            </label>
            <select
              id="lead-event-type"
              className={cn(adminInputClass, "mt-2")}
              aria-invalid={errors.eventType ? true : undefined}
              {...register("eventType")}
            >
              <option value="">Select event type</option>
              {EVENT_TYPES.map((event) => (
                <option key={event.value} value={event.value}>
                  {event.label}
                </option>
              ))}
            </select>
            {errors.eventType && (
              <p role="alert" className="mt-1.5 text-xs text-red-800">
                {errors.eventType.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="lead-service" className={adminLabelClass}>
              Service required *
            </label>
            <select
              id="lead-service"
              className={cn(adminInputClass, "mt-2")}
              aria-invalid={errors.serviceRequired ? true : undefined}
              {...register("serviceRequired")}
            >
              <option value="">Select service</option>
              {SERVICES.map((service) => (
                <option key={service.value} value={service.value}>
                  {service.label}
                </option>
              ))}
            </select>
            {errors.serviceRequired && (
              <p role="alert" className="mt-1.5 text-xs text-red-800">
                {errors.serviceRequired.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="lead-source" className={adminLabelClass}>
              Source
            </label>
            <select id="lead-source" className={cn(adminInputClass, "mt-2")} {...register("source")}>
              {LEAD_SOURCES.map((source) => (
                <option key={source} value={source}>
                  {source.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          <TextField
            id="lead-event-date"
            label="Event date"
            type="date"
            error={errors.eventDate?.message}
            {...register("eventDate")}
          />
          <TextField
            id="lead-guests"
            label="Guest count"
            type="number"
            min={1}
            max={5000}
            inputMode="numeric"
            error={errors.guestCount?.message}
            {...register("guestCount")}
          />

          <div>
            <label htmlFor="lead-budget" className={adminLabelClass}>
              Budget
            </label>
            <select id="lead-budget" className={cn(adminInputClass, "mt-2")} {...register("budget")}>
              <option value="">Not recorded</option>
              {BUDGET_RANGES.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="lead-message" className={adminLabelClass}>
              Notes
            </label>
            <textarea
              id="lead-message"
              rows={3}
              maxLength={1000}
              className={cn(adminInputClass, "mt-2 resize-y")}
              {...register("message")}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={mutation.isPending} className="btn-solid disabled:opacity-70">
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving…
              </>
            ) : (
              "Save lead"
            )}
          </button>
          <button type="button" onClick={() => reset()} className="btn-outline">
            Clear
          </button>
        </div>
      </form>
    </Panel>
  );
}
