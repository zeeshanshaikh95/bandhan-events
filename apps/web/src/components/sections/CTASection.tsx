import { Link } from "react-router-dom";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import WhatsAppButton from "@/components/ui/WhatsAppButton";
import { cn } from "@/utils/cn";

interface CTASectionProps {
  eyebrow?: string;
  title: string;
  lede?: string;
  /** Primary CTA — internal link. */
  primaryTo?: string;
  primaryLabel?: string;
  /** WhatsApp message key for the secondary CTA. */
  whatsappMessage?: "general" | "decorator" | "banquet" | "gifting" | "visit";
  whatsappLabel?: string;
  tone?: "dark" | "paper";
  className?: string;
}

/**
 * Full-width closing CTA band used at the foot of pages.
 * Dark forest version for weight, "paper" version for light pages.
 */
export default function CTASection({
  eyebrow = "Begin Your Celebration",
  title,
  lede,
  primaryTo = "/contact",
  primaryLabel = "Enquire Now",
  whatsappMessage = "general",
  whatsappLabel = "WhatsApp Us",
  tone = "dark",
  className,
}: CTASectionProps) {
  const dark = tone === "dark";

  return (
    <section className={cn(dark ? "bg-forest text-ivory" : "bg-cream", className)}>
      <div className={cn("container-site py-20 text-center sm:py-28", dark && "bg-grain-light")}>
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          lede={lede}
          align="center"
          tone={dark ? "light" : "dark"}
        />
        <Reveal delay={0.15} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to={primaryTo}
            className={dark ? "btn btn-gold w-full sm:w-auto" : "btn btn-solid w-full sm:w-auto"}
          >
            {primaryLabel}
          </Link>
          <WhatsAppButton
            message={whatsappMessage}
            label={whatsappLabel}
            variant={dark ? "outline-light" : "outline"}
            className="w-full sm:w-auto"
          />
        </Reveal>
      </div>
    </section>
  );
}
