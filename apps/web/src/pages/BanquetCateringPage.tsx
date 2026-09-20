import { Link } from "react-router-dom";
import { ArrowRight, Check, Flower2, UtensilsCrossed } from "lucide-react";
import Seo from "@/components/Seo";
import PageHero from "@/components/sections/PageHero";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import SmartImage from "@/components/ui/SmartImage";
import ImageCarousel from "@/components/ui/ImageCarousel";
import EventsShowcase from "@/components/sections/EventsShowcase";
import LocationSection from "@/components/sections/LocationSection";
import CTASection from "@/components/sections/CTASection";
import WhatsAppButton from "@/components/ui/WhatsAppButton";
import {
  venueIntro,
  venueFacilities,
  venueGallery,
  cateringImages,
} from "@/data/venueData";
import { images } from "@/data/images";

export default function BanquetCateringPage() {
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Banquet & Catering", path: "/banquet-catering" },
  ];

  return (
    <>
      <Seo route="/banquet-catering" breadcrumbs={crumbs} />

      <PageHero
        eyebrow="Banquet & Catering"
        title="Your Celebration, Our Space"
        lede={venueIntro.description}
        image={images.banquetHall}
        breadcrumbs={crumbs}
      />

      {/* Venue introduction */}
      <section className="container-site py-20 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <SectionHeading
              eyebrow="The Venue"
              title="A Family Banquet in Mulund West"
              lede="63/1 Guru Gobind Singh Marg, Mulund Colony — an address Mumbai families know for gatherings that matter."
            />
            <Reveal delay={0.1}>
              <div className="mt-8 max-w-2xl space-y-5 text-[15px] leading-relaxed text-charcoal-muted sm:text-base">
                <p>
                  Weddings, engagements, social celebrations, corporate events
                  and prarthana sabha — the venue hosts them all, with catering
                  and event support handled by the same team that styles them.
                </p>
                {/* TODO: Add confirmed capacity details when supplied by the owners. */}
                <p>
                  Share your date and guest count and we'll confirm availability
                  and the right hall configuration for your occasion.
                </p>
              </div>
            </Reveal>
          </div>
          <div className="lg:col-span-5">
            <Reveal delay={0.15}>
              <SmartImage image={cateringImages.secondary} className="aspect-[4/5]" sizes="(min-width: 1024px) 40vw, 100vw" />
            </Reveal>
          </div>
        </div>
      </section>

      {/* Why choose */}
      <section className="bg-forest text-ivory">
        <div className="container-site py-20 sm:py-28">
          <SectionHeading
            eyebrow="Why Choose the Venue"
            title="Everything Under One Roof"
            lede="Decor by our own decorators, catering by our own kitchen — one team accountable for your evening."
            tone="light"
            align="center"
          />
          <div className="mt-14 grid gap-px border border-ivory/15 bg-ivory/15 sm:grid-cols-3">
            {[
              {
                icon: Flower2,
                title: "Decor In-House",
                copy: "The same decorators who style weddings across Mumbai work right here — no vendor coordination on your side.",
              },
              {
                icon: UtensilsCrossed,
                title: "Pure Vegetarian Catering",
                copy: "A fully vegetarian kitchen for every occasion, planned with the families we host.",
              },
              {
                icon: Check,
                title: "One Accountable Team",
                copy: "From the first site visit to the last farewell, one team plans, sets up and serves.",
              },
            ].map(({ icon: Icon, title, copy }, i) => (
              <Reveal key={title} delay={i * 0.08} className="bg-forest">
                <div className="p-8 sm:p-10">
                  <Icon className="h-6 w-6 text-gold-soft" aria-hidden="true" />
                  <h3 className="mt-5 font-serif text-2xl font-medium">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ivory/70">{copy}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Facilities */}
      <section aria-label="Venue facilities and policies" className="bg-cream">
        <div className="container-site py-20 sm:py-28">
          <SectionHeading
            eyebrow="Facilities & Policies"
            title="Know Before You Book"
            lede="Clear policies, stated plainly — so there are no surprises for your guests."
          />
          <div className="mt-14 grid gap-px border border-forest/10 bg-forest/10 sm:grid-cols-2 lg:grid-cols-4">
            {venueFacilities.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.06} className="bg-cream">
                <div className="p-8">
                  <Check className="h-5 w-5 text-gold-deep" aria-hidden="true" />
                  <h3 className="mt-4 font-serif text-xl font-medium text-forest">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-charcoal-muted">{f.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Events we host */}
      <section className="container-site py-20 sm:py-28">
        <EventsShowcase
          eyebrow="Events We Host"
          title="Made for Every Gathering"
          division="banquet"
        />
      </section>

      {/* Gallery carousel */}
      <section aria-label="Venue gallery" className="bg-ivory-soft bg-grain">
        <div className="container-site py-20 sm:py-28">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <SectionHeading
              eyebrow="The Space"
              title="Inside the Venue"
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
              images={venueGallery}
              label="Banquet venue gallery"
              aspectClass="aspect-[4/3] sm:aspect-[16/10]"
            />
          </div>
        </div>
      </section>

      {/* Catering */}
      <section aria-labelledby="catering" className="container-site py-20 sm:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <SmartImage image={cateringImages.primary} className="aspect-[4/5] lg:aspect-[4/4.6]" sizes="(min-width: 1024px) 50vw, 100vw" />
          </Reveal>
          <div>
            <SectionHeading
              eyebrow="Catering"
              title="Pure Vegetarian, Prepared Fresh"
              lede="Our catering team plans menus with each family — traditional preparations, live counters where appropriate, and service your guests will remember."
            />
            <Reveal delay={0.1}>
              {/* TODO: Add real menu details when finalised by the owners. No invented menus or pricing. */}
              <p className="mt-6 text-sm italic leading-relaxed text-charcoal-muted/80">
                Sample menus and pricing are shared personally on enquiry —
                every celebration is quoted to its own occasion.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <WhatsAppButton message="banquet" label="Ask About Catering" className="w-full sm:w-auto" />
                <Link to="/contact" className="btn btn-outline w-full sm:w-auto">
                  Send an Enquiry
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Location */}
      <section className="bg-cream">
        <div className="container-site py-20 sm:py-28">
          <LocationSection
            eyebrow="Location"
            title="Finding Us in Mulund West"
            lede="On Guru Gobind Singh Marg in Mulund Colony — convenient from Mulund, Bhandup, Thane and the central suburbs."
          />
        </div>
      </section>

      <CTASection
        eyebrow="Reserve Your Date"
        title="Check Availability for Your Occasion"
        lede="Dates fill quickly through the season. Send an enquiry or WhatsApp us to check your preferred date."
        whatsappMessage="banquet"
        whatsappLabel="WhatsApp the Venue Team"
      />
    </>
  );
}
