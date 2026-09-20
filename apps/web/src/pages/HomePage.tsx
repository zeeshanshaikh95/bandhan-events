import { Link } from "react-router-dom";
import { ArrowRight, Flower2, UtensilsCrossed, Gift } from "lucide-react";
import Seo from "@/components/Seo";
import Hero from "@/components/sections/Hero";
import BusinessSplit from "@/components/sections/BusinessSplit";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import SmartImage from "@/components/ui/SmartImage";
import ImageCarousel from "@/components/ui/ImageCarousel";
import EventsShowcase from "@/components/sections/EventsShowcase";
import GalleryGrid from "@/components/sections/GalleryGrid";
import LocationSection from "@/components/sections/LocationSection";
import CTASection from "@/components/sections/CTASection";
import InstagramStrip from "@/components/sections/InstagramStrip";
import { aboutCopy } from "@/config/seo";
import { decoratorGallery } from "@/data/decoratorData";
import { venueGallery, venueFacilities } from "@/data/venueData";
import { giftCollections } from "@/data/giftingData";
import { images } from "@/data/images";
import { Check } from "lucide-react";

export default function HomePage() {
  return (
    <>
      <Seo route="/" />

      {/* 2 · Hero */}
      <Hero />

      {/* 3 · Two business entry */}
      <section id="services" aria-label="Our two divisions">
        <BusinessSplit />
      </section>

      {/* 4 · About / Know Bandhan */}
      <section aria-labelledby="know-bandhan" className="bg-ivory-soft bg-grain">
        <div className="container-site grid gap-12 py-20 sm:py-28 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <Reveal>
              <p className="eyebrow">{aboutCopy.eyebrow}</p>
              <h2 id="know-bandhan" className="mt-3 font-serif text-4xl font-medium leading-[1.08] text-forest sm:text-5xl">
                {aboutCopy.heading}
              </h2>
              <span aria-hidden="true" className="mt-6 block h-px w-12 bg-gold/60" />
            </Reveal>
            <Reveal delay={0.1}>
              {aboutCopy.paragraphs.map((p, i) => (
                <p key={i} className="mt-6 max-w-xl text-[15px] leading-relaxed text-charcoal-muted sm:text-base">
                  {p}
                </p>
              ))}
              <Link to="/about" className="btn btn-outline mt-9">
                Know Us More
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Reveal>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:col-span-7">
            <Reveal delay={0.1} className="pt-10">
              <SmartImage image={images.coupleIndian} className="aspect-[3/4]" sizes="(min-width: 1024px) 28vw, 45vw" />
            </Reveal>
            <Reveal delay={0.2}>
              <SmartImage image={images.decorStage} className="aspect-[3/4]" sizes="(min-width: 1024px) 28vw, 45vw" />
            </Reveal>
          </div>
        </div>
      </section>

      {/* 5 · What We Do */}
      <section aria-labelledby="what-we-do" className="container-site py-20 sm:py-28">
        <SectionHeading
          eyebrow="What We Do"
          title="Two Crafts. One Standard."
          lede="Decoration that defines the moment, and a venue that hosts it — planned and delivered by the same team."
          align="center"
        />
        <div className="mt-14 grid gap-px border border-forest/10 bg-forest/10 sm:grid-cols-3">
          {[
            {
              icon: Flower2,
              title: "Decorator",
              copy: "Wedding decor, stage design, floral styling, venue styling, lighting and mandap setup.",
              to: "/decorators",
              cta: "Explore Decorators",
            },
            {
              icon: UtensilsCrossed,
              title: "Banquet & Catering",
              copy: "A vegetarian banquet in Mulund West with catering for gatherings of every scale.",
              to: "/banquet-catering",
              cta: "View the Venue",
            },
            {
              icon: Gift,
              title: "Gifting",
              copy: "Curated hampers and keepsakes for weddings, corporates and special occasions.",
              to: "/gifting",
              cta: "Discover Gifting",
            },
          ].map(({ icon: Icon, title, copy, to, cta }, i) => (
            <Reveal key={to} delay={i * 0.08} className="bg-ivory-soft">
              <Link to={to} className="group flex h-full flex-col p-8 transition-colors hover:bg-cream sm:p-10">
                <Icon className="h-6 w-6 text-gold-deep" aria-hidden="true" />
                <h3 className="mt-5 font-serif text-2xl font-medium text-forest">{title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-charcoal-muted">{copy}</p>
                <span className="mt-6 inline-flex items-center gap-2 font-sans text-[11px] font-semibold uppercase tracking-widest2 text-forest">
                  {cta}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 6 · Featured decorator work */}
      <section aria-labelledby="featured-work" className="bg-forest text-ivory">
        <div className="container-site py-20 sm:py-28">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <SectionHeading
              eyebrow="Decorator Division"
              title="Featured Work"
              lede="A glimpse of the stages, florals and settings our decor team creates."
              tone="light"
              className="max-w-xl"
            />
            <Reveal delay={0.1}>
              <Link to="/decorators" className="btn btn-outline-light">
                All Decor Work
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Reveal>
          </div>
          <div className="mt-12">
            <ImageCarousel
              images={decoratorGallery.slice(0, 6)}
              label="Featured decorator work"
              aspectClass="aspect-[4/3] sm:aspect-[16/10]"
            />
          </div>
        </div>
      </section>

      {/* 7 · Banquet venue preview */}
      <section aria-labelledby="venue-preview" className="bg-cream">
        <div className="container-site grid items-center gap-12 py-20 sm:py-28 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 lg:order-1">
            <SectionHeading
              eyebrow="Banquet & Catering"
              title="The Venue in Mulund West"
              lede="A thoughtfully equipped space for weddings, engagements, social celebrations, corporate events and prarthana sabha — with vegetarian catering and the comfort of a bride & groom room."
            />
            <Reveal delay={0.1}>
              <ul className="mt-8 space-y-3">
                {venueFacilities.map((f) => (
                  <li key={f.title} className="flex items-start gap-3 text-sm text-charcoal-muted">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep" aria-hidden="true" />
                    <span><strong className="font-semibold text-forest">{f.title}.</strong> {f.description}</span>
                  </li>
                ))}
              </ul>
              <Link to="/banquet-catering" className="btn btn-solid mt-10">
                View the Venue
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Reveal>
          </div>
          <Reveal className="order-1 lg:order-2">
            <div className="grid grid-cols-2 gap-4">
              <SmartImage image={venueGallery[0]} className="aspect-[4/5]" sizes="(min-width: 1024px) 30vw, 50vw" />
              <div className="mt-10 grid gap-4">
                <SmartImage image={venueGallery[1]} className="aspect-[4/5]" sizes="(min-width: 1024px) 30vw, 50vw" />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 8 · Events we host */}
      <section aria-labelledby="events-hosted" className="container-site py-20 sm:py-28">
        <div id="events-hosted">
          <EventsShowcase
            eyebrow="Events We Host"
            title="Gatherings of Every Kind"
            lede="From the biggest wedding week to the quietest prayer meeting — each hosted with the same care."
          />
        </div>
      </section>

      {/* 9 · Facilities strip is embedded in venue preview above (avoids repetition) */}

      {/* 10 · Gallery preview */}
      <section aria-labelledby="gallery-preview" className="bg-ivory-soft bg-grain">
        <div className="container-site py-20 sm:py-28">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <SectionHeading
              eyebrow="Gallery"
              title="Moments From Our Work"
              className="max-w-xl"
            />
            <Reveal delay={0.1}>
              <Link to="/gallery" className="btn btn-outline">
                View Full Gallery
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Reveal>
          </div>
          <div className="mt-12">
            <GalleryGrid limit={6} showFilter={false} />
          </div>
        </div>
      </section>

      {/* 11 · Gifting preview */}
      <section aria-labelledby="gifting-preview" className="container-site py-20 sm:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <SectionHeading
            eyebrow="Gifting"
            title="Gifts That Carry the Occasion"
            lede="Curated hampers and keepsakes for weddings, corporate occasions and every celebration between — a quieter craft from the same hands."
          />
          <div>
            <Reveal delay={0.1}>
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {giftCollections.map((c) => (
                  <SmartImage key={c.id} image={c.image} className="aspect-[3/4]" sizes="30vw" />
                ))}
              </div>
              <Link to="/gifting" className="btn btn-outline mt-8">
                Discover Gifting
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 12 · Location */}
      <section aria-labelledby="home-location" className="bg-cream">
        <div className="container-site py-20 sm:py-28" id="home-location">
          <LocationSection />
        </div>
      </section>

      {/* 13 · Enquiry CTA */}
      <CTASection
        title="Let's Plan Your Celebration"
        lede="Tell us about your occasion — we'll suggest the decor, the space and the menu that fit it best."
        whatsappLabel="WhatsApp Us"
      />

      {/* 18 · Follow our work */}
      <InstagramStrip />
    </>
  );
}
