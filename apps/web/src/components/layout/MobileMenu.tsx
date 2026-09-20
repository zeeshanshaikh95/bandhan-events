import { useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { navLinks } from "@/config/site";
import { useWhatsApp, whatsappMessages } from "@/providers/SettingsProvider";
import Logo from "@/components/ui/Logo";
import { cn } from "@/utils/cn";

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

/** Full-height slide-in navigation for mobile. */
export default function MobileMenu({ open, onClose }: MobileMenuProps) {
  const reduced = useReducedMotion();
  const whatsapp = useWhatsApp();
  const whatsappHref = whatsapp(whatsappMessages.general);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-forest-dark/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.nav
            aria-label="Mobile"
            className="fixed inset-y-0 right-0 z-[65] flex w-[86%] max-w-sm flex-col bg-forest text-ivory"
            initial={reduced ? false : { x: "100%" }}
            animate={{ x: 0 }}
            exit={reduced ? undefined : { x: "100%" }}
            transition={{ type: "tween", duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between border-b border-ivory/10 px-6 py-4">
              <Logo variant="light" className="h-11 w-auto" />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="p-2 text-ivory"
              >
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>

            <ul className="flex-1 overflow-y-auto px-6 py-6">
              {navLinks.map((link) => (
                <li key={link.to} className="border-b border-ivory/10 last:border-0">
                  <NavLink
                    to={link.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        "block py-4 font-serif text-2xl tracking-wide",
                        isActive ? "text-gold-soft" : "text-ivory"
                      )
                    }
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>

            <div className="space-y-3 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
              <Link
                to="/contact"
                onClick={onClose}
                className="btn btn-gold w-full"
              >
                Enquire Now
              </Link>
              {/* Hidden rather than pointing at a placeholder number. */}
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="btn w-full border border-ivory/40 text-ivory"
                >
                  WhatsApp Us
                </a>
              )}
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  );
}
