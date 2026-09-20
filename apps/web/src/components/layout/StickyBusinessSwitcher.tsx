import { NavLink, useLocation } from "react-router-dom";
import { Flower2, UtensilsCrossed } from "lucide-react";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import { showsBusinessSwitcher } from "@/config/site";
import { cn } from "@/utils/cn";

const divisions = [
  { to: "/decorators", label: "Decorators", Icon: Flower2 },
  { to: "/banquet-catering", label: "Banquet & Catering", Icon: UtensilsCrossed },
] as const;

/**
 * Owner-requested fixed bottom selector: jump straight into either division
 * from anywhere on the site.
 *
 * - appears once the visitor has scrolled past the hero (never blocks the
 *   first impression)
 * - stays available on both division pages and marks the current one, so it
 *   behaves like a product selector rather than a promo popup
 * - hidden on /contact where the form needs the full viewport
 * - reserves its own height in normal flow (the spacer below) so it never
 *   covers the footer's last line once the visitor reaches the bottom
 * - honours the mobile safe area on notched devices
 */
export default function StickyBusinessSwitcher() {
  const { pathname } = useLocation();
  const scrollY = useScrollPosition();

  if (!showsBusinessSwitcher(pathname)) return null;

  return (
    <>
      {/*
       * Reserved space at the end of the page. Rendered unconditionally on
       * switcher routes (even before the bar fades in) so the page never
       * shifts when it appears. Matches the footer's forest background.
       */}
      <div aria-hidden="true" className="h-[72px] bg-forest sm:h-[84px]" />

      {scrollY > 480 && (
        <nav
          aria-label="Explore our two services"
          className="fixed inset-x-0 bottom-0 z-40 pb-safe"
        >
          <div className="container-site pb-3 sm:pb-4">
            <div className="mx-auto flex max-w-md items-stretch divide-x divide-ivory/15 overflow-hidden rounded-full border border-gold/40 bg-forest/95 shadow-card backdrop-blur">
              {divisions.map(({ to, label, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      "flex flex-1 items-center justify-center gap-2 px-3 py-3 text-ivory transition hover:bg-forest-mid sm:px-5",
                      isActive && "bg-forest-mid"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={cn("h-4 w-4", isActive ? "text-gold" : "text-gold-soft")}
                        aria-hidden="true"
                      />
                      <span className="font-sans text-[10px] font-semibold uppercase tracking-widest2 sm:text-[11px]">
                        {label}
                      </span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        </nav>
      )}
    </>
  );
}
