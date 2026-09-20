import { MessageCircle } from "lucide-react";
import { useWhatsApp, whatsappMessages } from "@/providers/SettingsProvider";
import { cn } from "@/utils/cn";

interface WhatsAppButtonProps {
  /** Preset message key or a raw custom message. */
  message?: keyof typeof whatsappMessages | (string & {});
  label?: string;
  variant?: "solid" | "outline" | "outline-light";
  className?: string;
}

/**
 * Reusable WhatsApp enquiry CTA. The number comes from business settings in
 * the database — never hardcoded in a page.
 *
 * When no number is configured the action renders as a disabled control rather
 * than a link to a placeholder number.
 */
export default function WhatsAppButton({
  message = "general",
  label = "WhatsApp Us",
  variant = "solid",
  className,
}: WhatsAppButtonProps) {
  const whatsapp = useWhatsApp();
  const msg = whatsappMessages[message as keyof typeof whatsappMessages] ?? message;
  const href = whatsapp(msg);

  const styles =
    variant === "solid"
      ? "bg-forest text-ivory hover:bg-forest-mid"
      : variant === "outline"
        ? "border border-forest/30 text-forest hover:bg-forest hover:text-ivory"
        : "border border-ivory/40 text-ivory hover:bg-ivory hover:text-forest";

  if (!href) {
    return (
      <span
        className={cn("btn cursor-not-allowed opacity-60", styles, className)}
        aria-disabled="true"
        title="WhatsApp number coming soon"
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        {label}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} (opens WhatsApp)`}
      className={cn("btn", styles, className)}
    >
      <MessageCircle className="h-4 w-4" aria-hidden="true" />
      {label}
    </a>
  );
}
