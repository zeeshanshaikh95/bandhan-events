import { Link } from "react-router-dom";
import { Instagram, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import Seo from "@/components/Seo";
import PageHero from "@/components/sections/PageHero";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import EnquiryForm from "@/components/sections/EnquiryForm";
import WhatsAppButton from "@/components/ui/WhatsAppButton";
import { useBusinessSettings, useWhatsApp, whatsappMessages } from "@/providers/SettingsProvider";
import { images } from "@/data/images";

export default function ContactPage() {
  // Contact details are database-backed and editable from the dashboard.
  const settings = useBusinessSettings();
  const whatsapp = useWhatsApp();
  const whatsappHref = whatsapp(whatsappMessages.general);
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Contact", path: "/contact" },
  ];

  return (
    <>
      <Seo route="/contact" breadcrumbs={crumbs} />

      <PageHero
        eyebrow="Contact"
        title="Let's Talk About Your Event"
        lede="Share a few details and our team will get back to you — or reach us directly on WhatsApp."
        image={images.diningTable}
        breadcrumbs={crumbs}
      />

      <section className="container-site py-20 sm:py-28">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          {/* Details */}
          <div className="lg:col-span-5">
            <SectionHeading
              eyebrow="Reach Us"
              title="Bandhan Events"
              lede="Mulund West, Mumbai — minutes from Mulund station, convenient from Bhandup, Thane and the central suburbs."
            />

            <Reveal delay={0.1}>
              <ul className="mt-10 space-y-7">
                <li className="flex gap-4">
                  <MapPin className="mt-1 h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
                  <div>
                    <p className="font-sans text-[11px] font-semibold uppercase tracking-widest2 text-charcoal-muted">Address</p>
                    <address className="mt-2 not-italic text-[15px] leading-relaxed text-forest">
                      {settings.brand.name},<br />
                      {settings.address.street},<br />
                      {settings.address.locality}, {settings.address.area},<br />
                      {settings.address.city} – {settings.address.postalCode}
                    </address>
                    <a
                      href={settings.mapsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-underline mt-2 inline-block text-sm font-semibold text-gold-deep"
                    >
                      Get Directions
                    </a>
                  </div>
                </li>
                <li className="flex gap-4">
                  <Phone className="mt-1 h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
                  <div>
                    <p className="font-sans text-[11px] font-semibold uppercase tracking-widest2 text-charcoal-muted">Phone</p>
                    <p className="mt-2 text-[15px] text-charcoal-muted">
                      {settings.contact.phoneDisplay}
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <MessageCircle className="mt-1 h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
                  <div>
                    <p className="font-sans text-[11px] font-semibold uppercase tracking-widest2 text-charcoal-muted">WhatsApp</p>
                    <WhatsAppButton
                      message="general"
                      label="Message Us on WhatsApp"
                      variant="outline"
                      className="mt-2"
                    />
                  </div>
                </li>
                <li className="flex gap-4">
                  <Mail className="mt-1 h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
                  <div>
                    <p className="font-sans text-[11px] font-semibold uppercase tracking-widest2 text-charcoal-muted">Email</p>
                    <p className="mt-2 text-[15px] text-charcoal-muted">{settings.contact.email}</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <Instagram className="mt-1 h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
                  <div>
                    <p className="font-sans text-[11px] font-semibold uppercase tracking-widest2 text-charcoal-muted">Instagram</p>
                    <a
                      href={settings.contact.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-underline mt-2 inline-block text-[15px] text-forest"
                    >
                      {settings.contact.instagramHandle}
                    </a>
                  </div>
                </li>
              </ul>
            </Reveal>
          </div>

          {/* Form */}
          <div className="lg:col-span-7">
            <Reveal delay={0.15}>
              <EnquiryForm />
            </Reveal>
          </div>
        </div>
      </section>

      {/* Map */}
      <section aria-label="Venue location map" className="bg-cream">
        <div className="container-site py-20 sm:py-28">
          <SectionHeading
            eyebrow="Find Us"
            title="The Venue on the Map"
            lede={settings.formattedAddress}
          />
          <Reveal delay={0.1} className="mt-10">
            <div className="border border-forest/15 bg-ivory p-2">
              <div className="aspect-[16/9] w-full overflow-hidden sm:aspect-[21/9]">
                <iframe
                  title={`Map showing ${settings.brand.name}, ${settings.formattedAddress}`}
                  src={`https://www.google.com/maps?q=${encodeURIComponent(
                    `${settings.brand.name}, ${settings.formattedAddress}`
                  )}&output=embed`}
                  className="h-full w-full border-0 grayscale-[35%]"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Final WhatsApp strip */}
      <section className="bg-forest">
        <div className="container-site flex flex-col items-center gap-6 py-14 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="font-serif text-2xl font-medium text-ivory sm:text-3xl">
            Prefer to chat? We're a message away.
          </p>
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-gold shrink-0"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              WhatsApp Bandhan Events
            </a>
          ) : (
            <Link to="/contact" className="btn btn-gold shrink-0">
              Send an Enquiry
            </Link>
          )}
        </div>
      </section>
    </>
  );
}
