import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { SiteImage } from "@/data/images";
import SmartImage from "@/components/ui/SmartImage";
import { cn } from "@/utils/cn";

interface ImageCarouselProps {
  images: SiteImage[];
  /** Accessibility label describing the carousel. */
  label: string;
  /** Aspect ratio class for slides, e.g. "aspect-[4/5]". */
  aspectClass?: string;
  /** Show partial next slide on desktop (peek). */
  peek?: boolean;
  className?: string;
}

/**
 * Lightweight, accessible carousel:
 * - horizontal scroll-snap (native touch swipe on mobile)
 * - keyboard operable buttons
 * - optional desktop "peek" of the next slide
 */
export default function ImageCarousel({
  images,
  label,
  aspectClass = "aspect-[4/3]",
  peek = true,
  className,
}: ImageCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows]);

  // Kept in step with the slide width classes below so the browser never
  // over-fetches a variant it will not display.
  const slideSizes = peek
    ? "(min-width: 1024px) 38vw, (min-width: 640px) 46vw, 78vw"
    : "(min-width: 1024px) 42vw, (min-width: 640px) 52vw, 86vw";

  const scrollBySlides = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const slide = el.querySelector<HTMLElement>("[data-slide]");
    const w = slide ? slide.offsetWidth + 24 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * w, behavior: "smooth" });
  };

  return (
    <div className={cn("relative", className)} role="region" aria-roledescription="carousel" aria-label={label}>
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((image, i) => (
          <div
            key={`${image.src}-${i}`}
            data-slide
            className={cn(
              "relative shrink-0 snap-start",
              aspectClass,
              peek ? "w-[78%] sm:w-[46%] lg:w-[38%]" : "w-[86%] sm:w-[52%] lg:w-[42%]"
            )}
          >
            <SmartImage image={image} className="h-full w-full" sizes={slideSizes} />
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="mt-5 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => scrollBySlides(-1)}
          disabled={!canPrev}
          aria-label="Previous slide"
          className="border border-forest/20 p-2.5 text-forest transition hover:border-forest disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => scrollBySlides(1)}
          disabled={!canNext}
          aria-label="Next slide"
          className="border border-forest/20 p-2.5 text-forest transition hover:border-forest disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
