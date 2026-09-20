import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import {
  BUDGET_RANGES,
  EVENT_TYPES,
  LEAD_STATUS_LABELS,
  SERVICES,
  type LeadStatus,
} from "@bandhan/shared";
import { cn } from "@/utils/cn";

/**
 * Shared dashboard primitives. Deliberately small: the admin uses the same
 * forest/ivory/gold system as the website, just in an operational register.
 */

/** Admin pages must never be indexed — they are not part of the public site. */
export function AdminSeo({ title }: { title: string }) {
  return (
    <Helmet prioritizeSeoTags>
      <title>{`${title} · Bandhan Events Admin`}</title>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
  );
}

export const adminInputClass =
  "w-full border border-forest/15 bg-ivory-soft px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-muted/50 focus:border-forest focus:outline-none disabled:opacity-60";

export const adminLabelClass =
  "block font-sans text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted";

export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-2 font-serif text-3xl font-medium text-forest sm:text-4xl">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-charcoal-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border border-forest/10 bg-ivory-soft", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-forest/10 px-5 py-4">
          <div>
            {title && <h2 className="font-serif text-xl font-medium text-forest">{title}</h2>}
            {description && <p className="mt-1 text-xs text-charcoal-muted">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  loading,
}: {
  label: string;
  value: number | string;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <div className="border border-forest/10 bg-ivory-soft px-5 py-4">
      <p className="font-sans text-[10px] font-semibold uppercase tracking-widest2 text-charcoal-muted">
        {label}
      </p>
      <p className="mt-2 font-serif text-3xl font-medium text-forest">
        {loading ? <span className="inline-block h-7 w-10 animate-pulse bg-cream" /> : value}
      </p>
      {hint && <p className="mt-1 text-[11px] text-charcoal-muted">{hint}</p>}
    </div>
  );
}

const STATUS_STYLES: Record<LeadStatus, string> = {
  NEW: "border-gold/50 bg-gold/10 text-gold-deep",
  CONTACTED: "border-forest/20 bg-forest/5 text-forest",
  FOLLOW_UP: "border-gold/40 bg-gold/5 text-gold-deep",
  QUOTED: "border-forest/20 bg-forest/5 text-forest",
  NEGOTIATION: "border-forest/20 bg-forest/5 text-forest",
  CONFIRMED: "border-forest/40 bg-forest/10 text-forest",
  COMPLETED: "border-forest/30 bg-forest/10 text-forest-mid",
  LOST: "border-charcoal/15 bg-charcoal/5 text-charcoal-muted",
};

export function StatusPill({ status }: { status: LeadStatus }) {
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap border px-2.5 py-1 font-sans text-[10px] font-semibold uppercase tracking-widest2",
        STATUS_STYLES[status]
      )}
    >
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}

export function RetryState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 border border-red-900/20 bg-red-50/50 px-6 py-10 text-center">
      <AlertTriangle className="h-6 w-6 text-red-900" aria-hidden="true" />
      <p className="max-w-md text-sm text-red-900">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-outline !px-5 !py-2 !text-[11px]">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <h3 className="font-serif text-xl font-medium text-forest">{title}</h3>
      {description && <p className="max-w-md text-sm text-charcoal-muted">{description}</p>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

export function LoadingRows({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div role="status" aria-label="Loading" className="divide-y divide-forest/5">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 px-5 py-4">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <span
              key={columnIndex}
              className={cn(
                "h-3 animate-pulse bg-cream",
                columnIndex === 0 ? "w-40" : "w-20",
                columnIndex === columns - 1 && "ml-auto"
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Labelled input wired for react-hook-form's `register()` spread.
 *
 * The ref MUST be forwarded to the real <input>: react-hook-form registers a
 * field through that callback, and a function component silently drops a ref
 * it does not forward — which makes every form submit its default (empty)
 * values.
 */
export const TextField = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & {
    id: string;
    label: string;
    error?: string;
    hint?: string;
  }
>(function TextField({ id, label, error, hint, required, ...inputProps }, ref) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <label htmlFor={id} className={adminLabelClass}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <input
        id={id}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(adminInputClass, "mt-2")}
        {...inputProps}
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-[11px] text-charcoal-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-red-800">
          {error}
        </p>
      )}
    </div>
  );
});

/** Form-level error banner, used for API failures. */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-2 border border-red-900/20 bg-red-50/60 px-4 py-3 text-sm text-red-900">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

export function SuccessNotice({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="status" className="border border-forest/20 bg-forest/5 px-4 py-3 text-sm text-forest">
      {message}
    </p>
  );
}

export function InlineSpinner({ label = "Working" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] text-charcoal-muted">
      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      {label}…
    </span>
  );
}

/** Consistent formatting for dates that may legitimately be absent. */
export function formatDate(value?: string | null, fallback = "—"): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value?: string | null, fallback = "—"): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function humanizeSlug(value: string): string {
  return value.replace(/-/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

/* Slug → display label lookups, so stored values and shown labels stay decoupled. */
export const eventTypeLabel = (value: string): string =>
  EVENT_TYPES.find((entry) => entry.value === value)?.label ?? humanizeSlug(value);

export const serviceLabel = (value: string): string =>
  SERVICES.find((entry) => entry.value === value)?.label ?? humanizeSlug(value);

export const budgetLabel = (value?: string | null): string =>
  value ? (BUDGET_RANGES.find((entry) => entry.value === value)?.label ?? humanizeSlug(value)) : "—";
