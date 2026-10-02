import { useRef, useState, type FormEvent } from "react";
import { MessageCircle } from "lucide-react";
import {
  BUDGET_RANGES,
  EVENT_TYPES,
  SERVICES,
  enquirySchema,
  type StageConfiguration,
} from "@bandhan/shared";
import { useWhatsApp } from "@/providers/SettingsProvider";
import { buildEnquiryMessage, sanitizeMessageText } from "@/utils/enquiryMessage";
import { cn } from "@/utils/cn";

type Status = "idle" | "opened";

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
 * Submission hands the enquiry to WhatsApp: the visitor's answers are validated
 * here (with the shared Zod schema, so the rules match the rest of the platform),
 * formatted into a message and opened in a pre-filled chat with the business
 * number. Nothing is sent from the website — the visitor presses Send in
 * WhatsApp, which is why the confirmation never claims the enquiry was
 * delivered. The public site is served from GitHub Pages, so there is no
 * application server to post to.
 *
 * The stage builder passes its `stageConfiguration` (and pre-selects a service)
 * so the same form doubles as its quotation request without duplicating any
 * field logic.
 */
export default function EnquiryForm({
  className,
  stageConfiguration,
  defaultService,
}: {
  className?: string;
  stageConfiguration?: StageConfiguration;
  defaultService?: string;
}) {
  const whatsapp = useWhatsApp();
  const [form, setForm] = useState<FormState>(() => ({
    ...initialForm,
    service: defaultService ?? "",
  }));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [handoffHref, setHandoffHref] = useState<string | null>(null);
  /** Guards a double-click from firing two handoffs before React re-renders. */
  const handoffStarted = useRef(false);

  const set = (key: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((err) => ({ ...err, [key]: undefined }));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (handoffStarted.current) return;
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
      stageConfiguration,
    });

    if (!parsed.success) {
      const next: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "");
        // `serviceRequired` is the shared schema's name for the form's "service".
        const key = (field === "serviceRequired" ? "service" : field) as keyof FormState;
        if (key in initialForm && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      setFormError("Please check the highlighted fields.");
      return;
    }

    // `parsed.data.message` has had its line breaks stripped by the shared
    // schema (see sanitizeMessageText) — keep the visitor's paragraphs.
    const answers = { ...parsed.data, message: sanitizeMessageText(form.message) || undefined };
    const href = whatsapp(buildEnquiryMessage(answers));
    if (!href) {
      setFormError(
        "WhatsApp is not available right now. Please use the WhatsApp button on this page instead."
      );
      return;
    }

    setErrors({});
    handoffStarted.current = true;
    setHandoffHref(href);
    // Opens WhatsApp Web on a desktop and the WhatsApp app on a phone. The link
    // is also kept on screen, so a blocked popup is still recoverable.
    window.open(href, "_blank", "noopener,noreferrer");
    setStatus("opened");
  };

  if (status === "opened") {
    return (
      <div className={cn("surface-card flex flex-col items-center px-8 py-16 text-center", className)} role="status">
        <MessageCircle className="h-10 w-10 text-gold-deep" aria-hidden="true" />
        <h3 className="mt-5 font-serif text-3xl font-medium text-forest">Your Enquiry Is Ready in WhatsApp</h3>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-charcoal-muted">
          WhatsApp should have opened in a new tab with your details already written out.
          Nothing has been sent yet — press <strong className="font-semibold text-charcoal">Send</strong> in
          WhatsApp to reach our team.
          {stageConfiguration
            ? " Your stage configuration is included in the message."
            : " We will reply as soon as we read it."}
        </p>
        {handoffHref && (
          <a
            href={handoffHref}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-solid mt-7"
            aria-label="Open WhatsApp with your enquiry (opens WhatsApp)"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Open WhatsApp Again
          </a>
        )}
        <button
          type="button"
          onClick={() => {
            handoffStarted.current = false;
            setStatus("idle");
          }}
          className="link-underline mt-5 font-sans text-[11px] font-semibold uppercase tracking-widest2 text-charcoal-muted/70 transition-colors hover:text-charcoal-muted"
        >
          Edit your enquiry
        </button>
      </div>
    );
  }

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

      <button type="submit" className="btn btn-solid mt-8 w-full sm:w-auto">
        Send Enquiry
      </button>
      <p className="mt-4 text-xs leading-relaxed text-charcoal-muted/70">
        Send Enquiry opens WhatsApp with your details already filled in — press Send there to reach us.
        Your details are used only to respond to your enquiry.
      </p>
    </form>
  );
}
