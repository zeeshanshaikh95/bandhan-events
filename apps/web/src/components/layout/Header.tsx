import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { navLinks } from "@/config/site";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import { cn } from "@/utils/cn";
import MobileMenu from "@/components/layout/MobileMenu";
import Logo from "@/components/ui/Logo";

/**
 * Sticky premium header:
 * - transparent over the hero on the homepage
 * - solid ivory with hairline shadow once scrolled
 */
export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollY = useScrollPosition();
  const location = useLocation();

  const isHome = location.pathname === "/";
  const solid = !isHome || scrollY > 24;

  // Close the mobile menu on route change.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:bg-forest focus:px-4 focus:py-2 focus:text-ivory"
      >
        Skip to content
      </a>

      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-500",
          solid
            ? "border-b border-forest/10 bg-ivory/95 shadow-header backdrop-blur-sm"
            : "border-b border-transparent bg-transparent"
        )}
      >
        <div className="container-site flex h-16 items-center justify-between sm:h-20">
          <Link
            to="/"
            aria-label="Bandhan Events — home"
            className="shrink-0"
          >
            <Logo variant={solid ? "dark" : "light"} className="h-10 w-auto sm:h-12" />
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-7 xl:gap-9">
              {navLinks.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    className={({ isActive }) =>
                      cn(
                        "link-underline font-sans text-[12px] font-semibold uppercase tracking-widest2 transition-colors",
                        solid
                          ? "text-forest/80 hover:text-forest"
                          : "text-ivory/85 hover:text-ivory",
                        isActive && (solid ? "!text-forest" : "!text-ivory")
                      )
                    }
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/contact"
              className={cn(
                "btn hidden px-5 py-2.5 sm:inline-flex",
                solid ? "bg-forest text-ivory hover:bg-forest-mid" : "btn-gold"
              )}
            >
              Enquire Now
            </Link>

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              className={cn(
                "p-2 lg:hidden",
                solid ? "text-forest" : "text-ivory"
              )}
            >
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
