import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import StickyBusinessSwitcher from "@/components/layout/StickyBusinessSwitcher";
import ScrollToTop from "@/components/layout/ScrollToTop";
import RouteFallback from "@/components/ui/RouteFallback";

/**
 * The public website shell, unchanged from the original single-page build —
 * extracted into a layout route so the admin dashboard can own a completely
 * separate chrome (no marketing header, no bottom business switcher) while
 * sharing the same router and providers.
 */
export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Header />
      <main id="main-content" className="flex-1">
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <StickyBusinessSwitcher />
    </div>
  );
}
