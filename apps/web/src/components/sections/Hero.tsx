import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { images } from "@/data/images";
import SmartImage from "@/components/ui/SmartImage";

/**
 * Full-viewport hero. Motion is intentionally restrained: one slow image
 * scale on load (skipped for reduced-motion users), a quiet text reveal.
 */
export default function Hero() {
  const reduced = useReducedMotion();

  return (
    <section className="relative flex min-h-[92svh] items-end overflow-hidden bg-forest" aria-label="Welcome to Bandhan Events">
      {/* Background photograph with slow scale */}
      <motion.div
        className="absolute inset-0"
        initial={reduced ? false : { scale: 1.08 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <SmartImage
          image={images.hero}
          priority
          className="h-full w-full"
          sizes="100vw"
        />
        {/* Legibility overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-forest-dark/85 via-forest-dark/40 to-forest-dark/30" aria-hidden="true" />
      </motion.div>

      <div className="container-site relative pb-20 pt-40 sm:pb-24">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl"
        >
          <p className="eyebrow-light">Bandhan Events · Mumbai</p>

          <h1 className="mt-5 font-serif text-5xl font-medium leading-[1.04] tracking-tight text-ivory sm:text-6xl lg:text-7xl">
            Celebrations,
            <br />
            Crafted With&nbsp;Meaning.
          </h1>

          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-ivory/80 sm:text-base">
            From beautifully designed weddings and celebrations to memorable
            gatherings and banquet experiences, Bandhan Events brings people,
            spaces and moments together.
          </p>

          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <Link
              to="#services"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("services")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
              }}
              className="btn btn-gold"
            >
              Explore Our Services
            </Link>
            <Link to="/contact" className="btn btn-outline-light">
              Plan Your Event
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Gold base rule — signature detail */}
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gold/40" />
    </section>
  );
}
