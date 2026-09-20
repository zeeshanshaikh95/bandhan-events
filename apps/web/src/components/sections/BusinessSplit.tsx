import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { images } from "@/data/images";
import SmartImage from "@/components/ui/SmartImage";
import Reveal from "@/components/ui/Reveal";

interface Division {
  label: string;
  heading: string;
  description: string;
  cta: string;
  to: string;
  image: { src: string; alt: string };
}

const divisions: Division[] = [
  {
    label: "Decorator",
    heading: "Decor That Defines the Moment",
    description:
      "Wedding decoration, stage design, floral styling, venue styling and event decor created around your occasion.",
    cta: "Explore Decorators",
    to: "/decorators",
    image: images.decorArch,
  },
  {
    label: "Banquet & Catering",
    heading: "Your Celebration, Our Space",
    description:
      "A thoughtfully equipped venue for weddings, celebrations, gatherings and special occasions, supported by catering and event services.",
    cta: "Explore Banquet & Catering",
    to: "/banquet-catering",
    image: images.diningFine,
  },
];

/**
 * The two-business entry section — one editorial split, two doors into the
 * Bandhan ecosystem. Full-height imagery, quiet overlays, restrained type.
 */
export default function BusinessSplit() {
  return (
    <section aria-labelledby="business-entry" className="grid lg:grid-cols-2">
      <h2 id="business-entry" className="sr-only">
        Two ways to celebrate with Bandhan Events
      </h2>
      {divisions.map((division, i) => (
        <Reveal key={division.to} delay={i * 0.12} as="article" className="group relative min-h-[70vh] overflow-hidden lg:min-h-[82vh]">
          {/* Background image with slow hover zoom */}
          <SmartImage
            image={division.image}
            className="absolute inset-0"
            imgClassName="scale-100 transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
            sizes="(min-width: 1024px) 50vw, 100vw"
          />
          {/* Quiet forest overlay for legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-forest-dark/85 via-forest-dark/45 to-forest-dark/20" aria-hidden="true" />

          <div className="relative flex h-full min-h-[70vh] flex-col justify-end p-7 sm:p-10 lg:min-h-[82vh] lg:p-14">
            <p className="eyebrow-light">{division.label}</p>
            <h3 className="mt-4 max-w-md font-serif text-3xl font-medium leading-tight text-ivory sm:text-4xl lg:text-[2.75rem]">
              {division.heading}
            </h3>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-ivory/75 sm:text-[15px]">
              {division.description}
            </p>
            <div className="mt-8">
              <Link
                to={division.to}
                className="inline-flex items-center gap-3 border border-ivory/40 px-6 py-3 font-sans text-[11px] font-semibold uppercase tracking-widest2 text-ivory transition-all duration-300 hover:border-gold-soft hover:bg-gold-soft hover:text-forest"
              >
                {division.cta}
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </Reveal>
      ))}
    </section>
  );
}
