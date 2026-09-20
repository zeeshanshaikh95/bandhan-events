import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { eventCategories, type EventCategory } from "@/data/venueData";
import { useWhatsApp, whatsappMessages } from "@/providers/SettingsProvider";
import SectionHeading from "@/components/ui/SectionHeading";
import SmartImage from "@/components/ui/SmartImage";
import Reveal from "@/components/ui/Reveal";

interface EventsShowcaseProps {
  /** Filter categories by division. */
  division?: EventCategory["division"] | "all";
  eyebrow: string;
  title: string;
  lede?: string;
  tone?: "dark" | "light";
  /** Limit how many categories to render. */
  limit?: number;
  /** Layout: editorial list rows or quiet image grid. */
  layout?: "list" | "grid";
}

const ENQUIRE_LINK_CLASSES =
  "inline-flex items-center gap-2 font-sans text-[11px] font-semibold uppercase tracking-widest2 text-forest transition-colors hover:text-gold-deep";

/**
 * Reusable "Events We Host" section. Editorial rows rather than endless
 * cards — generous whitespace, thin rules, one image per event.
 */
export default function EventsShowcase({
  division = "all",
  eyebrow,
  title,
  lede,
  tone = "dark",
  limit,
  layout = "list",
}: EventsShowcaseProps) {
  // The WhatsApp number comes from business settings, never from a component.
  const whatsapp = useWhatsApp();

  const items = eventCategories
    .filter((e) => division === "all" || e.division === division || e.division === "both")
    .slice(0, limit ?? eventCategories.length);

  return (
    <div>
      <SectionHeading eyebrow={eyebrow} title={title} lede={lede} tone={tone} />

      {layout === "list" ? (
        <ul className="mt-14 divide-y divide-forest/10 border-y border-forest/10">
          {items.map((event, i) => (
            <Reveal as="li" key={event.id} delay={i * 0.06}>
              <EventRow event={event} index={i} whatsapp={whatsapp} />
            </Reveal>
          ))}
        </ul>
      ) : (
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((event, i) => (
            <Reveal key={event.id} delay={i * 0.08}>
              <article className="group">
                <SmartImage
                  image={event.image}
                  className="aspect-[4/3]"
                  imgClassName="transition duration-700 group-hover:scale-[1.04]"
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                />
                <h3 className="mt-5 font-serif text-2xl font-medium text-forest">{event.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-charcoal-muted">{event.description}</p>
                <Link to="/contact" className={`link-underline mt-4 ${ENQUIRE_LINK_CLASSES}`}>
                  Plan this event
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </article>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}

/** One editorial row: numeral, image, copy and an enquiry action. */
function EventRow({
  event,
  index,
  whatsapp,
}: {
  event: EventCategory;
  index: number;
  whatsapp: (message?: string) => string | null;
}) {
  const href = whatsapp(whatsappMessages[event.whatsappMessageKey]);

  return (
    <div className="group grid items-center gap-6 py-8 sm:grid-cols-[auto_1fr_auto] sm:gap-10">
      <span className="font-serif text-lg italic text-gold-deep/80">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="flex items-center gap-6">
        <SmartImage
          image={event.image}
          className="hidden h-20 w-28 shrink-0 sm:block"
          imgClassName="transition duration-700 group-hover:scale-[1.05]"
          sizes="112px"
        />
        <div>
          <h3 className="font-serif text-2xl font-medium text-forest">{event.title}</h3>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-charcoal-muted">
            {event.description}
          </p>
        </div>
      </div>

      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={ENQUIRE_LINK_CLASSES}
          aria-label={`Enquire about ${event.title} on WhatsApp`}
        >
          Enquire
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      ) : (
        <Link to="/contact" className={ENQUIRE_LINK_CLASSES} aria-label={`Enquire about ${event.title}`}>
          Enquire
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
