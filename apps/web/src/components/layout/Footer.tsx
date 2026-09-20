import { Link } from "react-router-dom";
import { Instagram, MapPin, MessageCircle, Phone } from "lucide-react";
import { navLinks } from "@/config/site";
import { useBusinessSettings, useWhatsApp, whatsappMessages } from "@/providers/SettingsProvider";
import Logo from "@/components/ui/Logo";

export default function Footer() {
  const year = new Date().getFullYear();
  // Contact details live in the database and are editable from the dashboard.
  const settings = useBusinessSettings();
  const whatsapp = useWhatsApp();
  const whatsappHref = whatsapp(whatsappMessages.general);

  return (
    <footer className="bg-forest text-ivory">
      <div className="container-site grid gap-12 py-16 sm:py-20 lg:grid-cols-12">
        {/* Brand */}
        <div className="lg:col-span-4">
          <Logo variant="light" className="h-16 w-auto" />
          <p className="eyebrow-light mt-6">{settings.brand.tagline}</p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ivory/70">
            Event decoration, banquet and catering in Mulund West, Mumbai — two
            crafts, one promise: celebrations crafted with meaning.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <a
              href={settings.contact.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Bandhan Events on Instagram (opens in new tab)"
              className="border border-ivory/25 p-2.5 text-ivory transition hover:border-gold-soft hover:text-gold-soft"
            >
              <Instagram className="h-4 w-4" aria-hidden="true" />
            </a>
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chat with Bandhan Events on WhatsApp (opens in new tab)"
                className="border border-ivory/25 p-2.5 text-ivory transition hover:border-gold-soft hover:text-gold-soft"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav aria-label="Footer" className="lg:col-span-4">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-label text-gold-soft">
            Explore
          </p>
          <ul className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 sm:max-w-xs">
            {navLinks.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="link-underline text-sm text-ivory/80 transition hover:text-ivory"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Contact */}
        <div className="lg:col-span-4">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-label text-gold-soft">
            Visit Us
          </p>
          <address className="mt-5 flex gap-3 not-italic text-sm leading-relaxed text-ivory/80">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-soft" aria-hidden="true" />
            <span>
              {settings.brand.name}
              <br />
              {settings.address.street},<br />
              {settings.address.locality},<br />
              {settings.address.area},<br />
              {settings.address.city} – {settings.address.postalCode}
            </span>
          </address>
          <ul className="mt-5 space-y-2.5 text-sm text-ivory/80">
            <li className="flex items-center gap-3">
              <Phone className="h-4 w-4 shrink-0 text-gold-soft" aria-hidden="true" />
              <span>{settings.contact.phoneDisplay}</span>
            </li>
            {whatsappHref && (
              <li className="flex items-center gap-3">
                <MessageCircle className="h-4 w-4 shrink-0 text-gold-soft" aria-hidden="true" />
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-underline transition hover:text-ivory"
                >
                  WhatsApp Us
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-ivory/10">
        <div className="container-site flex flex-col items-center justify-between gap-3 py-5 text-[12px] text-ivory/55 sm:flex-row">
          <p>
            © {year} {settings.brand.name}. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <p>{settings.formattedAddress}</p>
            {/* Staff entry point — /admin is disallowed in robots.txt and noindexed. */}
            <Link to="/admin/login" className="link-underline transition hover:text-ivory">
              Login as admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
