import Seo from "@/components/Seo";
import PageHero from "@/components/sections/PageHero";
import GalleryGrid from "@/components/sections/GalleryGrid";
import CTASection from "@/components/sections/CTASection";
import { images } from "@/data/images";

export default function GalleryPage() {
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Gallery", path: "/gallery" },
  ];

  return (
    <>
      <Seo route="/gallery" breadcrumbs={crumbs} />

      <PageHero
        eyebrow="Gallery"
        title="Our Work, Up Close"
        lede="Decor, weddings, banquet evenings, celebrations and corporate gatherings — photographed across our events."
        image={images.decorTable}
        breadcrumbs={crumbs}
      />

      <section className="container-site py-16 sm:py-24">
        <GalleryGrid />
      </section>

      <CTASection
        eyebrow="Your Occasion Here"
        title="Imagine Your Celebration in This Gallery"
        lede="Every frame above started with one conversation. Start yours."
        whatsappMessage="general"
        whatsappLabel="WhatsApp Us"
      />
    </>
  );
}
