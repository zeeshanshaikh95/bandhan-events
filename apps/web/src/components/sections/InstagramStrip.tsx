import { Instagram } from "lucide-react";
import { useBusinessSettings } from "@/providers/SettingsProvider";
import { images } from "@/data/images";
import SmartImage from "@/components/ui/SmartImage";
import Reveal from "@/components/ui/Reveal";

/**
 * Lightweight "Follow Our Work" strip — links out to Instagram instead of
 * embedding a heavy feed. The profile comes from business settings.
 */
export default function InstagramStrip() {
  const { contact } = useBusinessSettings();
  const strip = [images.decorStage, images.celebrationDance, images.decorFloral, images.diningFine, images.decorArch];

  return (
    <section aria-labelledby="follow-work" className="container-site py-20 sm:py-24">
      <Reveal className="flex flex-col items-center text-center">
        <p className="eyebrow">Follow Our Work</p>
        <h2 id="follow-work" className="mt-3 font-serif text-3xl font-medium text-forest sm:text-4xl">
          Behind the Scenes, Between Celebrations
        </h2>
        <a
          href={contact.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="link-underline mt-5 inline-flex items-center gap-2 font-sans text-[12px] font-semibold uppercase tracking-widest2 text-gold-deep"
        >
          <Instagram className="h-4 w-4" aria-hidden="true" />
          {contact.instagramHandle} on Instagram
        </a>
      </Reveal>

      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
        {strip.map((image, i) => (
          <Reveal key={image.src + i} delay={i * 0.05}>
            <a
              href={contact.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View our work on Instagram (opens in new tab)"
              className="group block"
            >
              <SmartImage
                image={image}
                className="aspect-square"
                imgClassName="transition duration-700 group-hover:scale-[1.05]"
                sizes="(min-width: 640px) 20vw, 50vw"
              />
            </a>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
