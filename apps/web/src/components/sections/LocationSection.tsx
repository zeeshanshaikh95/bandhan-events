import { MapPin, Car, ExternalLink } from "lucide-react";
import { useBusinessSettings } from "@/providers/SettingsProvider";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";

/**
 * Location block: address, quick facts and a lightweight map embed.
 * The iframe points at Google Maps' keyless embed endpoint for the venue
 * address and can be swapped for a proper place embed later.
 */
export default function LocationSection({
  eyebrow = "Find Us",
  title = "Visit the Venue",
  lede = "Located in Mulund West — easy to reach from Mulund, Bhandup, Thane and the central suburbs.",
}: {
  eyebrow?: string;
  title?: string;
  lede?: string;
}) {
  // Address comes from business settings so the dashboard stays authoritative.
  const settings = useBusinessSettings();
  const { address } = settings;
  const mapQuery = encodeURIComponent(
    `${settings.brand.name}, ${address.street}, ${address.locality}, ${address.area}, ${address.city} ${address.postalCode}`
  );

  return (
    <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
      <div>
        <SectionHeading eyebrow={eyebrow} title={title} lede={lede} />
        <Reveal delay={0.1}>
          <address className="mt-8 flex gap-3 not-italic leading-relaxed text-charcoal-muted">
            <MapPin className="mt-1 h-4 w-4 shrink-0 text-gold-deep" aria-hidden="true" />
            <span className="text-[15px]">
              {settings.brand.name}
              <br />
              {address.street},
              <br />
              {address.locality},
              <br />
              {address.area},
              <br />
              {address.city} – {address.postalCode}
            </span>
          </address>
          <p className="mt-6 flex items-center gap-3 text-sm text-charcoal-muted">
            <Car className="h-4 w-4 shrink-0 text-gold-deep" aria-hidden="true" />
            On-site parking for approximately 15 vehicles
          </p>
          <a
            href={settings.mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline mt-8"
          >
            Get Directions
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </Reveal>
      </div>

      <Reveal delay={0.15}>
        <div className="border border-forest/15 bg-cream p-2">
          <div className="aspect-[4/3] w-full overflow-hidden">
            <iframe
              title={`Map showing ${settings.brand.name}, ${settings.formattedAddress}`}
              src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
              className="h-full w-full border-0 grayscale-[35%]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>
      </Reveal>
    </div>
  );
}
