import logo from "@/assets/logo.png";
import { cn } from "@/utils/cn";

interface LogoProps {
  /** "dark" = full-colour logo for light backgrounds; "light" = ivory-tinted for dark/transparent. */
  variant?: "dark" | "light";
  className?: string;
}

/**
 * Approved Bandhan Events logo. Aspect ratio preserved; on dark or
 * transparent-over-photo backgrounds an ivory-tinted filter keeps it legible.
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
