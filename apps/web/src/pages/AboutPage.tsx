import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Seo from "@/components/Seo";
import PageHero from "@/components/sections/PageHero";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import SmartImage from "@/components/ui/SmartImage";
import CTASection from "@/components/sections/CTASection";
import { images } from "@/data/images";

export default function AboutPage() {
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "About", path: "/about" },
  ];

  return (
    <>
      <Seo route="/about" breadcrumbs={crumbs} />

      <PageHero
        eyebrow="Know Bandhan"
        title="A New Home for Timeless Celebrations"
        lede="Bandhan Events is building a new destination for celebrations in Mumbai — combining event decoration, venue experiences and hospitality."
        image={images.decorSetting}
        breadcrumbs={crumbs}
      />

      {/* Story */}
      <section className="container-site py-20 sm:py-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <SectionHeading eyebrow="Our Story" title="Built on Experience, Made for Mumbai" />
            <Reveal delay={0.1}>
              <div className="mt-8 max-w-2xl space-y-5 text-[15px] leading-relaxed text-charcoal-muted sm:text-base">
                <p>
                  Bandhan Events is a new name in Mumbai's celebration industry —
                  but the hands behind it are not. The brand is backed by decades
                  of experience in the event-decoration industry, designing and
                  delivering weddings, receptions and social gatherings across the
                  city.
                </p>
                <p>
                  We bring that experience to one address in Mulund West: a
                  banquet and events destination where decoration, venue and
                  hospitality are planned together, not pieced together.
                </p>
                <p>
                  Our promise is simple — celebrate the rituals that matter,
                  host your people well, and let the details carry the meaning.
                </p>
              </div>
            </Reveal>
          </div>
          <div className="lg:col-span-5">
            <Reveal delay={0.15}>
              <SmartImage image={images.decorFloral} className="aspect-[4/5]" sizes="(min-width: 1024px) 40vw, 100vw" />
            </Reveal>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-ivory-soft bg-grain">
        <div className="container-site py-20 sm:py-28">
          <SectionHeading
            eyebrow="What We Stand For"
            title="Quiet Principles, Consistent Craft"
            align="center"
          />
          <div className="mt-14 grid gap-px border border-forest/10 bg-forest/10 sm:grid-cols-3">
            {[
              {
                title: "Experience You Can Ask About",
                copy: "Decades of decoration work across Mumbai stands behind every new event we plan.",
              },
              {
                title: "One Team, Both Crafts",
                copy: "Decor and venue under one roof means one conversation, one plan and one accountable team.",
              },
              {
                title: "Honest Hospitality",
                copy: "Vegetarian catering, a clean venue and clear answers — what we promise is what we deliver.",
              },
            ].map((v, i) => (
              <Reveal key={v.title} delay={i * 0.08} className="bg-ivory-soft">
                <div className="p-8 sm:p-10">
                  <span className="font-serif text-lg italic text-gold-deep/80">0{i + 1}</span>
                  <h3 className="mt-4 font-serif text-2xl font-medium text-forest">{v.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-charcoal-muted">{v.copy}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Two divisions */}
      <section className="container-site py-20 sm:py-28">
        <SectionHeading
          eyebrow="The Ecosystem"
          title="Two Divisions, One Celebration"
          lede="Most celebrations need both a beautiful setting and a smooth venue. Bandhan Events offers each — together or on their own."
        />
        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          {[
            {
              to: "/decorators",
              label: "Decorator Division",
              title: "Decor That Defines the Moment",
              copy: "Wedding decoration, stage design, floral styling, venue styling and lighting, created around your occasion.",
              image: images.decorArch,
            },
            {
              to: "/banquet-catering",
              label: "Banquet & Catering",
              title: "Your Celebration, Our Space",
              copy: "A vegetarian banquet venue in Mulund West with catering for weddings, gatherings and prayer meetings.",
              image: images.banquetHall,
            },
          ].map((d, i) => (
            <Reveal key={d.to} delay={i * 0.1}>
              <Link to={d.to} className="group block">
                <SmartImage
                  image={d.image}
                  className="aspect-[16/10]"
                  imgClassName="transition duration-700 group-hover:scale-[1.04]"
                  sizes="(min-width: 1024px) 50vw, 100vw"
                />
                <p className="eyebrow mt-6">{d.label}</p>
                <h3 className="mt-2 font-serif text-3xl font-medium text-forest">{d.title}</h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-charcoal-muted">{d.copy}</p>
                <span className="mt-4 inline-flex items-center gap-2 font-sans text-[11px] font-semibold uppercase tracking-widest2 text-forest">
                  Explore
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <CTASection
        title="Come, Know Us Better"
        lede="Visit the venue, meet the team, or simply start a conversation about your celebration."
        whatsappMessage="visit"
        whatsappLabel="Book a Visit"
      />
    </>
  );
}
