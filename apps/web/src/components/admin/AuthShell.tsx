import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import Logo from "@/components/ui/Logo";
import { AdminSeo } from "@/components/admin/AdminUI";

/**
 * Chrome for the unauthenticated admin pages (login, forgot/reset password).
 * Visually part of the Bandhan brand, structurally separate from the public
 * site — no marketing navigation is reachable from here.
 */
export default function AuthShell({
  title,
  subtitle,
  children,
  seoTitle,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  seoTitle: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-forest lg:flex-row">
      <AdminSeo title={seoTitle} />

      {/* Brand panel */}
      <div className="relative flex flex-col justify-between px-8 py-10 lg:w-[45%] lg:px-14 lg:py-14">
        <Link to="/" className="inline-block" aria-label="Bandhan Events — back to website">
          <Logo variant="light" className="h-14 w-auto" />
        </Link>
        <div className="mt-10 lg:mt-0">
          <p className="eyebrow-light">Business Dashboard</p>
          <h2 className="mt-4 max-w-md font-serif text-4xl font-medium leading-tight text-ivory lg:text-5xl">
            Celebrations, managed end to end.
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-ivory/65">
            Leads, enquiries and business settings for Bandhan Events — decorators and
            banquet &amp; catering, Mulund West, Mumbai.
          </p>
        </div>
        <p className="mt-10 hidden text-[11px] uppercase tracking-widest2 text-ivory/40 lg:block">
          © {new Date().getFullYear()} Bandhan Events
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-ivory px-5 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <h1 className="font-serif text-3xl font-medium text-forest">{title}</h1>
          {subtitle && <p className="mt-3 text-sm leading-relaxed text-charcoal-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          <p className="mt-8 text-center text-[11px] uppercase tracking-widest2 text-charcoal-muted">
            <Link to="/" className="link-underline">
              Back to website
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
