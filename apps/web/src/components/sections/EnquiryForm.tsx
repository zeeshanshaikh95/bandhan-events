import { useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import {
  BUDGET_RANGES,
  EVENT_TYPES,
  SERVICES,
  enquirySchema,
  type EnquiryInput,
} from "@bandhan/shared";
import { publicApi } from "@/services/api";
import { ApiClientError } from "@/lib/apiClient";
import { cn } from "@/utils/cn";

type Status = "idle" | "submitted";

interface FormState {
  name: string;
  phone: string;
  email: string;
  eventType: string;
  eventDate: string;
  guestCount: string;
  service: string;
  budget: string;
  message: string;
  /** Honeypot — hidden from people, irresistible to bots. */
  company: string;
}

const initialForm: FormState = {
  name: "",
  phone: "",
  email: "",
  eventType: "",
  eventDate: "",
  guestCount: "",
  service: "",
  budget: "",
  message: "",
  company: "",
};

const inputClasses =
  "w-full border border-forest/20 bg-transparent px-4 py-3 text-[15px] text-charcoal placeholder:text-charcoal-muted/50 focus:border-forest focus:outline-none";

const labelClasses = "block font-sans text-[11px] font-semibold uppercase tracking-widest2 text-charcoal-muted";

/**
 * Public enquiry form.
 *
 * Every valid submission is POSTed to the API, where it is validated again,
 * stored as a Lead and attributed with source = "website". Validation here
 * uses the shared Zod schema, so the browser and the server agree on the rules
 * — the client copy exists for fast feedback, not as the security boundary.
 */
export default function EnquiryForm({ className }: { className?: string }) {
  const location = useLocation();
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [reference, setReference] = useState<string | null>(null);

  const set = (key: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((err) => ({ ...err, [key]: undefined }));
  };

  const mutation = useMutation({
    mutationFn: (payload: EnquiryInput & { pagePath?: string }) => publicApi.submitEnquiry(payload),
    onSuccess: (result) => {
      setReference(result.reference ?? null);
      setStatus("submitted");
      setForm(initialForm);
    },
    onError: (error) => {
      if (error instanceof ApiClientError && error.details) {
        // Field-level messages come straight from the server's validator.
        const fieldErrors: Partial<Record<keyof FormState, string>> = {};
        for (const [field, messages] of Object.entries(error.details)) {
          if (field in initialForm) {
            fieldErrors[field as keyof FormState] = messages[0];
          }
        }
        setErrors(fieldErrors);
      }
      setFormError(
        error instanceof ApiClientError
          ? error.status === 429
            ? "Too many enquiries from this connection. Please wait a moment and try again."
            : error.message
          : "We could not send your enquiry. Please try again or WhatsApp us."
      );
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsed = enquirySchema.safeParse({
      name: form.name,
      phone: form.phone,
      email: form.email,
      eventType: form.eventType || undefined,
      eventDate: form.eventDate || undefined,
      guestCount: form.guestCount === "" ? undefined : form.guestCount,
      serviceRequired: form.service || undefined,
      budget: form.budget || undefined,
      message: form.message || undefined,
      company: form.company || undefined,
      pagePath: location.pathname,
    });

    if (!parsed.success) {
      const next: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "");
        // `serviceRequired` is the API's name for the form's "service" field.
        const key = (field === "serviceRequired" ? "service" : field) as keyof FormState;
        if (key in initialForm && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      setFormError("Please check the highlighted fields.");
      return;
    }

    setErrors({});
    mutation.mutate(parsed.data);
  };

  if (status === "submitted") {
    return (
      <div className={cn("surface-card flex flex-col items-center px-8 py-16 text-center", className)} role="status">
        <CheckCircle2 className="h-10 w-10 text-gold-deep" aria-hidden="true" />
        <h3 className="mt-5 font-serif text-3xl font-medium text-forest">Thank You</h3>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-charcoal-muted">
          Your enquiry has reached our team and is saved with our records
          {reference ? ` under reference ${reference.slice(-6).toUpperCase()}` : ""}. We will reach
          out to you shortly. For an immediate response, WhatsApp us anytime.
        </p>
      </div>
    );
  }

  const submitting = mutation.isPending;

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className={cn("surface-card p-6 sm:p-10", className)}
      aria-label="Event enquiry form"
    >
      {formError && (
        <p role="alert" className="mb-6 border border-red-900/20 bg-red-50/60 px-4 py-3 text-sm text-red-900">
          {formError}
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="enq-name" className={labelClasses}>Name *</label>
          <input
            id="enq-name"
            type="text"
            autoComplete="name"
            required
            value={form.name}
            onChange={set("name")}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "enq-name-error" : undefined}
            className={cn(inputClasses, "mt-2")}
            placeholder="Your full name"
          />
          {errors.name && <p id="enq-name-error" role="alert" className="mt-1.5 text-xs text-red-800">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="enq-phone" className={labelClasses}>Phone *</label>
          <input
            id="enq-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            value={form.phone}
            onChange={set("phone")}
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "enq-phone-error" : undefined}
            className={cn(inputClasses, "mt-2")}
            placeholder="Your contact number"
          />
          {errors.phone && <p id="enq-phone-error" role="alert" className="mt-1.5 text-xs text-red-800">{errors.phone}</p>}
        </div>

        <div>
          <label htmlFor="enq-email" className={labelClasses}>Email *</label>
          <input
            id="enq-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={set("email")}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "enq-email-error" : undefined}
            className={cn(inputClasses, "mt-2")}
            placeholder="you@example.com"
          />
          {errors.email && <p id="enq-email-error" role="alert" className="mt-1.5 text-xs text-red-800">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="enq-type" className={labelClasses}>Event Type *</label>
          <select
            id="enq-type"
            required
            value={form.eventType}
            onChange={set("eventType")}
            aria-invalid={!!errors.eventType}
            className={cn(inputClasses, "mt-2 appearance-none bg-ivory-soft")}
          >
            <option value="" disabled>Select event type</option>
            {EVENT_TYPES.map((event) => (
              <option key={event.value} value={event.value}>{event.label}</option>
            ))}
          </select>
          {errors.eventType && <p role="alert" className="mt-1.5 text-xs text-red-800">{errors.eventType}</p>}
        </div>

        <div>
          <label htmlFor="enq-date" className={labelClasses}>Event Date</label>
          <input
            id="enq-date"
            type="date"
            value={form.eventDate}
            onChange={set("eventDate")}
            aria-invalid={!!errors.eventDate}
            className={cn(inputClasses, "mt-2")}
          />
          {errors.eventDate && <p role="alert" className="mt-1.5 text-xs text-red-800">{errors.eventDate}</p>}
        </div>

        <div>
          <label htmlFor="enq-guests" className={labelClasses}>Guest Count</label>
          <input
            id="enq-guests"
            type="number"
            inputMode="numeric"
            min={1}
            max={5000}
            value={form.guestCount}
            onChange={set("guestCount")}
            aria-invalid={!!errors.guestCount}
            className={cn(inputClasses, "mt-2")}
            placeholder="Approximate number of guests"
          />
          {errors.guestCount && <p role="alert" className="mt-1.5 text-xs text-red-800">{errors.guestCount}</p>}
        </div>

        <div>
          <label htmlFor="enq-service" className={labelClasses}>Service Required *</label>
          <select
            id="enq-service"
            required
            value={form.service}
            onChange={set("service")}
            aria-invalid={!!errors.service}
            className={cn(inputClasses, "mt-2 appearance-none bg-ivory-soft")}
          >
            <option value="" disabled>Select service</option>
            {SERVICES.map((service) => (
              <option key={service.value} value={service.value}>{service.label}</option>
            ))}
          </select>
          {errors.service && <p role="alert" className="mt-1.5 text-xs text-red-800">{errors.service}</p>}
        </div>

        <div>
          <label htmlFor="enq-budget" className={labelClasses}>Budget</label>
          <select
            id="enq-budget"
            value={form.budget}
            onChange={set("budget")}
            aria-invalid={!!errors.budget}
            className={cn(inputClasses, "mt-2 appearance-none bg-ivory-soft")}
          >
            <option value="">Prefer not to say</option>
            {BUDGET_RANGES.map((range) => (
              <option key={range.value} value={range.value}>{range.label}</option>
            ))}
          </select>
          {errors.budget && <p role="alert" className="mt-1.5 text-xs text-red-800">{errors.budget}</p>}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="enq-message" className={labelClasses}>Message</label>
          <textarea
            id="enq-message"
            rows={4}
            value={form.message}
            onChange={set("message")}
            maxLength={1000}
            className={cn(inputClasses, "mt-2 resize-y")}
            placeholder="Tell us about your celebration, dates and requirements…"
          />
        </div>
      </div>

      {/* Honeypot: hidden from view and from assistive tech, never filled by people. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="enq-company">Company</label>
        <input id="enq-company" tabIndex={-1} autoComplete="off" value={form.company} onChange={set("company")} />
      </div>

      <button type="submit" disabled={submitting} className="btn btn-solid mt-8 w-full disabled:opacity-70 sm:w-auto">
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Sending…
          </>
        ) : (
          "Send Enquiry"
        )}
      </button>
      <p className="mt-4 text-xs leading-relaxed text-charcoal-muted/70">
        Your details are used only to respond to your enquiry.
      </p>
    </form>
  );
}
