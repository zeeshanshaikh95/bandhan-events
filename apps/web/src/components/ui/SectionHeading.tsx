import Reveal from "@/components/ui/Reveal";
import { cn } from "@/utils/cn";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  lede?: string;
  align?: "left" | "center";
  tone?: "dark" | "light";
  className?: string;
  as?: "h1" | "h2";
}

/**
 * Editorial section heading: gold eyebrow + serif title + optional lede.
 * The single place that defines typographic rhythm for section openers.
 */
export default function SectionHeading({
  eyebrow,
  title,
  lede,
  align = "left",
  tone = "dark",
  className,
  as = "h2",
}: SectionHeadingProps) {
  const Heading = as;
  const centered = align === "center";

  return (
    <Reveal className={cn(centered && "text-center", className)}>
      {eyebrow && (
        <p className={cn(tone === "dark" ? "eyebrow" : "eyebrow-light")}>{eyebrow}</p>
      )}
      <Heading
        className={cn(
          "mt-3 font-serif text-4xl leading-[1.08] font-medium tracking-tight sm:text-5xl",
          tone === "dark" ? "text-forest" : "text-ivory"
        )}
      >
        {title}
      </Heading>
      {(lede || centered) && (
        <>
          <span
            aria-hidden="true"
            className={cn("mt-6 block h-px w-12 bg-gold/60", centered && "mx-auto")}
          />
          {lede && (
            <p
              className={cn(
                "mt-6 max-w-2xl text-[15px] leading-relaxed sm:text-base",
                tone === "dark" ? "text-charcoal-muted" : "text-ivory/75",
                centered && "mx-auto"
              )}
            >
              {lede}
            </p>
          )}
        </>
      )}
    </Reveal>
  );
}
