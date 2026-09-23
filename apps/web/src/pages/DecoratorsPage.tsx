import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import Seo from "@/components/Seo";
import PageHero from "@/components/sections/PageHero";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import SmartImage from "@/components/ui/SmartImage";
import ImageCarousel from "@/components/ui/ImageCarousel";
import EventsShowcase from "@/components/sections/EventsShowcase";
import CTASection from "@/components/sections/CTASection";
import WhatsAppButton from "@/components/ui/WhatsAppButton";
import {
  decoratorIntro,
  decoratorServices,
  decoratorTransformation,
  decoratorGallery,
} from "@/data/decoratorData";
import { images } from "@/data/images";

export default function DecoratorsPage() {
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Decorators", path: "/decorators" },
  ];

  return (
    <>
      <Seo route="/decorators" breadcrumbs={crumbs} />

      <PageHero
        eyebrow={decoratorIntro.eyebrow}
        title={decoratorIntro.heading}
        lede={decoratorIntro.description}
        image={images.decorStage}
        breadcrumbs={crumbs}
      />

      {/* Services — editorial numbered rows */}
      <section aria-label="Decoration services" className="container-site py-20 sm:py-28">
        <SectionHeading
          eyebrow="What We Create"
          title="Decoration Services"
          lede="Every service below is delivered end to end — design, fabrication, styling and on-day setup."
        />

        <div className="mt-16 space-y-20 sm:space-y-24">
          {decoratorServices.map((service, i) => (
            <Reveal key={service.id} as="article">
              <div
                className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-16 ${
                  i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div>
                  <div className="flex items-baseline gap-4">
                    <span className="font-serif text-lg italic text-gold-deep/80">{service.index}</span>
                    <span aria-hidden="true" className="h-px flex-1 bg-forest/10" />
                  </div>
                  <h3 className="mt-5 font-serif text-3xl font-medium text-forest sm:text-4xl">
                    {service.title}
                  </h3>
                  <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-charcoal-muted">
                    {service.description}
                  </p>
                  <ul className="mt-6 space-y-2.5">
                    {service.points.map((point) => (
                      <li key={point} className="flex items-center gap-3 text-sm text-charcoal-muted">
                        <Check className="h-4 w-4 shrink-0 text-gold-deep" aria-hidden="true" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
                <SmartImage
                  image={service.image}
                  className="aspect-[4/3] lg:aspect-[5/4]"
                  sizes="(min-width: 1024px) 50vw, 100vw"
                />
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Transformation / before-after */}
      <section aria-label="Event transformation" className="bg-forest text-ivory">
        <div className="container-site py-20 sm:py-28">
          <SectionHeading
            eyebrow={decoratorTransformation.eyebrow}
            title={decoratorTransformation.heading}
            lede={decoratorTransformation.description}
            tone="light"
            align="center"
          />
          <div className="mt-14 grid items-stretch gap-6 sm:grid-cols-2">
            {[
              { img: decoratorTransformation.before, tag: "Before" },
              { img: decoratorTransformation.after, tag: "After" },
            ].map((panel, i) => (
              <Reveal key={panel.tag} delay={i * 0.12} className="relative">
                <SmartImage image={panel.img} className="aspect-[4/3] w-full" sizes="(min-width: 640px) 50vw, 100vw" />
                <span className="absolute left-4 top-4 bg-forest-dark/70 px-4 py-2 font-sans text-[10px] font-semibold uppercase tracking-widest2 text-gold-soft">
                  {panel.tag}
                </span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Build your own stage — interactive entry */}
      <section aria-label="Build your own stage" className="bg-ivory-soft bg-grain">
        <div className="container-site grid items-center gap-8 py-16 sm:py-20 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="eyebrow">Interactive</p>
            <h2 className="mt-3 font-serif text-4xl leading-[1.08] font-medium tracking-tight text-forest sm:text-5xl">
              Build Your Own Stage
            </h2>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-charcoal-muted">
              Choose the layout, backdrop, flowers, lighting, seating and décor — see it come
              together in a live preview, then send the whole configuration to our decorators for
              a quotation.
            </p>
            <Reveal delay={0.1} className="mt-8">
              <Link to="/build-your-stage" className="btn btn-solid">
                Start Building
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Reveal>
          </div>
          <Reveal delay={0.15}>
            <Link to="/build-your-stage" aria-label="Open the stage builder">
              <SmartImage
                image={images.decorStage}
                className="aspect-[4/3] w-full"
                sizes="(min-width: 1024px) 50vw, 100vw"
              />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Real work gallery carousel */}
      <section aria-label="Recent decoration work" className="container-site py-20 sm:py-28">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <SectionHeading
            eyebrow="Real Work"
            title="Recent Decorations"
            lede="Scroll through a selection of stages, florals and styled spaces."
            className="max-w-xl"
          />
          <Reveal delay={0.1}>
            <Link to="/gallery" className="btn btn-outline">
              Full Gallery
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </Reveal>
        </div>
        <div className="mt-12">
          <ImageCarousel
            images={decoratorGallery}
            label="Decorator work gallery"
            aspectClass="aspect-[4/3] sm:aspect-[16/10]"
          />
        </div>
      </section>

      {/* Events we decorate */}
      <section className="bg-ivory-soft bg-grain">
        <div className="container-site py-20 sm:py-28">
          <EventsShowcase
            eyebrow="Occasions We Style"
            title="Decor for Every Occasion"
            division="decorator"
            layout="grid"
          />
          <Reveal delay={0.1} className="mt-14 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <WhatsAppButton message="decorator" label="Enquire on WhatsApp" className="w-full sm:w-auto" />
            <Link to="/contact" className="btn btn-outline w-full sm:w-auto">
              Send an Enquiry
            </Link>
          </Reveal>
        </div>
      </section>

      <CTASection
        eyebrow="Plan Your Decor"
        title="Tell Us What You're Celebrating"
        lede="Share your date, venue and occasion — our decorators will respond with ideas and a plan."
        whatsappMessage="decorator"
        whatsappLabel="WhatsApp the Decor Team"
      />
    </>
  );
}
