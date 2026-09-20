import { motion, useReducedMotion } from "framer-motion";
import { images, type SiteImage } from "@/data/images";
import SmartImage from "@/components/ui/SmartImage";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

interface PageHeroProps {
  eyebrow: string;
  title: string;
  lede?: string;
  image?: SiteImage;
  breadcrumbs?: { name: string; path: string }[];
}

/** Interior page hero — shorter than the home hero, same editorial language. */
export default function PageHero({
  eyebrow,
  title,
  lede,
  image = images.hero,
  breadcrumbs,
}: PageHeroProps) {
  const reduced = useReducedMotion();

  return (
    <section className="relative flex min-h-[52svh] items-end overflow-hidden bg-forest pt-24">
      <motion.div
        className="absolute inset-0"
        initial={reduced ? false : { scale: 1.06 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
      >
        <SmartImage image={image} priority className="h-full w-full" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-dark/85 via-forest-dark/45 to-forest-dark/35" aria-hidden="true" />
      </motion.div>

      <div className="container-site relative pb-14">
        {breadcrumbs && <Breadcrumbs trail={breadcrumbs} className="mb-5" />}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="eyebrow-light">{eyebrow}</p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl font-medium leading-[1.06] text-ivory sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          {lede && (
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-ivory/80 sm:text-base">
              {lede}
            </p>
          )}
        </motion.div>
      </div>
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gold/40" />
    </section>
  );
}
