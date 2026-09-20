import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  galleryCategories,
  galleryItems,
  type GalleryCategory,
} from "@/data/galleryData";
import SmartImage from "@/components/ui/SmartImage";
import { imageSrcSet } from "@/utils/imageSrcSet";
import { cn } from "@/utils/cn";

interface GalleryGridProps {
  /** Limit the number of items shown (no filter row when limited). */
  limit?: number;
  /** Hide the category filter (used for previews). */
  showFilter?: boolean;
}

/**
 * Premium masonry-style gallery with category filter and an accessible
 * lightbox: Escape/arrow keys, focus moved into the dialog on open and
 * returned to the thumbnail it came from on close, Tab focus kept inside.
 */
export default function GalleryGrid({ limit, showFilter = true }: GalleryGridProps) {
  const [category, setCategory] = useState<GalleryCategory>("All");
  const [lightbox, setLightbox] = useState<number | null>(null);
  const reduced = useReducedMotion();

  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = lightbox !== null;

  const items = useMemo(() => {
    const filtered =
      category === "All"
        ? galleryItems
        : galleryItems.filter((item) => item.category === category);
    return limit ? filtered.slice(0, limit) : filtered;
  }, [category, limit]);

  const close = useCallback(() => setLightbox(null), []);
  const step = useCallback(
    (dir: 1 | -1) =>
      setLightbox((cur) => (cur === null ? cur : (cur + dir + items.length) % items.length)),
    [items.length]
  );

  // Keyboard controls + scroll lock while the lightbox is open.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close, step]);

  // Move focus into the dialog on open, hand it back to the trigger on close.
  useEffect(() => {
    if (!open) return;
    const trigger = lightbox === null ? null : thumbRefs.current[lightbox];
    closeRef.current?.focus();
    return () => trigger?.focus();
    // Intentionally keyed on the open/close transition only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /** Keeps Tab / Shift+Tab cycling through the dialog's controls. */
  const trapFocus = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !dialogRef.current) return;
    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled])")
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div>
      {showFilter && (
        <div role="tablist" aria-label="Gallery categories" className="flex flex-wrap gap-x-6 gap-y-3">
          {galleryCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={category === cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "font-sans text-[11px] font-semibold uppercase tracking-widest2 transition-colors",
                category === cat ? "text-forest" : "text-charcoal-muted/60 hover:text-charcoal-muted"
              )}
            >
              <span className={cn("block border-t-2 pt-2", category === cat ? "border-gold" : "border-transparent")}>
                {cat}
              </span>
            </button>
          ))}
        </div>
      )}

      <div
        aria-hidden={open || undefined}
        className="mt-8 columns-2 gap-4 sm:columns-3 [column-fill:_balance]"
      >
        {items.map((item, i) => (
          <button
            key={`${item.src}-${i}`}
            ref={(node) => { thumbRefs.current[i] = node; }}
            type="button"
            onClick={() => setLightbox(i)}
            aria-label={`View larger: ${item.alt}`}
            className="group mb-4 block w-full break-inside-avoid text-left"
          >
            <SmartImage
              image={item}
              className="w-full"
              imgClassName={cn(
                // Varied editorial heights for the masonry rhythm
                i % 5 === 0 ? "aspect-[3/4]" : i % 3 === 0 ? "aspect-square" : "aspect-[4/3]",
                "transition duration-700 group-hover:scale-[1.03]"
              )}
              sizes="(min-width: 768px) 33vw, 50vw"
            />
            {item.caption && (
              <span className="mt-2 block font-serif text-sm italic text-charcoal-muted/80">
                {item.caption}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {open && items[lightbox] && (
          <motion.div
            ref={dialogRef}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-forest-dark/95 p-4 sm:p-10"
            initial={{ opacity: reduced ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: reduced ? 1 : 0 }}
            role="dialog"
            aria-modal="true"
            aria-label={items[lightbox].alt}
            onClick={close}
            onKeyDown={trapFocus}
          >
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              aria-label="Close gallery viewer"
              className="absolute right-4 top-4 z-10 p-2 text-ivory transition hover:text-gold-soft"
            >
              <X className="h-7 w-7" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); step(-1); }}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 border border-ivory/25 p-3 text-ivory transition hover:border-gold-soft hover:text-gold-soft sm:left-6"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); step(1); }}
              aria-label="Next image"
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 border border-ivory/25 p-3 text-ivory transition hover:border-gold-soft hover:text-gold-soft sm:right-6"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>

            <motion.figure
              key={items[lightbox].src + String(lightbox)}
              className="max-h-full max-w-4xl"
              initial={reduced ? false : { opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={items[lightbox].src}
                srcSet={imageSrcSet(items[lightbox])}
                sizes="(min-width: 1280px) 1024px, 100vw"
                alt={items[lightbox].alt}
                className="max-h-[80vh] w-auto max-w-full object-contain"
              />
              {items[lightbox].caption && (
                <figcaption className="mt-4 text-center font-serif text-lg italic text-ivory/85">
                  {items[lightbox].caption}
                </figcaption>
              )}
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
