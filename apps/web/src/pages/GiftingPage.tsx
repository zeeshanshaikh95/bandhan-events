import { Check } from "lucide-react";
import Seo from "@/components/Seo";
import PageHero from "@/components/sections/PageHero";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import SmartImage from "@/components/ui/SmartImage";
import CTASection from "@/components/sections/CTASection";
import WhatsAppButton from "@/components/ui/WhatsAppButton";
import { giftingIntro, giftCollections, giftingGallery } from "@/data/giftingData";
import { images } from "@/data/images";

export default function GiftingPage() {
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Gifting", path: "/gifting" },
  ];

  return (
    <>
      <Seo route="/gifting" breadcrumbs={crumbs} />

      <PageHero
        eyebrow={giftingIntro.eyebrow}
        title={giftingIntro.heading}
        lede={giftingIntro.description}
        image={images.giftWrap}
        breadcrumbs={crumbs}
      />

      {/* Collections */}
      <section aria-label="Gift collections" className="container-site py-20 sm:py-28">
        <SectionHeading
          eyebrow="Gift Collections"
          title="Curated for the Occasion"
          lede="Three collections, one philosophy — gifts that feel personal, assembled with the same care we bring to celebrations."
        />

        <div className="mt-16 space-y-20 sm:space-y-24">
          {giftCollections.map((collection, i) => (
            <Reveal key={collection.id} as="article">
              <div
                className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-16 ${
                  i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div>
                  <span aria-hidden="true" className="block h-px w-12 bg-gold/60" />
                  <h3 className="mt-5 font-serif text-3xl font-medium text-forest sm:text-4xl">
                    {collection.title}
                  </h3>
                  <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-charcoal-muted">
                    {collection.description}
                  </p>
                  <ul className="mt-6 space-y-2.5">
                    {collection.points.map((point) => (
                      <li key={point} className="flex items-center gap-3 text-sm text-charcoal-muted">
                        <Check className="h-4 w-4 shrink-0 text-gold-deep" aria-hidden="true" />
                        {point}
                      </li>
                    ))}
                  </ul>
                  <WhatsAppButton
                    message="gifting"
                    label="Enquire on WhatsApp"
                    variant="outline"
                    className="mt-8"
                  />
                </div>
                <SmartImage
                  image={collection.image}
                  className="aspect-[4/3] lg:aspect-[5/4]"
                  sizes="(min-width: 1024px) 50vw, 100vw"
                />
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Gallery */}
      <section aria-label="Gifting gallery" className="bg-ivory-soft bg-grain">
        <div className="container-site py-20 sm:py-28">
          <SectionHeading
            eyebrow="The Look"
            title="Wrapping, Ribbon & Detail"
            lede="A preview of the finishing we're known for. The full catalogue is being curated — check back soon."
          />
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {giftingGallery.map((image, i) => (
              <Reveal key={image.src + i} delay={i * 0.05}>
                <SmartImage
                  image={image}
                  className={i % 4 === 0 ? "aspect-[3/4]" : "aspect-square"}
                  sizes="(min-width: 640px) 33vw, 50vw"
                />
              </Reveal>
            ))}
          </div>
          {/* TODO: Replace with real gifting catalogue items and photography. No pricing shown until confirmed. */}
        </div>
      </section>

      <CTASection
        eyebrow="Gifting Enquiries"
        title="Tell Us Who You're Gifting"
        lede="Share the occasion, the count and your budget range — we'll curate options and share them with you personally."
        whatsappMessage="gifting"
        whatsappLabel="WhatsApp the Gifting Desk"
      />
    </>
  );
}
