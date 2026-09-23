import logo from "@/assets/logo-clear.png";
import { cn } from "@/utils/cn";

interface LogoProps {
  /** "dark" = full-colour logo for light backgrounds; "light" = ivory-tinted for dark/transparent. */
  variant?: "dark" | "light";
  className?: string;
}

/**
 * Approved Bandhan Events logo (background keyed out — see
 * scripts/make-logo-transparent.mjs). Aspect ratio preserved; on dark or
 * transparent-over-photo backgrounds an ivory-tinted filter keeps it legible
 * without turning the old opaque cream square into a white box.
 */
export default function Logo({ variant = "dark", className }: LogoProps) {
  return (
    <img
      src={logo}
      alt="Bandhan Events"
      width={96}
      height={96}
      className={cn(
        "object-contain",
        variant === "light" && "brightness-0 invert opacity-95",
        className
      )}
    />
  );
}
